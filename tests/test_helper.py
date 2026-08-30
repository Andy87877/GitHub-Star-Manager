"""Robot Framework bridge for deterministic Python-level checks."""

from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from app.controllers.sync_controller import EmptyDatasetError, SyncController
from app.models.repository import Repository
from app.services.categorizers import (
    FocusedTopicPolicy,
    LanguageCategorizer,
    TopicCategorizer,
)
from app.services.github_client import GitHubRESTClient, IGitHubClient
from app.services.renderers import (
    JSONDatasetRenderer,
    MarkdownLanguageRenderer,
    MarkdownTopicRenderer,
)


def sample_repository(**overrides) -> Repository:
    values = {
        "name": "repo",
        "owner": "owner",
        "full_name": "owner/repo",
        "url": "https://github.com/owner/repo",
        "description": "A useful repository",
        "language": "Python",
        "topics": ["python", "testing"],
        "stars": 100,
        "forks": 10,
        "is_archived": False,
        "created_at": "2024-01-01T00:00:00Z",
        "starred_at": "2026-07-29T00:00:00Z",
        "updated_at": "2026-07-28T00:00:00Z",
    }
    values.update(overrides)
    return Repository(**values)


def test_language_categorizer() -> str:
    repositories = [
        sample_repository(full_name="u1/repo1", language="Python"),
        sample_repository(full_name="u2/repo2", language="Python"),
        sample_repository(full_name="u3/repo3", language="JavaScript"),
    ]
    result = LanguageCategorizer().categorize(repositories)
    assert len(result["Python"]) == 2
    assert len(result["JavaScript"]) == 1
    return "PASS"


def test_topic_categorizer() -> str:
    repositories = [
        sample_repository(full_name="u1/repo1", topics=["ai", "python"]),
        sample_repository(full_name="u2/repo2", topics=["ai"]),
    ]
    result = TopicCategorizer().categorize(repositories)
    assert len(result["ai"]) == 2
    assert len(result["python"]) == 1
    return "PASS"


def test_focused_topic_policy() -> str:
    repositories = [
        sample_repository(
            full_name="u1/repo1", topics=["ai", "python", "one-off-a"]
        ),
        sample_repository(
            full_name="u2/repo2", topics=["ai", "python", "testing"]
        ),
        sample_repository(
            full_name="u3/repo3", topics=["ai", "testing", "one-off-b"]
        ),
        sample_repository(
            full_name="u4/repo4", topics=["automation", "one-off-c"]
        ),
        sample_repository(
            full_name="u5/repo5", topics=["automation", "one-off-d"]
        ),
        sample_repository(
            full_name="u6/repo6", topics=["unselected-only"]
        ),
    ]
    categorizer = TopicCategorizer(
        sort_categories=False,
        selection_policy=FocusedTopicPolicy(
            minimum_repository_count=2,
            maximum_categories=3,
        ),
    )
    result = categorizer.categorize(repositories)
    assert list(result) == ["ai", "automation", "python", "other"]
    assert "one-off-a" not in result
    assert "testing" not in result
    assert [repository.full_name for repository in result["other"]] == [
        "u6/repo6"
    ]
    return "PASS"


def test_empty_fallback() -> str:
    repository = sample_repository(language="", topics=[])
    assert "Others" in LanguageCategorizer().categorize([repository])
    assert "others" in TopicCategorizer().categorize([repository])
    return "PASS"


def test_markdown_language_renderer() -> str:
    categorized = {"Python": [sample_repository()]}
    output = MarkdownLanguageRenderer().render(
        categorized,
        metadata={
            "repositoryCount": 1,
            "formattedDelta": "+1",
            "generatedAt": "2026-07-29T00:00:00+00:00",
            "formattedUpdatedAt": "2026-07-29 08:00:00 (UTC+8)",
            "profileUrl": "https://github.com/Andy87877?tab=stars",
        },
    )
    assert "Andy87877 的 GitHub Stars（依主要語言）" in output
    assert '<a id="language-python"></a>' in output
    assert "[owner/repo]" in output
    return "PASS"


def test_sync_metadata_delta() -> str:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        meta_dir = root / "web" / "data"
        meta_dir.mkdir(parents=True, exist_ok=True)
        old_meta = meta_dir / "sync-meta.json"
        old_meta.write_text(
            json.dumps({"username": "Andy87877", "repositoryCount": 100}),
            encoding="utf-8",
        )
        class TwoReposClient(IGitHubClient):
            source_name = "TwoRepos fixture"
            def fetch_starred_repositories(self, username, limit=None):
                return [sample_repository(full_name="a/b"), sample_repository(full_name="c/d")]

        SyncController(client=TwoReposClient()).sync(output_dir=str(root))
        new_meta = json.loads((meta_dir / "sync-meta.json").read_text(encoding="utf-8"))
        assert new_meta["repositoryCount"] == 2
        assert new_meta["previousRepositoryCount"] == 100
        assert new_meta["deltaCount"] == -98
        assert new_meta["formattedDelta"] == "-98"
        assert "formattedUpdatedAt" in new_meta
    return "PASS"


