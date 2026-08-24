*** Settings ***
Documentation    Robot Framework Test Suite for GitHub Star Manager Renderers (View Layer).
Library          Process
Library          OperatingSystem

*** Variables ***
${PYTHON_BIN}    python

*** Test Cases ***
Verify Markdown Language Renderer Format
    [Documentation]    Test that MarkdownLanguageRenderer outputs correct markdown headers and anchors.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    md_lang
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0

Verify Markdown Topic Renderer Format
    [Documentation]    Test that MarkdownTopicRenderer outputs topic headers.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    md_topic
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0

Verify JSON Dataset Renderer Format
    [Documentation]    Test that JSONDatasetRenderer outputs valid JSON array with full fields.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    json
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0

Verify Markdown Description Text Escaping
    [Documentation]    Test that _clean_inline_text escapes Markdown syntax characters cleanly.
    ${result}=    Run Process    ${PYTHON_BIN}    tests/test_helper.py    clean_text
    Should Contain    ${result.stdout}    PASS
    Should Be Equal As Integers    ${result.rc}    0
