/**
 * Frontend Controller: translates user intent into Model updates and View work.
 */
export class StarController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.activeNoteRepoName = null;
  }

  async init() {
    this.view.applyTheme(this.model.getTheme());
    this.bindEvents();
    await this.model.loadCachedDataset();
    this.render();
    await this.refreshLiveData({ announce: false });
  }

  render() {
    const paginatedRepos = this.model.getPaginatedRepositories();
    const paginationInfo = {
      currentPage: this.model.currentPage,
      totalPages: this.model.getTotalPages(),
      pageSize: this.model.pageSize,
      totalCount: this.model.filteredRepositories.length
    };
    this.view.renderStats(this.model.getStatistics());
    this.view.renderStatus(this.model.dataStatus);
    this.view.renderFilters(
      this.model.languages,
      this.model.topics,
      this.model.filters
    );
    this.view.renderRepositories(
      paginatedRepos,
      this.model.notes,
      this.model.favorites,
      this.model.viewMode,
      paginationInfo
    );
    this.view.renderViewToggle(this.model.viewMode);
    this.syncControls();
  }

  syncControls() {
    document.getElementById('searchInput').value = this.model.filters.keyword;
    document.getElementById('sortSelect').value = this.model.filters.sortBy;
    document.getElementById('archiveSelect').value = this.model.filters.archive;
  }

  updateFilter(name, value) {
    this.model.filters[name] = value;
    this.model.applyFilters();
    this.render();
  }

  async refreshLiveData({ announce = true } = {}) {
    this.view.setRefreshBusy(true);
    try {
      const count = await this.model.refreshFromGitHub();
      this.render();
      if (announce) this.view.showToast(`已取得 GitHub 即時資料，共 ${count} 筆。`, 'success');
    } catch (error) {
      this.model.markLiveRefreshFailed(error);
      this.render();
      if (announce) this.view.showToast(this.model.dataStatus.message, 'warning');
    } finally {
      this.view.setRefreshBusy(false);
    }
  }

  bindEvents() {
    let debounceTimer;
    document.getElementById('searchInput').addEventListener('input', event => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(
        () => this.updateFilter('keyword', event.target.value),
        160
      );
    });

    [
      ['languageSelect', 'language'],
      ['topicSelect', 'topic'],
      ['sortSelect', 'sortBy'],
      ['archiveSelect', 'archive']
    ].forEach(([id, filter]) => {
      document.getElementById(id).addEventListener(
        'change',
        event => this.updateFilter(filter, event.target.value)
      );
    });

    document.getElementById('languageChips').addEventListener('click', event => {
      const chip = event.target.closest('[data-lang]');
      if (chip) this.updateFilter('language', chip.dataset.lang);
    });
    document.getElementById('topicChips').addEventListener('click', event => {
      const chip = event.target.closest('[data-topic]');
      if (chip) this.updateFilter('topic', chip.dataset.topic);
    });

    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
      this.model.clearFilters();
      this.render();
      document.getElementById('searchInput').focus();
    });

    document.getElementById('viewModeToggle').addEventListener('click', event => {
      const button = event.target.closest('[data-view-mode]');
      if (!button) return;
      this.model.setViewMode(button.dataset.viewMode);
      this.render();
    });

    document.getElementById('refreshDataBtn').addEventListener(
      'click',
      () => this.refreshLiveData()
    );

    document.getElementById('repoGrid').addEventListener('click', async event => {
      const copyBtn = event.target.closest('.copy-url-btn');
      if (copyBtn) {
        const url = copyBtn.dataset.url;
        try {
          await navigator.clipboard.writeText(url);
          this.view.showToast('已複製專案 URL 到剪貼簿！', 'success');
        } catch {
          this.view.showToast(`專案 URL: ${url}`, 'info');
        }
        return;
      }
      const favBtn = event.target.closest('.toggle-fav-btn');
      if (favBtn) {
        const fullName = favBtn.dataset.fullName;
        const isFav = this.model.toggleFavorite(fullName);
        this.render();
        this.view.showToast(isFav ? `已標註 ${fullName} 為最愛` : `已取消 ${fullName} 最愛標註`, 'info');
        return;
      }
      const noteBtn = event.target.closest('.edit-note-btn');
      if (noteBtn) {
        this.activeNoteRepoName = noteBtn.dataset.fullName;
        this.view.openNoteModal(
          this.activeNoteRepoName,
          this.model.getNote(this.activeNoteRepoName),
          noteBtn
        );
      }
    });

    if (this.view.backToTopBtn) {
      window.addEventListener('scroll', () => {
        this.view.backToTopBtn.hidden = window.scrollY < 300;
      });
      this.view.backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    this.view.saveNoteBtn.addEventListener('click', () => this.saveNote());
    this.view.closeNoteModalBtn.addEventListener('click', () => this.view.closeNoteModal());
    this.view.noteModal.addEventListener('click', event => {
      if (event.target === this.view.noteModal) this.view.closeNoteModal();
    });
    this.view.noteTextarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') this.saveNote();
    });

    // Analytics Modal Events
    this.view.analyticsBtn.addEventListener('click', event => {
      this.view.openAnalyticsModal(this.model.calculateAnalytics(), event.currentTarget);
    });
    this.view.closeAnalyticsModalBtn.addEventListener('click', () => {
      this.view.closeAnalyticsModal();
    });
    this.view.analyticsModal.addEventListener('click', event => {
      if (event.target === this.view.analyticsModal) this.view.closeAnalyticsModal();
    });

    // Pagination Events
    this.view.pageSizeSelect.addEventListener('change', event => {
      this.model.setPageSize(event.target.value);
      this.render();
    });
    this.view.prevPageBtn.addEventListener('click', () => {
      this.model.setPage(this.model.currentPage - 1);
      this.render();
    });
    this.view.nextPageBtn.addEventListener('click', () => {
      this.model.setPage(this.model.currentPage + 1);
      this.render();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (this.view.noteModal.classList.contains('active')) this.view.closeNoteModal();
        if (this.view.analyticsModal.classList.contains('active')) this.view.closeAnalyticsModal();
      }
      const tagName = document.activeElement?.tagName;
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) {
        event.preventDefault();
        document.getElementById('searchInput').focus();
      }
    });

    this.view.themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme;
      const next = current === 'dark' ? 'light' : 'dark';
      this.model.setTheme(next);
      this.view.applyTheme(next);
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
      const repository = this.model.getRandomRepository();
      if (!repository) {
        this.view.showToast('目前沒有符合條件的專案。', 'warning');
        return;
      }
      const opened = window.open(repository.url, '_blank', 'noopener,noreferrer');
      if (opened) opened.opener = null;
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      const blob = new Blob(
        ['\ufeff', this.model.exportToCSV()],
        { type: 'text/csv;charset=utf-8' }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `andy87877-github-stars-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      this.view.showToast('已匯出目前篩選結果。', 'success');
    });
  }

  saveNote() {
    if (!this.activeNoteRepoName) return;
    this.model.setNote(this.activeNoteRepoName, this.view.noteTextarea.value);
    this.view.closeNoteModal();
    this.view.showToast('研究筆記已儲存在這個瀏覽器。', 'success');
    this.render();
  }
}
