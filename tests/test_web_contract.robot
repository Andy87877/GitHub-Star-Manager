*** Settings ***
Documentation     Static Web accessibility and live-data contract checks.
Library           OperatingSystem

*** Test Cases ***
Page Exposes Loading Status And Accessible Main Controls
    ${html}=    Get File    ${CURDIR}${/}..${/}web${/}index.html
    Should Contain    ${html}    id="dataStatus"
    Should Contain    ${html}    aria-live="polite"
    Should Contain    ${html}    id="clearFiltersBtn"
    Should Contain    ${html}    aria-label=
    Should Contain    ${html}    role="dialog"
    Should Contain    ${html}    id="viewModeToggle"
    Should Contain    ${html}    data-view-mode="cards"
    Should Contain    ${html}    data-view-mode="table"

Frontend Model Uses Live GitHub API With Cached Fallback
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    Should Contain    ${model}    application/vnd.github.star+json
    Should Contain    ${model}    https://api.github.com/users/
    Should Contain    ${model}    encodeURIComponent(this.username)
    Should Contain    ${model}    loadCachedDataset
    Should Contain    ${model}    refreshFromGitHub

Frontend Supports Clear Filters And Keyboard Modal Exit
    ${controller}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}controllers${/}StarController.js
    Should Contain    ${controller}    clearFilters
    Should Contain    ${controller}    Escape

Frontend Supports Card And Table Views
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    ${view}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}views${/}StarView.js
    ${controller}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}controllers${/}StarController.js
    Should Contain    ${model}    setViewMode
    Should Contain    ${model}    gsm_view_mode
    Should Contain    ${view}    renderRepoTable
    Should Contain    ${view}    class="repo-table"
    Should Contain    ${controller}    data-view-mode

Frontend Defaults To Table And Preserves Explicit Preference
    ${html}=    Get File    ${CURDIR}${/}..${/}web${/}index.html
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    Should Contain    ${html}    id="tableViewBtn"
    Should Contain    ${html}    data-view-mode="table"
    Should Contain    ${html}    aria-pressed="true"
    ${table_position}=    Evaluate    $html.index('id="tableViewBtn"')
    ${cards_position}=    Evaluate    $html.index('id="cardsViewBtn"')
    Should Be True    ${table_position} < ${cards_position}
    Should Contain    ${model}    const storedViewMode
    Should Contain    ${model}    ['table', 'cards'].includes(storedViewMode)
    Should Contain    ${model}    : 'table';

Frontend Topic Navigation Includes A Bottom Other Bucket
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    ${view}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}views${/}StarView.js
    Should Contain    ${model}    otherTopic: 'other'
    Should Contain    ${model}    focusedTopicNames
    Should Contain    ${model}    isOtherFilter
    Should Contain    ${view}    const otherTopic
    Should Contain    ${view}    其他 / other

Frontend Exposes Interactive Analytics Modal
    ${html}=    Get File    ${CURDIR}${/}..${/}web${/}index.html
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    ${view}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}views${/}StarView.js
    Should Contain    ${html}    id="analyticsBtn"
    Should Contain    ${html}    id="analyticsModal"
    Should Contain    ${model}    calculateAnalytics
    Should Contain    ${view}    renderAnalyticsContent

Frontend Supports Repository Favorites Marking
    ${html}=    Get File    ${CURDIR}${/}..${/}web${/}index.html
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    ${view}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}views${/}StarView.js
    Should Contain    ${html}    <option value="favorites">⭐ 僅限最愛</option>
    Should Contain    ${model}    toggleFavorite
    Should Contain    ${model}    gsm_repo_favorites
    Should Contain    ${view}    toggle-fav-btn

Frontend Supports Pagination Navigation Controls
    ${html}=    Get File    ${CURDIR}${/}..${/}web${/}index.html
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    ${view}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}views${/}StarView.js
    Should Contain    ${html}    id="paginationBar"
    Should Contain    ${html}    id="pageSizeSelect"
    Should Contain    ${model}    getPaginatedRepositories
    Should Contain    ${model}    setPageSize
    Should Contain    ${view}    renderPagination

Dataset Snapshot Integrity Contract
    ${stars_content}=    Get File    ${CURDIR}${/}..${/}web${/}data${/}stars.json
    ${meta_content}=     Get File    ${CURDIR}${/}..${/}web${/}data${/}sync-meta.json
    Should Not Contain   ${stars_content}    <<<<<<<
    Should Not Contain   ${meta_content}     <<<<<<<
    ${stars}=            Evaluate            json.loads($stars_content)    modules=json
    ${meta}=             Evaluate            json.loads($meta_content)     modules=json
    Should Be True       len($stars) == $meta['repositoryCount']
    Should Be Equal      ${meta['username']}   Andy87877
    Should Be True       ${meta['isLiveSnapshot']}

Page Renders CC0 License Footer
    ${html}=    Get File    ${CURDIR}${/}..${/}web${/}index.html
    Should Contain    ${html}    class="site-footer"
    Should Contain    ${html}    Andy87877
    Should Contain    ${html}    CC0-1.0 Universal License

Frontend Supports Keyboard Shortcuts Modal
    ${html}=    Get File    ${CURDIR}${/}..${/}web${/}index.html
    ${view}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}views${/}StarView.js
    ${controller}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}controllers${/}StarController.js
    Should Contain    ${html}    id="shortcutsModal"
    Should Contain    ${html}    id="shortcutsBtn"
    Should Contain    ${view}    openShortcutsModal
    Should Contain    ${controller}    toggleShortcutsModal

Frontend Renders Clickable Table Headers And Active Filter Bar
    ${html}=    Get File    ${CURDIR}${/}..${/}web${/}index.html
    ${view}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}views${/}StarView.js
    ${controller}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}controllers${/}StarController.js
    Should Contain    ${html}    id="activeFiltersBar"
    Should Contain    ${html}    id="activeFiltersContainer"
    Should Contain    ${view}    renderActiveFilters
    Should Contain    ${view}    sortable-th
    Should Contain    ${controller}    clearAllActiveFiltersBtn

Frontend CSV Export Escapes Formula Prefixes
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    Should Contain    ${model}    const csvSafe
    Should Contain    ${model}    /^[\\t\\r ]*[=+\\-@]/

Frontend Supports Created Time Tracking And Sorting
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    ${view}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}views${/}StarView.js
    ${html}=    Get File    ${CURDIR}${/}..${/}web${/}index.html
    Should Contain    ${model}    createdAt
    Should Contain    ${model}    created-desc
    Should Contain    ${model}    created-asc
    Should Contain    ${model}    createdYearlyTrend
    Should Contain    ${view}    創建日期
    Should Contain    ${html}    value="created-desc"
    Should Contain    ${html}    value="created-asc"

Frontend Supports Multi-Select Filter Contracts
    ${model}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}models${/}StarModel.js
    ${view}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}views${/}StarView.js
    ${controller}=    Get File    ${CURDIR}${/}..${/}web${/}js${/}controllers${/}StarController.js
    Should Contain    ${model}    toggleLanguage
    Should Contain    ${model}    toggleTopic
    Should Contain    ${model}    topicMatchMode
    Should Contain    ${model}    isLanguageSelected
    Should Contain    ${model}    isTopicSelected
    Should Contain    ${view}    chip-check
    Should Contain    ${controller}    toggleTopicMatchModeBtn


