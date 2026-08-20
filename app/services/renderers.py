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


def _build_visualizations(metadata: Mapping[str, Any]) -> List[str]:
    """Generate Markdown Mermaid charts, stat badges, and progress bar tables."""
    analytics = metadata.get("analytics")
    if not analytics or not isinstance(analytics, dict):
        return []

    lines = [
        "## 📊 數據圖表與統計視覺化",
        "",
    ]

    # 1. Mermaid Pie Chart for Top 10 Languages
    breakdown = analytics.get("languageBreakdown", {})
    if breakdown:
        top_langs = list(breakdown.items())[:10]
        lines.extend([
            "### 程式語言分佈 (Top 10)",
            "",
            "```mermaid",
            "pie title 程式語言分佈 Top 10",
        ])
        for lang, data in top_langs:
            cnt = data.get("count", 0)
            clean_lang = lang.replace('"', "'")
            lines.append(f'    "{clean_lang}" : {cnt}')
        lines.extend(["```", ""])

    # 2. Mermaid Pie Chart for Top 10 Topics
    top_topics = analytics.get("topTopics", [])
    if top_topics:
        lines.extend([
            "### 熱門 Topic 覆蓋 Top 10",
            "",
            "```mermaid",
            "pie title 熱門 Topic 覆蓋 Top 10",
        ])
        for item in top_topics[:10]:
            tpc = item.get("topic", "")
            cnt = item.get("count", 0)
            clean_tpc = tpc.replace('"', "'")
            lines.append(f'    "{clean_tpc}" : {cnt}')
        lines.extend(["```", ""])

    # 3. Progress Bar Table for Top 10 Languages
    if breakdown:
        lines.extend([
            "### 主要語言佔比長條圖",
            "",
            "| 程式語言 | 專案數量 | 佔比比例 | 視覺化進度條 |",
            "| :--- | :---: | :---: | :--- |",
        ])
        for lang, data in list(breakdown.items())[:10]:
            cnt = data.get("count", 0)
            pct = data.get("percentage", 0.0)
            bar_len = int(round(pct / 5.0))
            bar_str = "█" * max(1, bar_len) if cnt > 0 else "░"
            lines.append(f"| **{lang}** | {cnt} | {pct:.1f}% | `{bar_str}` |")
        lines.append("")

    return lines


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
        delta_str = str(metadata.get("formattedDelta") or "0")
        generated_at = metadata.get("generatedAt", "尚未同步")
        formatted_updated_at = metadata.get("formattedUpdatedAt", generated_at)
        profile_url = metadata.get(
            "profileUrl", "https://github.com/Andy87877?tab=stars"
        )
        date_badge_str = (generated_at[:10] if len(generated_at) >= 10 else "2026-08-20")

        lines = [
            f"# {title}",
            "",
            (
                f"> 收錄 **{count}** 個公開 Star（較前次 **{delta_str}**）；"
                f"資料快照：`{formatted_updated_at}`。"
                f"來源：[Andy87877 的 GitHub Stars]({profile_url})。"
            ),
            "",
            (
                f"[![Total Stars](https://img.shields.io/badge/Total_Stars-{count}_%E2%AD%90-blue)]({profile_url}) "
                f"![Delta](https://img.shields.io/badge/Change-{delta_str.replace('+', '%2B')}-orange) "
                f"![Last Updated](https://img.shields.io/badge/Updated-{date_badge_str}-brightgreen)"
            ),
            "",
            "這是一個不需要資料庫的 GitHub Star 個人知識庫：Python 同步器負責"
            "抓取與產生靜態資料，網站則提供即時搜尋、聚焦 Topic、語言篩選、"
            "Table（預設）／Cards 雙模式、最愛 ⭐ 標註、動態分頁、數據分析 Dashboard、"
            "排序、本機研究筆記與 CSV 匯出。",
            "",
        ]

        # Add visual diagrams and progress bar tables
        lines.extend(_build_visualizations(metadata))

        lines.extend([
            "## 資料即時性與數據分析",
            "",
            "- 網站開啟時先顯示版本庫快照，再讀取 GitHub 公開 REST API 更新畫面；"
            "若 API 暫時不可用，會清楚標示目前仍是快照。",
            "- 點擊導覽列「📊 數據分析」可開啟數據 Dashboard，以視覺化圖表與進度條檢視"
            "程式語言分佈 (Top 10)、熱門 Topics (Top 15) 與 Star 年度收藏趨勢。",
            "- `Refresh GitHub Stars snapshot` workflow 每日 03:00（Asia/Taipei）及"
            "手動觸發同步本 README、`topic.md` 與 `web/data/stars.json`。",
            "- 每次 push／pull request 都先執行 Robot 驗收；`main` 驗證成功"
            "後才打包純靜態網站並部署 GitHub Pages。",
            "- 同步採失敗關閉策略：API 錯誤、分頁不完整或取得 0 筆時，不會覆寫"
            "上一份有效資料。",
            "- Topic 導航只顯示至少重複 2 次的前 30 個高頻標籤；未命中這些"
            "聚焦標籤的 repositories 統一收進最底下的 `other`，原始標籤仍完整"
            "保留在 JSON 與網站全文搜尋。",
            "",
            "## 特別感謝",
            "",
            "特別感謝 [goodjack/stars](https://github.com/goodjack/stars) 提供 "
            "GitHub Stars 自動擷取、分類並產生 Markdown 清單的實作靈感，讓我有"
            "這個專案的寫法；本專案再延伸為 OOP／SOLID／MVC 架構、Table 優先"
            "網站、數據分析 Dashboard、即時資料狀態與 Robot Framework 驗收。",
            "",
            "## 使用方式",
            "",
            "```powershell",
            "python -m pip install -r config/requirements.txt",
            "python main.py --username Andy87877",
            "python main.py --serve",
            "python main.py --analytics",
            "python main.py --export csv",
            "```",
            "",
            "瀏覽 `http://127.0.0.1:8000`。執行 Robot Framework 驗收測試：",
            "",
            "```powershell",
            "python -m robot --outputdir artifacts/robot-reports tests",
            "```",
            "",
            "## 架構摘要",
            "",
            "- Python：`Repository` Model、`AnalyticsCalculator` (SRP 數據計算服務)、"
            "可替換 GitHub Client／分類／渲染策略、`SyncController`、原子檔案發布器。",
            "- JavaScript：`StarModel`、`StarView`、`StarController` 前端 MVC，支援最愛⭐標註、"
            "動態分頁與 📊 數據分析 Dashboard。",
            "- 詳細設計、演進、待辦與協作規範分別見 `docs/architecture.md`、"
            "`docs/iterate.md`、`docs/task.md`、`docs/AGENT.md`。",
            "",
            "## 依主要語言瀏覽",
            "",
        ])

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
        other_category = str(metadata.get("topicOtherCategory") or "other")
        focused_topics = int(
            metadata.get(
                "focusedTopicCount",
                sum(category != other_category for category in categorized),
            )
        )
        other_count = int(
            metadata.get(
                "otherRepositoryCount",
                len(categorized.get(other_category, [])),
            )
        )
        minimum_count = int(metadata.get("topicMinimumRepositoryCount") or 2)
        maximum_categories = int(
            metadata.get("topicMaximumCategories") or focused_topics
        )
        lines = [
            f"# {title}",
            "",
            f"> 自動產生於 `{metadata.get('generatedAt', '尚未同步')}`。"
            f"原始資料共有 **{total_topics}** 個 Topics；本頁只顯示 "
            f"**{focused_topics}** 個聚焦 Topics，再加上最底下的 "
            f"`{other_category}`（**{other_count}** 個 repositories）。",
            "",
            "為避免一次性標籤淹沒重點，聚焦目錄只保留至少出現在 "
            f"**{minimum_count}** 個收藏中的 Topics，並依涵蓋專案數排序，"
            f"最多顯示 **{maximum_categories}** 個。所有原始 Topics 仍完整保留於 "
            "`web/data/stars.json`，網站全文搜尋也能找到。",
            "",
            f"`{other_category}` 只收納沒有命中任何聚焦 Topic 的 repositories，"
            "每個 repository 在該區只出現一次。同一專案仍可同時出現在多個"
            "聚焦 Topic，這是多對多分類的正常結果。",
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
