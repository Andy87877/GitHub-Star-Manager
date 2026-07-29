*** Settings ***
Documentation    Robot Framework Test Suite for GitHub Star Manager Categorization Logic.
Library          Process
Library          OperatingSystem

*** Variables ***
${PYTHON_BIN}    python

*** Test Cases ***
Verify Language Categorization Strategy
    [Documentation]    Test that LanguageCategorizer correctly groups repositories by primary language.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    lang
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0

Verify Topic Categorization Strategy
    [Documentation]    Test that TopicCategorizer correctly maps multi-topic repositories to categories.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    topic
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0

Verify Focused Topic Policy Removes One-Off Noise
    [Documentation]    Keep repeated high-signal Topics and cap navigation size.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    focused_topic
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0

Verify Default Fallback For Empty Language And Topics
    [Documentation]    Test fallback categorizations for missing fields.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    fallback
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0

Verify GitHub REST Star Timestamp Contract
    [Documentation]    REST fallback must parse the star media wrapper and retain starred_at.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    rest_contract
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0

Verify Empty Fetch Cannot Replace Good Output
    [Documentation]    Publication safety: zero rows must preserve the previous snapshot.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    empty_preserves
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0
