"""Application controller for the GitHub Stars ETL pipeline."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional
import os

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
        topics_file: str = "topics.md",
        data_file: str = "data/stars.json",
        metadata_file: str = "data/sync-meta.json",
        allow_empty: bool = False,
    ) -> Dict[str, Any]:
        """Run the complete sync and publish only a validated dataset."""

        print(f"[*] Starting GitHub Star sync for '{username}'...")
        repositories = self.client.fetch_starred_repositories(username)
        if not repositories and not allow_empty:
            raise EmptyDatasetError(
                "GitHub returned zero repositories; existing outputs were preserved."
            )

        generated_at = (
            datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        )
        metadata: Dict[str, Any] = {
            "username": username,
            "profileUrl": f"https://github.com/{username}?tab=stars",
            "generatedAt": generated_at,
            "repositoryCount": len(repositories),
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
            "topicMinimumRepositoryCount":
                self.topic_policy.minimum_repository_count,
            "topicMaximumCategories": self.topic_policy.maximum_categories,
        }

        by_language = self.language_categorizer.categorize(repositories)
        by_topic = self.topic_categorizer.categorize(repositories)
        metadata["focusedTopicCount"] = len(by_topic)
        generated_files = {
            readme_file: self.language_renderer.render(
                by_language, title=f"{username} 的 GitHub Stars", metadata=metadata
            ),
            topics_file: self.topic_renderer.render(
                by_topic,
                title=f"{username} 的 GitHub Stars（依 Topic）",
                metadata=metadata,
            ),
            data_file: self.dataset_renderer.render(by_language),
            metadata_file: self.metadata_renderer.render(metadata),
        }
        published_paths = self.publisher.publish(output_dir, generated_files)

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
