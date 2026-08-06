/**
 * Frontend View: accessible DOM rendering with no business-state ownership.
 */
export class StarView {
  constructor() {
    this.repoGrid = document.getElementById('repoGrid');
    this.emptyState = document.getElementById('emptyState');
    this.totalReposEl = document.getElementById('totalReposCount');
    this.totalStarsEl = document.getElementById('totalStarsCount');
    this.totalNotesEl = document.getElementById('totalNotesCount');
    this.resultsSummary = document.getElementById('resultsSummary');
    this.dataStatus = document.getElementById('dataStatus');
    this.dataStatusTitle = document.getElementById('dataStatusTitle');
    this.dataStatusDetail = document.getElementById('dataStatusDetail');
    this.languageChips = document.getElementById('languageChips');
    this.topicChips = document.getElementById('topicChips');
    this.languageSelect = document.getElementById('languageSelect');
    this.topicSelect = document.getElementById('topicSelect');
    this.toastContainer = document.getElementById('toastContainer');
    this.noteModal = document.getElementById('noteModal');
    this.noteRepoName = document.getElementById('noteRepoName');
    this.noteTextarea = document.getElementById('noteTextarea');
    this.saveNoteBtn = document.getElementById('saveNoteBtn');
    this.closeNoteModalBtn = document.getElementById('closeNoteModalBtn');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.cardsViewBtn = document.getElementById('cardsViewBtn');
    this.tableViewBtn = document.getElementById('tableViewBtn');
    this.analyticsBtn = document.getElementById('analyticsBtn');
    this.analyticsModal = document.getElementById('analyticsModal');
    this.closeAnalyticsModalBtn = document.getElementById('closeAnalyticsModalBtn');
    this.analyticsModalBody = document.getElementById('analyticsModalBody');
    this.paginationBar = document.getElementById('paginationBar');
    this.pageSizeSelect = document.getElementById('pageSizeSelect');
    this.prevPageBtn = document.getElementById('prevPageBtn');
    this.nextPageBtn = document.getElementById('nextPageBtn');
    this.pageIndicator = document.getElementById('pageIndicator');
    this.previousFocus = null;
  }

  renderStats(stats) {
    this.totalReposEl.textContent = stats.filteredCount.toLocaleString();
    this.totalStarsEl.textContent = stats.totalStars.toLocaleString();
    this.totalNotesEl.textContent = stats.totalNotes.toLocaleString();
    this.resultsSummary.textContent =
      stats.filteredCount === stats.totalRepos
        ? `顯示全部 ${stats.totalRepos} 個專案`
        : `顯示 ${stats.filteredCount}／${stats.totalRepos} 個專案`;
  }

  renderStatus(status) {
    this.dataStatus.dataset.state = status.state;
    this.dataStatusTitle.textContent = status.source;
    const time = this.formatDate(status.generatedAt);
    this.dataStatusDetail.textContent =
      `${status.message}${time ? ` 更新時間：${time}` : ''}`;
  }

  renderFilters(languages, topics, filters) {
    const focusedTopics = topics.filter(({ isOther }) => !isOther);
    const otherTopic = topics.find(({ isOther }) => isOther);
    const quickTopics = [
      ...focusedTopics.slice(0, 17),
      ...(otherTopic ? [otherTopic] : [])
    ];

    this.languageChips.innerHTML = [
      this.chip('lang', 'all', '全部語言', filters.language === 'all'),
      ...languages.map(language =>
        this.chip('lang', language, language, filters.language === language)
      )
    ].join('');

    this.topicChips.innerHTML = [
      this.chip('topic', 'all', '全部 Topic', filters.topic === 'all'),
      ...quickTopics.map(({ topic, count, isOther }) =>
        this.chip(
          'topic',
          topic,
          isOther ? `其他 / other ${count}` : `#${topic} ${count}`,
          filters.topic === topic
        )
      )
    ].join('');

    this.languageSelect.innerHTML = [
      '<option value="all">全部語言</option>',
      ...languages.map(language =>
        `<option value="${this.escapeHtml(language)}">${this.escapeHtml(language)}</option>`
      )
    ].join('');
    this.languageSelect.value = filters.language;

    this.topicSelect.innerHTML = [
      '<option value="all">全部 Topic</option>',
      ...topics.map(({ topic, count, isOther }) =>
        `<option value="${this.escapeHtml(topic)}">` +
        `${isOther ? '其他 / other' : `#${this.escapeHtml(topic)}`}（${count}）</option>`
      )
    ].join('');
    this.topicSelect.value = filters.topic;
  }

