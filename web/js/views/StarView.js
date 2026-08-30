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
    this.shortcutsBtn = document.getElementById('shortcutsBtn');
    this.shortcutsModal = document.getElementById('shortcutsModal');
    this.closeShortcutsModalBtn = document.getElementById('closeShortcutsModalBtn');
    this.activeFiltersBar = document.getElementById('activeFiltersBar');
    this.activeFiltersContainer = document.getElementById('activeFiltersContainer');
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
    const time = status.formattedUpdatedAt || this.formatDate(status.generatedAt);
    this.dataStatusDetail.textContent =
      `${status.message}${time ? ` ｜ 更新時間：${time}` : ''}`;
  }

  renderFilters(languages, topics, filters) {
    const focusedTopics = topics.filter(({ isOther }) => !isOther);
    const otherTopic = topics.find(({ isOther }) => isOther);
    const quickTopics = [
      ...focusedTopics.slice(0, 20),
      ...(otherTopic ? [otherTopic] : [])
    ];

    const selectedLanguages = filters.languages || [];
    const isAllLanguages = selectedLanguages.length === 0 && (filters.language === 'all' || !filters.language);

    this.languageChips.innerHTML = [
      this.chip('lang', 'all', '全部語言', isAllLanguages),
      ...languages.map(language => {
        const isSelected = selectedLanguages.includes(language) || (selectedLanguages.length === 0 && filters.language === language);
        return this.chip('lang', language, language, isSelected);
      })
    ].join('');

    const selectedTopics = filters.topics || [];
    const isAllTopics = selectedTopics.length === 0 && (filters.topic === 'all' || !filters.topic);

    this.topicChips.innerHTML = [
      this.chip('topic', 'all', '全部 Topic', isAllTopics),
      ...quickTopics.map(({ topic, count, isOther }) => {
        const isSelected = selectedTopics.includes(topic) || (selectedTopics.length === 0 && filters.topic === topic);
        const label = isOther ? `其他 / other ${count}` : `#${topic} ${count}`;
        return this.chip('topic', topic, label, isSelected);
      })
    ].join('');

    if (this.languageSelect) {
      this.languageSelect.innerHTML = [
        '<option value="all">全部語言</option>',
        ...languages.map(language =>
          `<option value="${this.escapeHtml(language)}">${this.escapeHtml(language)}</option>`
        )
      ].join('');
      this.languageSelect.value = selectedLanguages.length === 1 ? selectedLanguages[0] : (selectedLanguages.length > 1 ? 'all' : filters.language);
    }

    if (this.topicSelect) {
      this.topicSelect.innerHTML = [
        '<option value="all">全部 Topic</option>',
        ...topics.map(({ topic, count, isOther }) =>
          `<option value="${this.escapeHtml(topic)}">` +
          `${isOther ? '其他 / other' : `#${this.escapeHtml(topic)}`}（${count}）</option>`
        )
      ].join('');
      this.topicSelect.value = selectedTopics.length === 1 ? selectedTopics[0] : (selectedTopics.length > 1 ? 'all' : filters.topic);
    }
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
    const checkmark = active && value !== 'all' ? '<span class="chip-check" aria-hidden="true">✓ </span>' : '';
    return `<button type="button" class="chip${active ? ' active' : ''}" ` +
      `${attribute}="${this.escapeHtml(value)}" aria-pressed="${active}">` +
      `${checkmark}${this.escapeHtml(label)}</button>`;
  }

  renderRepositories(repositories, notes, favorites, viewMode, paginationInfo, sortBy = 'starred-desc') {
    if (!repositories.length) {
      this.repoGrid.replaceChildren();
      this.emptyState.hidden = false;
      this.paginationBar.hidden = true;
      return;
    }
    this.emptyState.hidden = true;
    if (viewMode === 'table') {
      this.renderRepoTable(repositories, notes, favorites, sortBy);
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
                <button type="button" class="btn btn-icon-only copy-url-btn"
                  aria-label="複製 ${fullName} 的 URL"
                  title="複製 URL"
                  data-url="${this.safeUrl(repo.url)}">📋</button>
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
              ${repo.createdAt ? `<span title="專案創建時間：${this.formatDate(repo.createdAt)}">🌱 創建 ${this.formatShortDate(repo.createdAt)}</span>` : ''}
              <span title="GitHub Stars">⭐ ${repo.stars.toLocaleString()}</span>
              <span title="Forks">⑂ ${repo.forks.toLocaleString()}</span>
            </div>
          </footer>
        </article>`;
    }).join('');
  }

  renderActiveFilters(filters) {
    if (!this.activeFiltersBar || !this.activeFiltersContainer) return;
    const activeChips = [];
    if (filters.keyword) {
      activeChips.push(`<span class="active-filter-tag">🔍 "${this.escapeHtml(filters.keyword)}" <button type="button" class="remove-filter-btn" data-filter="keyword" aria-label="清除搜尋">✕</button></span>`);
    }

    // Multi-select languages
    if (filters.languages && filters.languages.length > 0) {
      filters.languages.forEach(lang => {
        activeChips.push(`<span class="active-filter-tag">語言: ${this.escapeHtml(lang)} <button type="button" class="remove-filter-btn" data-filter="language" data-value="${this.escapeHtml(lang)}" aria-label="移除語言 ${this.escapeHtml(lang)}">✕</button></span>`);
      });
    } else if (filters.language && filters.language !== 'all') {
      activeChips.push(`<span class="active-filter-tag">語言: ${this.escapeHtml(filters.language)} <button type="button" class="remove-filter-btn" data-filter="language" data-value="${this.escapeHtml(filters.language)}" aria-label="清除語言篩選">✕</button></span>`);
    }

    // Multi-select topics
    if (filters.topics && filters.topics.length > 0) {
      filters.topics.forEach(topic => {
        const displayTopic = topic === 'other' ? '其他 / other' : `#${topic}`;
        activeChips.push(`<span class="active-filter-tag">Topic: ${this.escapeHtml(displayTopic)} <button type="button" class="remove-filter-btn" data-filter="topic" data-value="${this.escapeHtml(topic)}" aria-label="移除 Topic ${this.escapeHtml(displayTopic)}">✕</button></span>`);
      });
      if (filters.topics.length > 1) {
        const modeLabel = filters.topicMatchMode === 'all' ? 'AND (同時符合)' : 'OR (符合任一)';
        activeChips.push(`<button type="button" id="toggleTopicMatchModeBtn" class="btn-match-mode" title="點擊切換 Topic 匹配模式：${modeLabel}">模式: ${modeLabel} ⇄</button>`);
      }
    } else if (filters.topic && filters.topic !== 'all') {
      const displayTopic = filters.topic === 'other' ? '其他 / other' : `#${filters.topic}`;
      activeChips.push(`<span class="active-filter-tag">Topic: ${this.escapeHtml(displayTopic)} <button type="button" class="remove-filter-btn" data-filter="topic" data-value="${this.escapeHtml(filters.topic)}" aria-label="清除 Topic 篩選">✕</button></span>`);
    }

    // Archive / status filter
    if (filters.archive && filters.archive !== 'active') {
      const labels = { all: '全部專案', favorites: '⭐ 僅限最愛', notes: '📝 僅有筆記', archived: '僅限 Archived' };
      activeChips.push(`<span class="active-filter-tag">狀態: ${labels[filters.archive] || filters.archive} <button type="button" class="remove-filter-btn" data-filter="archive" aria-label="重置狀態篩選">✕</button></span>`);
    }

    if (activeChips.length > 0) {
      activeChips.push(`<button type="button" id="clearAllActiveFiltersBtn" class="btn btn-compact btn-reset-filters">一鍵重置</button>`);
      this.activeFiltersContainer.innerHTML = activeChips.join('');
      this.activeFiltersBar.hidden = false;
    } else {
      this.activeFiltersContainer.innerHTML = '';
      this.activeFiltersBar.hidden = true;
    }
  }

  renderRepoTable(repositories, notes, favorites = {}, sortBy = 'starred-desc') {
    this.repoGrid.className = 'table-shell';
    const starsIndicator = sortBy === 'stars-desc' ? ' ▼' : sortBy === 'stars-asc' ? ' ▲' : '';
    const nameIndicator = sortBy === 'name-asc' ? ' ▲' : '';
    const starredIndicator = sortBy === 'starred-desc' ? ' ▼' : '';
    const createdIndicator = sortBy === 'created-desc' ? ' ▼' : sortBy === 'created-asc' ? ' ▲' : '';
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
          <td><time datetime="${this.escapeHtml(repo.createdAt)}">${this.formatShortDate(repo.createdAt)}</time></td>
          <td><time datetime="${this.escapeHtml(repo.starredAt)}">${this.formatShortDate(repo.starredAt)}</time></td>
          <td><span class="status-badge ${repo.isArchived ? 'archived' : ''}">${status}</span></td>
          <td class="action-cell">
            <button type="button" class="btn btn-icon-only copy-url-btn"
              aria-label="複製 ${fullName} 的 URL"
              title="複製 URL"
              data-url="${this.safeUrl(repo.url)}">📋</button>
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
            <th scope="col" class="sortable-th" data-sort-by="name-asc" title="按專案名稱排序">Repository${nameIndicator}</th>
            <th scope="col">語言</th>
            <th scope="col" class="numeric-cell sortable-th" data-sort-by="${sortBy === 'stars-desc' ? 'stars-asc' : 'stars-desc'}" title="點擊切換 Stars 排序">Stars${starsIndicator}</th>
            <th scope="col" class="numeric-cell">Forks</th>
            <th scope="col" class="sortable-th" data-sort-by="${sortBy === 'created-desc' ? 'created-asc' : 'created-desc'}" title="點擊切換創建日期排序">創建日期${createdIndicator}</th>
            <th scope="col" class="sortable-th" data-sort-by="starred-desc" title="按收藏日期排序">收藏日期${starredIndicator}</th>
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

  openShortcutsModal(trigger) {
    this.previousFocus = trigger || document.activeElement;
    this.shortcutsModal.classList.add('active');
    this.shortcutsModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => this.closeShortcutsModalBtn?.focus());
  }

  closeShortcutsModal() {
    this.shortcutsModal.classList.remove('active');
    this.shortcutsModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    this.previousFocus?.focus();
  }

  toggleShortcutsModal(trigger) {
    if (this.shortcutsModal.classList.contains('active')) {
      this.closeShortcutsModal();
    } else {
      this.openShortcutsModal(trigger);
    }
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

    const createdYearlyItems = (analytics.createdYearlyTrend || []).map(item => `
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
        <h3>年度 Star 收藏趨勢 (Starred Timeline)</h3>
        <div class="analytics-years-grid">${yearlyItems}</div>
      </div>

      ${createdYearlyItems ? `
      <div class="analytics-section">
        <h3>專案創建年代分佈 (Created Timeline)</h3>
        <div class="analytics-years-grid">${createdYearlyItems}</div>
      </div>` : ''}
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
