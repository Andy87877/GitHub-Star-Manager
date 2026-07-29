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
    this.languageChips.innerHTML = [
      this.chip('lang', 'all', '全部語言', filters.language === 'all'),
      ...languages.map(language =>
        this.chip('lang', language, language, filters.language === language)
      )
    ].join('');

    this.topicChips.innerHTML = [
      this.chip('topic', 'all', '全部 Topic', filters.topic === 'all'),
      ...topics.slice(0, 18).map(({ topic, count }) =>
        this.chip('topic', topic, `#${topic} ${count}`, filters.topic === topic)
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
      ...topics.map(({ topic, count }) =>
        `<option value="${this.escapeHtml(topic)}">#${this.escapeHtml(topic)}（${count}）</option>`
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

  renderRepositories(repositories, notes, viewMode) {
    if (!repositories.length) {
      this.repoGrid.replaceChildren();
      this.emptyState.hidden = false;
      return;
    }
    this.emptyState.hidden = true;
    if (viewMode === 'table') {
      this.renderRepoTable(repositories, notes);
      return;
    }
    this.renderRepoCards(repositories, notes);
  }

  renderRepoCards(repositories, notes) {
    this.repoGrid.className = 'repo-grid';
    this.repoGrid.innerHTML = repositories.map(repo => {
      const fullName = this.escapeHtml(repo.fullName);
      const note = notes[repo.fullName] || '';
      const topics = repo.topics.slice(0, 5).map(topic =>
        `<span class="topic-tag">#${this.escapeHtml(topic)}</span>`
      ).join('');
      const archived = repo.isArchived
        ? '<span class="archive-badge">Archived</span>'
        : '';
      return `
        <article class="repo-card${repo.isArchived ? ' is-archived' : ''}">
          <div>
            <div class="repo-header">
              <h2 class="repo-title">
                <a href="${this.safeUrl(repo.url)}" target="_blank" rel="noopener noreferrer">
                  ${fullName}
                </a>
              </h2>
              <button type="button" class="btn btn-icon-only edit-note-btn"
                aria-label="編輯 ${fullName} 的研究筆記"
                data-full-name="${fullName}">✏️</button>
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

  renderRepoTable(repositories, notes) {
    this.repoGrid.className = 'table-shell';
    const rows = repositories.map(repo => {
      const fullName = this.escapeHtml(repo.fullName);
      const note = notes[repo.fullName] || '';
      const status = repo.isArchived ? 'Archived' : '使用中';
      return `
        <tr class="${repo.isArchived ? 'is-archived' : ''}">
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
