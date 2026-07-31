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
    Should Contain    ${html}    id="tableViewBtn" type="button" class="view-toggle-btn active"
    Should Contain    ${html}    data-view-mode="table" aria-pressed="true"
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