  renderViewToggle(viewMode) {
    const cardsActive = viewMode === 'cards';
    this.cardsViewBtn.classList.toggle('active', cardsActive);
    this.cardsViewBtn.setAttribute('aria-pressed', String(cardsActive));
    this.tableViewBtn.classList.toggle('active', !cardsActive);
    this.tableViewBtn.setAttribute('aria-pressed', String(!cardsActive));
  }

  chip(type, value, label, active) {
    const attribute = type === 'lang' ? 'data-lang' : 'data-topic';
    return `<button type="button" class="chip${active ? ' active' : ''}" ` +
      `${attribute}="${this.escapeHtml(value)}" aria-pressed="${active}">` +
      `${this.escapeHtml(label)}</button>`;
  }

  renderRepositories(repositories, notes, favorites, viewMode, paginationInfo) {
    if (!repositories.length) {
      this.repoGrid.replaceChildren();
      this.emptyState.hidden = false;
      this.paginationBar.hidden = true;
      return;
    }
    this.emptyState.hidden = true;
    if (viewMode === 'table') {
      this.renderRepoTable(repositories, notes, favorites);
    } else {
      this.renderRepoCards(repositories, notes, favorites);
    }
    this.renderPagination(paginationInfo);
  }

  renderPagination(info) {
    if (!info || info.totalCount <= 0 || info.pageSize === 'all') {
      this.paginationBar.hidden = true;
      return;
    }
    this.paginationBar.hidden = false;
    this.pageSizeSelect.value = String(info.pageSize);
    this.pageIndicator.textContent = `第 ${info.currentPage} / ${info.totalPages} 頁 (共 ${info.totalCount} 筆)`;
    this.prevPageBtn.disabled = info.currentPage <= 1;
    this.nextPageBtn.disabled = info.currentPage >= info.totalPages;
  }

  renderRepoCards(repositories, notes, favorites = {}) {
    this.repoGrid.className = 'repo-grid';
    this.repoGrid.innerHTML = repositories.map(repo => {
      const fullName = this.escapeHtml(repo.fullName);
      const note = notes[repo.fullName] || '';
      const isFav = Boolean(favorites[repo.fullName]);
      const favStar = isFav ? '⭐' : '✩';
      const topics = repo.topics.slice(0, 5).map(topic =>
        `<span class="topic-tag">#${this.escapeHtml(topic)}</span>`
      ).join('');
      const archived = repo.isArchived
        ? '<span class="archive-badge">Archived</span>'
        : '';
      return `
        <article class="repo-card${repo.isArchived ? ' is-archived' : ''}${isFav ? ' is-favorite' : ''}">
          <div>
            <div class="repo-header">
              <h2 class="repo-title">
                <a href="${this.safeUrl(repo.url)}" target="_blank" rel="noopener noreferrer">
                  ${fullName}
                </a>
              </h2>
              <div class="repo-actions">
                <button type="button" class="btn btn-icon-only toggle-fav-btn${isFav ? ' active' : ''}"
                  aria-label="${isFav ? '取消最愛' : '標註為最愛'} ${fullName}"
                  title="${isFav ? '取消最愛' : '標註為最愛'}"
                  data-full-name="${fullName}">${favStar}</button>
                <button type="button" class="btn btn-icon-only edit-note-btn"
                  aria-label="編輯 ${fullName} 的研究筆記"
                  data-full-name="${fullName}">✏️</button>
              </div>
            </div>
            ${archived}
            <p class="repo-description">${this.escapeHtml(repo.description || '未提供專案描述。')}</p>
            ${note ? `<div class="repo-note-box">📝 ${this.escapeHtml(note)}</div>` : ''}
            <div class="repo-tags">${topics}</div>
          </div>
          <footer class="repo-footer">
            <div class="meta-item">
              <span class="lang-indicator" style="--language-color:${this.languageColor(repo.language)}"></span>
              <span>${this.escapeHtml(repo.language || 'Others')}</span>
            </div>
            <div class="meta-stats" aria-label="專案統計">
              <span title="GitHub Stars">⭐ ${repo.stars.toLocaleString()}</span>
              <span title="Forks">⑂ ${repo.forks.toLocaleString()}</span>
            </div>
          </footer>
        </article>`;
    }).join('');
  }

