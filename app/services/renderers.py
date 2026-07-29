"""Presentation renderers for Markdown and JSON artifacts."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping
from typing import Any, Dict, List, Optional
import json
import re

from app.models.repository import Repository


def _clean_inline_text(value: str, limit: int = 240) -> str:
    """Normalize API text so one repository always occupies one Markdown row."""

    normalized = " ".join((value or "").split()).replace("|", r"\|")
    return normalized if len(normalized) <= limit else f"{normalized[: limit - 1]}…"


def _anchor(prefix: str, category: str) -> str:
    normalized = (
        category.lower()
        .replace("++", "-plus-plus")
        .replace("#", "-sharp")
        .replace("+", "-plus")
    )
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-") or "others"
    return f"{prefix}-{slug}"


class IRenderer(ABC):
    """Renderer abstraction used by the synchronization controller."""

    @abstractmethod
    def render(
        self,
        categorized: Dict[str, List[Repository]],
        title: str = "GitHub Stars",
        metadata: Optional[Mapping[str, Any]] = None,
    ) -> str:
        """Render a categorized repository mapping."""


class MarkdownLanguageRenderer(IRenderer):
    """Render the project README and complete language-grouped Star snapshot."""

    def render(
        self,
        categorized: Dict[str, List[Repository]],
        title: str = "Andy87877 的 GitHub Stars",
        metadata: Optional[Mapping[str, Any]] = None,
    ) -> str:
        metadata = metadata or {}
        count = int(metadata.get("repositoryCount") or sum(map(len, categorized.values())))
        generated_at = metadata.get("generatedAt", "尚未同步")
        profile_url = metadata.get(
            "profileUrl", "https://github.com/Andy87877?tab=stars"
        )

        lines = [
            f"# {title}",
            "",
            (
                f"> 收錄 **{count}** 個公開 Star；資料快照：`{generated_at}`。"
                f"來源：[Andy87877 的 GitHub Stars]({profile_url})。"
            ),
            "",
            "這是一個不需要資料庫的 GitHub Star 個人知識庫：Python 同步器負責"
            "抓取與產生靜態資料，網站則提供即時搜尋、聚焦 Topic、語言篩選、"
            "Cards／Table 雙模式、排序、本機研究筆記與 CSV 匯出。",
            "",
            "## 資料即時性",
            "",
            "- 網站開啟時先顯示版本庫快照，再讀取 GitHub 公開 REST API 更新畫面；"
            "若 API 暫時不可用，會清楚標示目前仍是快照。",
            "- 本 README、`topics.md` 與 `data/stars.json` 由 GitHub Actions "
            "每 6 小時及手動觸發同步。",
            "- 同步採失敗關閉策略：API 錯誤、分頁不完整或取得 0 筆時，不會覆寫"
            "上一份有效資料。",
            "- Topic 導航只顯示至少重複 2 次的前 30 個高頻標籤；原始標籤仍完整"
            "保留在 JSON 與網站全文搜尋。",
            "",
            "## 使用方式",
            "",
            "```powershell",
            "python -m pip install -r requirements.txt",
            "python main.py --username Andy87877",
            "python main.py --serve",
            "```",
            "",
            "瀏覽 `http://127.0.0.1:8000`。執行測試：",
            "",
            "```powershell",
            "python -m robot --outputdir artifacts/robot tests",
            "```",
            "",
            "## 架構摘要",
            "",
            "- Python：`Repository` Model、可替換 GitHub Client／分類／渲染策略、"
            "`SyncController`、原子檔案發布器。",
            "- JavaScript：`StarModel`、`StarView`、`StarController` 前端 MVC。",
            "- 詳細設計、演進與待辦分別見 `architecture.md`、`iterate.md`、"
            "`task.md`。",
            "",
            "## 依主要語言瀏覽",
            "",
        ]

        for category, repositories in categorized.items():
            anchor = _anchor("language", category)
            lines.append(
                f"- [{category}（{len(repositories)}）](#{anchor})"
            )

        lines.extend(["", "---", ""])
        for category, repositories in categorized.items():
            anchor = _anchor("language", category)
            lines.extend([f'<a id="{anchor}"></a>', "", f"## {category}", ""])
            for repo in repositories:
                description = _clean_inline_text(repo.description)
                suffix = f" — {description}" if description else ""
                archived = " `Archived`" if repo.is_archived else ""
                lines.append(
                    f"- [{repo.full_name}]({repo.url}){archived}{suffix}"
                )
            lines.append("")

        return "\n".join(lines)


class MarkdownTopicRenderer(IRenderer):
    """Render a complete many-to-many Topic index."""

    def render(
        self,
        categorized: Dict[str, List[Repository]],
        title: str = "Andy87877 的 GitHub Stars（依 Topic）",
        metadata: Optional[Mapping[str, Any]] = None,
    ) -> str:
        metadata = metadata or {}
        total_topics = int(metadata.get("totalTopicCount") or len(categorized))
        focused_topics = int(metadata.get("focusedTopicCount") or len(categorized))
        minimum_count = int(metadata.get("topicMinimumRepositoryCount") or 2)
        maximum_categories = int(
            metadata.get("topicMaximumCategories") or focused_topics
        )
        lines = [
            f"# {title}",
            "",
            f"> 自動產生於 `{metadata.get('generatedAt', '尚未同步')}`。"
            f"原始資料共有 **{total_topics}** 個 Topics；本頁只顯示 "
            f"**{focused_topics}** 個聚焦 Topics。",
            "",
            "為避免一次性標籤淹沒重點，聚焦目錄只保留至少出現在 "
            f"**{minimum_count}** 個收藏中的 Topics，並依涵蓋專案數排序，"
            f"最多顯示 **{maximum_categories}** 個。所有原始 Topics 仍完整保留於 "
            "`data/stars.json`，網站全文搜尋也能找到。",
            "",
            "同一專案可同時出現在多個 Topic，這是多對多分類的正常結果。",
            "",
            "## 聚焦 Topic 目錄",
            "",
        ]
        for category, repositories in categorized.items():
            anchor = _anchor("topic", category)
            lines.append(f"- [{category}（{len(repositories)}）](#{anchor})")

        lines.extend(["", "---", ""])
        for category, repositories in categorized.items():
            anchor = _anchor("topic", category)
            lines.extend([f'<a id="{anchor}"></a>', "", f"## {category}", ""])
            for repo in repositories:
                description = _clean_inline_text(repo.description)
                suffix = f" — {description}" if description else ""
                lines.append(f"- [{repo.full_name}]({repo.url}){suffix}")
            lines.append("")
        return "\n".join(lines)


class JSONDatasetRenderer(IRenderer):
    """Render a de-duplicated repository array for the Web application."""

    def render(
        self,
        categorized: Dict[str, List[Repository]],
        title: str = "",
        metadata: Optional[Mapping[str, Any]] = None,
    ) -> str:
        seen_full_names: set[str] = set()
        unique_repositories: List[Repository] = []
        for repositories in categorized.values():
            for repository in repositories:
                if repository.full_name not in seen_full_names:
                    seen_full_names.add(repository.full_name)
                    unique_repositories.append(repository)
        unique_repositories.sort(
            key=lambda repository: repository.starred_at or "", reverse=True
        )
        return json.dumps(
            [repository.to_dict() for repository in unique_repositories],
            indent=2,
            ensure_ascii=False,
        )


class SyncMetadataRenderer:
    """Render synchronization provenance consumed by the website."""

    def render(self, metadata: Mapping[str, Any]) -> str:
        return json.dumps(dict(metadata), indent=2, ensure_ascii=False)
