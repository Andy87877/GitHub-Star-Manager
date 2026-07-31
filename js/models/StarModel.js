/**
 * Frontend Model: owns data retrieval, normalization, filters, notes and theme.
 */
export class StarModel {
  constructor({ username = 'Andy87877', fetchImpl = window.fetch.bind(window) } = {}) {
    this.username = username;
    this.fetchImpl = fetchImpl;
    this.repositories = [];
    this.filteredRepositories = [];
    this.languages = [];
    this.topics = [];
    this.focusedTopicNames = new Set();
    this.topicPolicy = {
      minimumRepositoryCount: 2,
      maximumTopics: 30,
      otherTopic: 'other'
    };
    this.notes = this.readJsonStorage('gsm_repo_notes', {});
    this.viewMode = this.readViewMode();
    this.dataStatus = {
      state: 'loading',
      source: '資料載入中',
      message: '正在讀取版本庫快照…',
      generatedAt: '',
      repositoryCount: 0
    };
    this.filters = {
      keyword: '',
      language: 'all',
      topic: 'all',
      archive: 'active',
      sortBy: 'starred-desc'
    };
  }

  async loadCachedDataset(
    datasetUrl = './data/stars.json',
    metadataUrl = './data/sync-meta.json'
  ) {
    try {
      const [datasetResponse, metadataResponse] = await Promise.all([
        this.fetchImpl(datasetUrl, { cache: 'no-store' }),
        this.fetchImpl(metadataUrl, { cache: 'no-store' })
      ]);
      if (!datasetResponse.ok || !metadataResponse.ok) {
        throw new Error('版本庫快照不存在或無法讀取。');
      }
      const [dataset, metadata] = await Promise.all([
        datasetResponse.json(),
        metadataResponse.json()
      ]);
      this.replaceRepositories(dataset);
      this.dataStatus = {
        state: 'cached',
        source: '版本庫快照',
        message: '目前顯示最近一次成功同步的資料，正在連線 GitHub…',
        generatedAt: metadata.generatedAt || '',
        repositoryCount: this.repositories.length
      };
      return true;
    } catch (error) {
      this.replaceRepositories([]);
      this.dataStatus = {
        state: 'warning',
        source: '尚無快照',
        message: error.message || '無法讀取版本庫快照。',
        generatedAt: '',
        repositoryCount: 0
      };
      return false;
    }
  }

  async refreshFromGitHub() {
    const repositories = [];
    const headers = {
      Accept: 'application/vnd.github.star+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    const perPage = 100;

    for (let page = 1; page <= 20; page += 1) {
      const url = new URL(
        `https://api.github.com/users/${encodeURIComponent(this.username)}/starred`
      );
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));

      const response = await this.fetchImpl(url.toString(), { headers });
      if (!response.ok) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const suffix = remaining === '0' ? '（GitHub API 額度已用完）' : '';
        throw new Error(`GitHub 即時資料回應 ${response.status}${suffix}`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error('GitHub 即時資料格式不正確。');
      }
      if (payload.length === 0) break;

      payload.forEach(entry => {
        const repo = entry.repo || entry;
        repositories.push(this.normalizeRepository(repo, entry.starred_at || ''));
      });
      if (payload.length < perPage) break;
    }