  renderRepoTable(repositories, notes, favorites = {}) {
    this.repoGrid.className = 'table-shell';
    const rows = repositories.map(repo => {
      const fullName = this.escapeHtml(repo.fullName);
      const note = notes[repo.fullName] || '';
      const isFav = Boolean(favorites[repo.fullName]);
      const favStar = isFav ? '⭐' : '✩';
      const status = repo.isArchived ? 'Archived' : '使用中';
      return `
        <tr class="${repo.isArchived ? 'is-archived' : ''}${isFav ? ' is-favorite' : ''}">
          <th scope="row" class="repo-cell">
            <a href="${this.safeUrl(repo.url)}" target="_blank"
               rel="noopener noreferrer">${fullName}</a>
            <span>${this.escapeHtml(repo.description || '未提供專案描述。')}</span>
            ${note ? `<small>📝 ${this.escapeHtml(note)}</small>` : ''}
          </th>
          <td>
            <span class="language-cell">
              <span class="lang-indicator"
                    style="--language-color:${this.languageColor(repo.language)}"></span>
              ${this.escapeHtml(repo.language || 'Others')}
            </span>
          </td>
          <td class="numeric-cell">${repo.stars.toLocaleString()}</td>
          <td class="numeric-cell">${repo.forks.toLocaleString()}</td>
          <td><time datetime="${this.escapeHtml(repo.starredAt)}">${this.formatShortDate(repo.starredAt)}</time></td>
          <td><span class="status-badge ${repo.isArchived ? 'archived' : ''}">${status}</span></td>
          <td class="action-cell">
            <button type="button" class="btn btn-icon-only toggle-fav-btn${isFav ? ' active' : ''}"
              aria-label="${isFav ? '取消最愛' : '標註為最愛'} ${fullName}"
              title="${isFav ? '取消最愛' : '標註為最愛'}"
              data-full-name="${fullName}">${favStar}</button>
            <button type="button" class="btn btn-icon-only edit-note-btn"
              aria-label="編輯 ${fullName} 的研究筆記"
              data-full-name="${fullName}">✏️</button>
          </td>
        </tr>`;
    }).join('');
    this.repoGrid.innerHTML = `
      <table class="repo-table">
        <caption class="sr-only">目前篩選的 GitHub Star 專案</caption>
        <thead>
          <tr>
            <th scope="col">Repository</th>
            <th scope="col">語言</th>
            <th scope="col" class="numeric-cell">Stars</th>
            <th scope="col" class="numeric-cell">Forks</th>
            <th scope="col">收藏日期</th>
            <th scope="col">狀態</th>
            <th scope="col"><span class="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  openNoteModal(fullName, currentNote, trigger) {
    this.previousFocus = trigger || document.activeElement;
    this.noteRepoName.textContent = fullName;
    this.noteTextarea.value = currentNote;
    this.noteModal.classList.add('active');
    this.noteModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => this.noteTextarea.focus());
  }

  closeNoteModal() {
    this.noteModal.classList.remove('active');
    this.noteModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    this.previousFocus?.focus();
  }

  openAnalyticsModal(analytics, trigger) {
    this.previousFocus = trigger || document.activeElement;
    this.renderAnalyticsContent(analytics);
    this.analyticsModal.classList.add('active');
    this.analyticsModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => this.closeAnalyticsModalBtn.focus());
  }

  closeAnalyticsModal() {
    this.analyticsModal.classList.remove('active');
    this.analyticsModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    this.previousFocus?.focus();
  }

  renderAnalyticsContent(analytics) {
    if (!analytics) {
      this.analyticsModalBody.innerHTML = '<p>尚無可分析的資料。</p>';
      return;
    }

    const langRows = analytics.languages.slice(0, 10).map(item => `
      <div class="analytics-row">
        <div class="analytics-row-label">
          <span class="lang-indicator" style="--language-color:${this.languageColor(item.language)}"></span>
          <strong>${this.escapeHtml(item.language)}</strong>
          <span>${item.count} 筆 (${item.percentage}%)</span>
        </div>
        <div class="analytics-bar-track">
          <div class="analytics-bar-fill" style="width: ${item.percentage}%; background-color: ${this.languageColor(item.language)}"></div>
        </div>
      </div>
    `).join('');

    const topicItems = analytics.topTopics.map(item => `
      <span class="chip">#${this.escapeHtml(item.topic)} <strong>${item.count}</strong></span>
    `).join('');

    const yearlyItems = analytics.yearlyTrend.map(item => `
      <div class="analytics-stat-pill">
        <span class="pill-year">${this.escapeHtml(item.year)}</span>
        <strong class="pill-count">${item.count} 筆</strong>
      </div>
    `).join('');

    this.analyticsModalBody.innerHTML = `
      <div class="analytics-summary-grid">
        <div class="analytics-card">
          <span class="stat-icon">📦</span>
          <div class="stat-info">
            <strong>${analytics.totalRepos.toLocaleString()}</strong>
            <span>總 Stars 專案數</span>
          </div>
        </div>
        <div class="analytics-card">
          <span class="stat-icon">⭐</span>
          <div class="stat-info">
            <strong>${analytics.totalStars.toLocaleString()}</strong>
            <span>專案累計 Stars (均 ${analytics.avgStars.toLocaleString()})</span>
          </div>
        </div>
        <div class="analytics-card">
          <span class="stat-icon">📝</span>
          <div class="stat-info">
            <strong>${analytics.notesCount.toLocaleString()}</strong>
            <span>研讀筆記紀錄</span>
          </div>
        </div>
        <div class="analytics-card">
          <span class="stat-icon">🌟</span>
          <div class="stat-info">
            <strong>${analytics.favoritesCount.toLocaleString()}</strong>
            <span>最愛標註數量</span>
          </div>
        </div>
      </div>

      <div class="analytics-section">
        <h3>主要程式語言分佈 Top 10</h3>
        <div class="analytics-bars-container">${langRows}</div>
      </div>

      <div class="analytics-section">
        <h3>熱門 Topic 覆蓋 Top 15</h3>
        <div class="chips-container">${topicItems}</div>
      </div>

      <div class="analytics-section">
        <h3>年度 Star 收藏趨勢</h3>
        <div class="analytics-years-grid">${yearlyItems}</div>
      </div>
    `;
  }

  applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const switchingTo = theme === 'light' ? '深色' : '亮色';
    this.themeToggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    this.themeToggleBtn.setAttribute('aria-label', `切換為${switchingTo}主題`);
    this.themeToggleBtn.title = `切換為${switchingTo}主題`;
  }

  setRefreshBusy(isBusy) {
    const button = document.getElementById('refreshDataBtn');
    button.disabled = isBusy;
    button.textContent = isBusy ? '同步中…' : '↻ 重新同步';
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'warning' ? 'alert' : 'status');
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3400);
  }

  formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('zh-TW', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Taipei'
    }).format(date);
  }

  formatShortDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Taipei'
    }).format(date);
  }

  safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.toString() : '#';
    } catch {
      return '#';
    }
  }

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  languageColor(language) {
    const colors = {
      Python: '#3572a5', JavaScript: '#b08800', TypeScript: '#3178c6',
      'C++': '#f34b7d', C: '#555555', Java: '#b07219', Go: '#007d9c',
      Rust: '#a64b00', Vue: '#278a5b', HTML: '#c7431d', CSS: '#563d7c'
    };
    return colors[language] || '#4f46e5';
  }
}
