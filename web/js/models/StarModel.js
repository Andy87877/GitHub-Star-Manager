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
    this.favorites = this.readJsonStorage('gsm_repo_favorites', {});
    this.viewMode = this.readViewMode();
    this.pageSize = this.readPageSize();
    this.currentPage = 1;
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
        formattedUpdatedAt: metadata.formattedUpdatedAt || '',
        formattedDelta: metadata.formattedDelta || '0',
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
    const owner = repo.owner?.login || repo.owner || '';
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
      createdAt: repo.created_at || repo.createdAt || '',
      starredAt: starredAt || repo.starredAt || repo.starred_at || '',
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
      if (this.filters.archive === 'favorites' && !this.isFavorite(repo.fullName)) return false;
      if (this.filters.archive === 'notes' && !this.getNote(repo.fullName)) return false;

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
    this.currentPage = 1;
  }

  getPaginatedRepositories() {
    if (this.pageSize === 'all') return this.filteredRepositories;
    const size = Number(this.pageSize) || 20;
    const start = (this.currentPage - 1) * size;
    return this.filteredRepositories.slice(start, start + size);
  }

  getTotalPages() {
    if (this.pageSize === 'all' || !this.filteredRepositories.length) return 1;
    const size = Number(this.pageSize) || 20;
    return Math.ceil(this.filteredRepositories.length / size);
  }

  setPage(page) {
    const maxPage = this.getTotalPages();
    this.currentPage = Math.max(1, Math.min(page, maxPage));
  }

  setPageSize(size) {
    this.pageSize = size;
    localStorage.setItem('gsm_page_size', String(size));
    this.currentPage = 1;
  }

  readPageSize() {
    const stored = localStorage.getItem('gsm_page_size');
    return ['20', '50', '100', 'all'].includes(stored) ? stored : '20';
  }

  isFavorite(fullName) {
    return Boolean(this.favorites[fullName]);
  }

  toggleFavorite(fullName) {
    if (this.favorites[fullName]) {
      delete this.favorites[fullName];
    } else {
      this.favorites[fullName] = true;
    }
    this.writeJsonStorage('gsm_repo_favorites', this.favorites);
    this.applyFilters();
    return this.isFavorite(fullName);
  }

  sortRepositories() {
    const comparators = {
      'stars-desc': (a, b) => b.stars - a.stars,
      'stars-asc': (a, b) => a.stars - b.stars,
      'name-asc': (a, b) => a.fullName.localeCompare(b.fullName),
      'updated-desc': (a, b) => this.timestamp(b.updatedAt) - this.timestamp(a.updatedAt),
      'created-desc': (a, b) => this.timestamp(b.createdAt) - this.timestamp(a.createdAt),
      'created-asc': (a, b) => this.timestamp(a.createdAt) - this.timestamp(b.createdAt),
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
      totalNotes: Object.keys(this.notes).length,
      totalFavorites: Object.keys(this.favorites).length
    };
  }

  calculateAnalytics() {
    const total = this.repositories.length;
    if (!total) return null;

    const totalStars = this.repositories.reduce((sum, r) => sum + r.stars, 0);
    const totalForks = this.repositories.reduce((sum, r) => sum + r.forks, 0);
    const archivedCount = this.repositories.filter(r => r.isArchived).length;
    const activeCount = total - archivedCount;

    // Languages breakdown
    const langMap = new Map();
    this.repositories.forEach(r => {
      const lang = r.language || 'Others';
      langMap.set(lang, (langMap.get(lang) || 0) + 1);
    });
    const languages = Array.from(langMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([lang, count]) => ({
        language: lang,
        count,
        percentage: Number(((count / total) * 100).toFixed(1))
      }));

    // Top Topics
    const topicMap = new Map();
    this.repositories.forEach(r => {
      r.topics.forEach(t => topicMap.set(t, (topicMap.get(t) || 0) + 1));
    });
    const topTopics = Array.from(topicMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 15)
      .map(([topic, count]) => ({ topic, count }));

    // Starred Year Distribution
    const yearMap = new Map();
    this.repositories.forEach(r => {
      const year = r.starredAt ? new Date(r.starredAt).getFullYear() : 'Unknown';
      const key = Number.isNaN(year) ? 'Unknown' : String(year);
      yearMap.set(key, (yearMap.get(key) || 0) + 1);
    });
    const yearlyTrend = Array.from(yearMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));

    // Created Year Distribution
    const createdYearMap = new Map();
    this.repositories.forEach(r => {
      const year = r.createdAt ? new Date(r.createdAt).getFullYear() : 'Unknown';
      const key = Number.isNaN(year) ? 'Unknown' : String(year);
      createdYearMap.set(key, (createdYearMap.get(key) || 0) + 1);
    });
    const createdYearlyTrend = Array.from(createdYearMap.entries())
      .filter(([year]) => year !== 'Unknown')
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));

    return {
      totalRepos: total,
      totalStars,
      totalForks,
      avgStars: Math.round(totalStars / total),
      archivedCount,
      activeCount,
      notesCount: Object.keys(this.notes).length,
      favoritesCount: Object.keys(this.favorites).length,
      languages,
      topTopics,
      yearlyTrend,
      createdYearlyTrend
    };
  }

  exportToCSV() {
    const csvSafe = value => {
      let text = String(value ?? '');
      if (/^[\t\r ]*[=+\-@]/.test(text)) {
        text = `'${text}`;
      }
      return `"${text.replaceAll('"', '""')}"`;
    };
    const rows = this.filteredRepositories.map(repo => [
      repo.fullName,
      repo.url,
      repo.language,
      repo.topics.join(' '),
      repo.stars,
      repo.forks,
      repo.createdAt,
      repo.starredAt,
      repo.updatedAt,
      repo.description,
      this.getNote(repo.fullName)
    ].map(csvSafe).join(','));
    return [
      'Repository,URL,Language,Topics,Stars,Forks,Created At,Starred At,Updated At,Description,Notes',
      ...rows
    ].join('\r\n');
  }
}
