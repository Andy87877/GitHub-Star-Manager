*** Settings ***
Documentation     Sync and workflow acceptance tests. Mock output is isolated.
Library           Process
Library           OperatingSystem
Suite Setup       Prepare Isolated Output Directory

*** Variables ***
${PYTHON_BIN}          python
${TEST_OUTPUT_DIR}     ${CURDIR}${/}..${/}artifacts${/}test-generated

*** Keywords ***
Prepare Isolated Output Directory
    Create Directory    ${TEST_OUTPUT_DIR}

*** Test Cases ***
Mock Sync Writes Only To Isolated Directory
    ${live_readme_before}=    Get File    ${CURDIR}${/}..${/}README.md
    ${result}=    Run Process
    ...    ${PYTHON_BIN}
    ...    main.py
    ...    --client
    ...    mock
    ...    --output-dir
    ...    ${TEST_OUTPUT_DIR}
    ...    cwd=${CURDIR}${/}..
    Should Be Equal As Integers    ${result.rc}    0
    Should Contain    ${result.stdout}    3 repositories
    ${live_readme_after}=    Get File    ${CURDIR}${/}..${/}README.md
    Should Be Equal    ${live_readme_after}    ${live_readme_before}

Mock Sync Produces Complete Artifact Set
    File Should Exist    ${TEST_OUTPUT_DIR}${/}README.md
    File Should Exist    ${TEST_OUTPUT_DIR}${/}topic.md
    File Should Exist    ${TEST_OUTPUT_DIR}${/}web${/}data${/}stars.json
    File Should Exist    ${TEST_OUTPUT_DIR}${/}web${/}data${/}sync-meta.json
    ${metadata}=    Get File    ${TEST_OUTPUT_DIR}${/}web${/}data${/}sync-meta.json
    Should Contain    ${metadata}    "repositoryCount": 3
    Should Contain    ${metadata}    "isLiveSnapshot": false

Workflow Tests Before Live Publication
    ${workflow}=    Get File    ${CURDIR}${/}..${/}.github${/}workflows${/}schedules.yml
    Should Contain    ${workflow}    python -m robot
    Should Contain    ${workflow}    python main.py --username Andy87877
    ${test_position}=    Evaluate    $workflow.index("python -m robot")
    ${sync_position}=    Evaluate    $workflow.index("python main.py --username Andy87877")
    Should Be True    ${test_position} < ${sync_position}

Static Pages Workflow Verifies Before Deploying
    ${workflow}=    Get File    ${CURDIR}${/}..${/}.github${/}workflows${/}ci-pages.yml
    Should Contain    ${workflow}    name: CI and deploy static site
    Should Contain    ${workflow}    python -m robot
    Should Contain    ${workflow}    needs: verify
    Should Contain    ${workflow}    actions/upload-pages-artifact@v4
    Should Contain    ${workflow}    path: _site
    Should Not Contain    ${workflow}    ruby/setup-ruby
    Should Not Contain    ${workflow}    bundle exec jekyll

Root Layout Keeps Only Three Visible Files
    ${root}=    Normalize Path    ${CURDIR}${/}..
    ${root_files}=    Evaluate
    ...    sorted(path.name for path in pathlib.Path($root).iterdir() if path.is_file() and not path.name.startswith('.'))
    ...    modules=pathlib
    Should Be Equal As Strings    ${root_files}    ['README.md', 'main.py', 'topic.md']
    Directory Should Exist    ${root}${/}docs
    Directory Should Exist    ${root}${/}web
    Directory Should Exist    ${root}${/}config
    File Should Exist    ${root}${/}docs${/}AGENT.md
    File Should Not Exist    ${root}${/}architecture.md
    File Should Not Exist    ${root}${/}iterate.md
    File Should Not Exist    ${root}${/}task.md
    File Should Not Exist    ${root}${/}requirements.txt
    File Should Not Exist    ${root}${/}index.html
