"""Application controller for the GitHub Stars ETL pipeline."""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
import json
import os

from app.services.analytics import AnalyticsCalculator
from app.services.categorizers import (
    FocusedTopicPolicy,
    LanguageCategorizer,
    TopicCategorizer,
)
from app.services.github_client import GitHubClientFactory, IGitHubClient
from app.services.publisher import AtomicFilePublisher, IOutputPublisher
from app.services.renderers import (
    JSONDatasetRenderer,
    MarkdownLanguageRenderer,
    MarkdownTopicRenderer,
    SyncMetadataRenderer,
)


class EmptyDatasetError(RuntimeError):
    """Raised to prevent an empty or failed fetch from replacing valid output."""


class SyncController:
    """Coordinate fetching, transforming, rendering, and safe publication."""

    def __init__(
        self,
        client: Optional[IGitHubClient] = None,
        client_type: str = "auto",
        publisher: Optional[IOutputPublisher] = None,
    ) -> None:
        token = os.environ.get("GITHUB_TOKEN")
        self.client = client or GitHubClientFactory.create_client(
            client_type=client_type, token=token
        )
        self.publisher = publisher or AtomicFilePublisher()
        self.language_categorizer = LanguageCategorizer(sort_categories=True)
        self.topic_policy = FocusedTopicPolicy(
            minimum_repository_count=2,
            maximum_categories=30,
        )
        self.topic_categorizer = TopicCategorizer(
            sort_categories=False,
            selection_policy=self.topic_policy,
        )
        self.language_renderer = MarkdownLanguageRenderer()
        self.topic_renderer = MarkdownTopicRenderer()
        self.dataset_renderer = JSONDatasetRenderer()
        self.metadata_renderer = SyncMetadataRenderer()

    def sync(
        self,
        username: str = "Andy87877",
        output_dir: str = ".",
        readme_file: str = "README.md",
        language_file: str = "language.md",
        data_file: str = "web/data/stars.json",
        metadata_file: str = "web/data/sync-meta.json",
        allow_empty: bool = False,
    ) -> Dict[str, Any]:
        """Run the complete sync and publish only a validated dataset."""

        print(f"[*] Starting GitHub Star sync for '{username}'...")
        repositories = self.client.fetch_starred_repositories(username)
        if not repositories and not allow_empty:
            raise EmptyDatasetError(
                "GitHub returned zero repositories; existing outputs were preserved."
            )

        now_utc = datetime.now(timezone.utc)
        generated_at = now_utc.replace(microsecond=0).isoformat()
        taipei_tz = timezone(timedelta(hours=8))
        now_taipei = now_utc.astimezone(taipei_tz)
        formatted_updated_at = now_taipei.strftime("%Y-%m-%d %H:%M:%S (UTC+8)")

        # Read existing metadata for delta calculation
        previous_count = None
        target_meta_path = os.path.join(output_dir, metadata_file)
        if os.path.exists(target_meta_path):
            try:
                with open(target_meta_path, "r", encoding="utf-8") as f:
                    old_meta = json.load(f)
                    if isinstance(old_meta, dict) and "repositoryCount" in old_meta:
                        previous_count = int(old_meta["repositoryCount"])
            except Exception:
                previous_count = None

        current_count = len(repositories)
        if previous_count is not None:
            delta_count = current_count - previous_count
            if delta_count > 0:
                formatted_delta = f"+{delta_count}"
            elif delta_count < 0:
                formatted_delta = str(delta_count)
            else:
                formatted_delta = "0"
        else:
            previous_count = current_count
            delta_count = 0
            formatted_delta = "0"

        analytics_data = AnalyticsCalculator.calculate(repositories)
        metadata: Dict[str, Any] = {
            "username": username,
            "profileUrl": f"https://github.com/{username}?tab=stars",
            "generatedAt": generated_at,
            "formattedUpdatedAt": formatted_updated_at,
            "repositoryCount": current_count,
            "previousRepositoryCount": previous_count,
            "deltaCount": delta_count,
            "formattedDelta": formatted_delta,
            "source": self.client.source_name,
            "isLiveSnapshot": self.client.source_name != "Mock fixture",
            "totalTopicCount": len(
                {
                    topic
                    for repository in repositories
                    for topic in repository.topics
                }
            ),
            "focusedTopicCount": 0,
            "otherRepositoryCount": 0,
            "topicMinimumRepositoryCount":
                self.topic_policy.minimum_repository_count,
            "topicMaximumCategories": self.topic_policy.maximum_categories,
            "topicOtherCategory": self.topic_policy.other_category,
            "analytics": analytics_data,
        }

        by_language = self.language_categorizer.categorize(repositories)
        by_topic = self.topic_categorizer.categorize(repositories)
        metadata["focusedTopicCount"] = sum(
            topic != self.topic_policy.other_category for topic in by_topic
        )
        metadata["otherRepositoryCount"] = len(
            by_topic.get(self.topic_policy.other_category, [])
        )
        # README.md displays Topic data; language.md displays Language data
        generated_files = {
            readme_file: self.topic_renderer.render(
                by_topic,
                title=f"{username} 的 GitHub Stars",
                metadata=metadata,
            ),
            language_file: self.language_renderer.render(
                by_language,
                title=f"{username} 的 GitHub Stars（依主要語言）",
                metadata=metadata,
            ),
            data_file: self.dataset_renderer.render(by_language),
            metadata_file: self.metadata_renderer.render(metadata),
        }
        published_paths = self.publisher.publish(output_dir, generated_files)

        # Remove legacy topic.md if present in output_dir
        old_topic_file = os.path.join(output_dir, "topic.md")
        if os.path.exists(old_topic_file):
            try:
                os.remove(old_topic_file)
            except OSError:
                pass

        print(
            f"[OK] Published {len(repositories)} repositories from "
            f"{self.client.source_name}."
        )
        return {
            **published_paths,
            "count": len(repositories),
            "generatedAt": generated_at,
            "source": self.client.source_name,
        }