def test_markdown_topic_renderer() -> str:
    output = MarkdownTopicRenderer().render(
        {
            "ai": [sample_repository(topics=["ai"])],
            "other": [
                sample_repository(
                    full_name="owner/unclassified",
                    topics=["one-off"],
                )
            ],
        },
        metadata={
            "repositoryCount": 2,
            "formattedDelta": "+2",
            "generatedAt": "2026-07-29T00:00:00+00:00",
            "formattedUpdatedAt": "2026-07-29 08:00:00 (UTC+8)",
            "totalTopicCount": 469,
            "focusedTopicCount": 1,
            "otherRepositoryCount": 1,
            "topicMinimumRepositoryCount": 2,
            "topicMaximumCategories": 30,
            "topicOtherCategory": "other",
            "analytics": {
                "topTopics": [{"topic": "ai", "count": 1}],
                "languageBreakdown": {"Python": {"count": 2, "percentage": 100.0}},
            },
        },
    )
    assert "Andy87877 的 GitHub Stars" in output
    assert "收錄 **2** 個公開 Star；" in output
    assert "```mermaid" in output
    assert "pie title 熱門 Topic 覆蓋 Top 10" in output
    assert "⭐ 收藏星數最高 Top 10 精選" in output
    assert "CC0-1.0 Universal" in output
    assert '<a id="topic-ai"></a>' in output
    assert "## ai" in output
    assert "## other" in output
    return "PASS"


def test_json_dataset_renderer() -> str:
    repository = sample_repository()
    output = JSONDatasetRenderer().render(
        {"Python": [repository], "testing": [repository]}
    )
    data = json.loads(output)
    assert len(data) == 1
    assert data[0]["fullName"] == "owner/repo"
    assert data[0]["starredAt"] == "2026-07-29T00:00:00Z"
    return "PASS"


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.headers = {"X-RateLimit-Remaining": "59"}

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self):
        self.calls = []

    def get(self, url, params, headers, timeout):
        self.calls.append(
            {"url": url, "params": params, "headers": headers, "timeout": timeout}
        )
        if params["page"] == 1:
            return FakeResponse(
                [
                    {
                        "starred_at": "2026-07-29T01:02:03Z",
                        "repo": {
                            "name": "repo",
                            "full_name": "owner/repo",
                            "html_url": "https://github.com/owner/repo",
                            "owner": {"login": "owner"},
                            "language": "Python",
                            "topics": ["testing"],
                            "stargazers_count": 9,
                            "forks_count": 2,
                            "archived": False,
                            "updated_at": "2026-07-29T00:00:00Z",
                        },
                    }
                ]
            )
        return FakeResponse([])


def test_rest_star_media_contract() -> str:
    session = FakeSession()
    repositories = GitHubRESTClient(session=session).fetch_starred_repositories(
        "Andy87877"
    )
    assert len(repositories) == 1
    assert repositories[0].starred_at == "2026-07-29T01:02:03Z"
    assert repositories[0].full_name == "owner/repo"
    assert session.calls[0]["headers"]["Accept"] == "application/vnd.github.star+json"
    return "PASS"


class EmptyClient(IGitHubClient):
    source_name = "Empty fixture"

    def fetch_starred_repositories(self, username, limit=None):
        return []


def test_empty_sync_preserves_outputs() -> str:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        readme = root / "README.md"
        readme.write_text("known-good\n", encoding="utf-8")
        try:
            SyncController(client=EmptyClient()).sync(output_dir=str(root))
        except EmptyDatasetError:
            pass
        else:
            raise AssertionError("Expected EmptyDatasetError")
        assert readme.read_text(encoding="utf-8") == "known-good\n"
        assert not (root / "web" / "data" / "stars.json").exists()
    return "PASS"


def test_clean_inline_text_escaping() -> str:
    from app.services.renderers import _clean_inline_text
    raw_desc = "Important [Click link](http://example.com) *bold* _italic_ `code` | pipe"
    cleaned = _clean_inline_text(raw_desc)
    assert r"\[Click link\]" in cleaned
    assert r"\*bold\*" in cleaned
    assert r"\_italic\_" in cleaned
    assert r"\`code\`" in cleaned
    assert r"\| pipe" in cleaned
    return "PASS"


def test_repository_created_at_serialization() -> str:
    repo = sample_repository(created_at="2023-03-15T12:00:00Z")
    d = repo.to_dict()
    assert d["createdAt"] == "2023-03-15T12:00:00Z"
    reconstructed = Repository.from_dict(d)
    assert reconstructed.created_at == "2023-03-15T12:00:00Z"
    return "PASS"


def main() -> None:
    tests = {
        "lang": test_language_categorizer,
        "topic": test_topic_categorizer,
        "focused_topic": test_focused_topic_policy,
        "fallback": test_empty_fallback,
        "md_lang": test_markdown_language_renderer,
        "md_topic": test_markdown_topic_renderer,
        "json": test_json_dataset_renderer,
        "rest_contract": test_rest_star_media_contract,
        "empty_preserves": test_empty_sync_preserves_outputs,
        "meta_delta": test_sync_metadata_delta,
        "clean_text": test_clean_inline_text_escaping,
        "repo_created_at": test_repository_created_at_serialization,
    }
    name = sys.argv[1]
    print(tests[name]())


if __name__ == "__main__":
    main()