    if (!repositories.length) {
      throw new Error('GitHub 回傳 0 筆資料；已保留既有快照。');
    }
    this.replaceRepositories(repositories);
    this.dataStatus = {
      state: 'live',
      source: 'GitHub 即時資料',
      message: '已直接向 GitHub 公開 API 取得目前的 Stars。',
      generatedAt: new Date().toISOString(),
      repositoryCount: repositories.length
    };
    return repositories.length;
  }

  markLiveRefreshFailed(error) {
    const hasCache = this.repositories.length > 0;
    this.dataStatus = {
      ...this.dataStatus,
      state: hasCache ? 'cached' : 'error',
      source: hasCache ? '版本庫快照' : '資料載入失敗',
      message: hasCache
        ? `GitHub 即時連線失敗，已保留快照。${error.message || ''}`
        : `無法取得 GitHub 資料。${error.message || ''}`,
      repositoryCount: this.repositories.length
    };
  }

  normalizeRepository(repo, starredAt = '') {
    const owner = repo.owner?.login || '';
    const name = repo.name || '';
    return {
      name,
      owner,
      fullName: repo.full_name || repo.fullName || `${owner}/${name}`,
      url: repo.html_url || repo.url || '',
      description: repo.description || '',
      language: repo.language || 'Others',
      topics: Array.isArray(repo.topics) ? repo.topics.filter(Boolean) : [],
      stars: Number(repo.stargazers_count ?? repo.stars ?? 0),
      forks: Number(repo.forks_count ?? repo.forks ?? 0),
      isArchived: Boolean(repo.archived ?? repo.isArchived ?? false),
      starredAt: starredAt || repo.starredAt || '',
      updatedAt: repo.updated_at || repo.updatedAt || ''
    };
  }

  replaceRepositories(dataset) {
    if (!Array.isArray(dataset)) {
      throw new TypeError('Stars dataset must be an array.');
    }
    const unique = new Map();
    dataset.forEach(item => {
      const repo = this.normalizeRepository(item, item.starredAt || '');
      if (repo.fullName && repo.url) unique.set(repo.fullName, repo);
    });
    this.repositories = Array.from(unique.values());
    this.extractCategories();
    this.applyFilters();
  }

  extractCategories() {
    const languages = new Set();
    const topicCounts = new Map();
    this.repositories.forEach(repo => {
      languages.add(repo.language || 'Others');
      repo.topics.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });
    this.languages = Array.from(languages).sort((a, b) => a.localeCompare(b));
    const focusedTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .filter(([, count]) => count >= this.topicPolicy.minimumRepositoryCount)
      .slice(0, this.topicPolicy.maximumTopics)
      .map(([topic, count]) => ({ topic, count }));
    this.focusedTopicNames = new Set(focusedTopics.map(({ topic }) => topic));
    const otherCount = this.repositories.filter(
      repo => !repo.topics.some(topic => this.focusedTopicNames.has(topic))
    ).length;
    this.topics = [
      ...focusedTopics,
      {
        topic: this.topicPolicy.otherTopic,
        count: otherCount,
        isOther: true
      }
    ];
  }

  applyFilters() {
    const keyword = this.filters.keyword.trim().toLocaleLowerCase();
    this.filteredRepositories = this.repositories.filter(repo => {
      if (this.filters.language !== 'all' && repo.language !== this.filters.language) {
        return false;
      }
      if (this.filters.topic !== 'all') {
        const isOtherFilter = this.filters.topic === this.topicPolicy.otherTopic;
        const matchesTopic = isOtherFilter
          ? !repo.topics.some(topic => this.focusedTopicNames.has(topic))
          : repo.topics.includes(this.filters.topic);
        if (!matchesTopic) return false;
      }
      if (this.filters.archive === 'active' && repo.isArchived) return false;
      if (this.filters.archive === 'archived' && !repo.isArchived) return false;
      if (!keyword) return true;

      const searchable = [
        repo.name,
        repo.fullName,
        repo.description,
        repo.language,
        ...repo.topics,
        this.getNote(repo.fullName)
      ].join(' ').toLocaleLowerCase();
      return searchable.includes(keyword);
    });
    this.sortRepositories();
  }

  sortRepositories() {
    const comparators = {
      'stars-desc': (a, b) => b.stars - a.stars,
      'stars-asc': (a, b) => a.stars - b.stars,
      'name-asc': (a, b) => a.fullName.localeCompare(b.fullName),
      'updated-desc': (a, b) => this.timestamp(b.updatedAt) - this.timestamp(a.updatedAt),
      'starred-desc': (a, b) => this.timestamp(b.starredAt) - this.timestamp(a.starredAt)
    };
    this.filteredRepositories.sort(
      comparators[this.filters.sortBy] || comparators['starred-desc']
    );
  }

  timestamp(value) {
    const timestamp = Date.parse(value || '');
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  clearFilters() {
    this.filters = {
      keyword: '',
      language: 'all',
      topic: 'all',
      archive: 'active',
      sortBy: 'starred-desc'
    };
    this.applyFilters();
  }

  getNote(fullName) {
    return this.notes[fullName] || '';
  }

  setNote(fullName, noteText) {
    const normalized = noteText.trim();
    if (normalized) this.notes[fullName] = normalized;
    else delete this.notes[fullName];
    this.writeJsonStorage('gsm_repo_notes', this.notes);
    this.applyFilters();
  }

  getTheme() {
    return localStorage.getItem('gsm_theme') === 'dark' ? 'dark' : 'light';
  }

  setTheme(theme) {
    localStorage.setItem('gsm_theme', theme);
  }

  readViewMode() {
    const storedViewMode = localStorage.getItem('gsm_view_mode');
    return ['table', 'cards'].includes(storedViewMode)
      ? storedViewMode
      : 'table';
  }

  setViewMode(mode) {
    if (!['cards', 'table'].includes(mode)) {
      throw new TypeError(`Unsupported view mode: ${mode}`);
    }
    this.viewMode = mode;
    localStorage.setItem('gsm_view_mode', mode);
  }

  readJsonStorage(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  writeJsonStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('瀏覽器儲存空間不可用。', error);
    }
  }

  getRandomRepository() {
    if (!this.filteredRepositories.length) return null;
    return this.filteredRepositories[
      Math.floor(Math.random() * this.filteredRepositories.length)
    ];
  }

  getStatistics() {
    return {
      totalRepos: this.repositories.length,
      filteredCount: this.filteredRepositories.length,
      totalStars: this.repositories.reduce((sum, repo) => sum + repo.stars, 0),
      totalNotes: Object.keys(this.notes).length
    };
  }

  exportToCSV() {
    const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = this.filteredRepositories.map(repo => [
      repo.fullName,
      repo.url,
      repo.language,
      repo.topics.join(' '),
      repo.stars,
      repo.forks,
      repo.starredAt,
      repo.updatedAt,
      repo.description,
      this.getNote(repo.fullName)
    ].map(quote).join(','));
    return [
      'Repository,URL,Language,Topics,Stars,Forks,Starred At,Updated At,Description,Notes',
      ...rows
    ].join('\r\n');
  }
}
