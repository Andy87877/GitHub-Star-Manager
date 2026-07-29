"""
Categorization Strategies for Repositories.
Implements Strategy Pattern, OCP (Open/Closed Principle) & LSP (Liskov Substitution Principle).
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from collections import defaultdict, OrderedDict
from app.models.repository import Repository


class ICategorizer(ABC):
    """Abstract Strategy Interface for repository categorization."""

    @abstractmethod
    def categorize(self, repositories: List[Repository]) -> Dict[str, List[Repository]]:
        """Categorizes a list of repositories and returns a dictionary of categories."""
        pass


class LanguageCategorizer(ICategorizer):
    """Categorizes repositories by primary programming language."""

    def __init__(self, sort_categories: bool = True):
        self.sort_categories = sort_categories

    def categorize(self, repositories: List[Repository]) -> Dict[str, List[Repository]]:
        grouped = defaultdict(list)
        for repo in repositories:
            lang = repo.language if repo.language else "Others"
            grouped[lang].append(repo)

        if self.sort_categories:
            return OrderedDict(sorted(grouped.items(), key=lambda x: x[0].lower()))
        return dict(grouped)


class TopicCategorizer(ICategorizer):
    """Categorizes repositories by topics."""

    def __init__(
        self,
        sort_categories: bool = True,
        default_topic: str = "others",
        selection_policy: Optional["ITopicSelectionPolicy"] = None,
    ):
        self.sort_categories = sort_categories
        self.default_topic = default_topic
        self.selection_policy = selection_policy

    def categorize(self, repositories: List[Repository]) -> Dict[str, List[Repository]]:
        grouped = defaultdict(list)
        for repo in repositories:
            if not repo.topics:
                grouped[self.default_topic].append(repo)
            else:
                for topic in repo.topics:
                    grouped[topic].append(repo)

        categorized = dict(grouped)
        if self.selection_policy:
            return self.selection_policy.select(categorized, repositories)
        if self.sort_categories:
            return OrderedDict(
                sorted(categorized.items(), key=lambda item: item[0].lower())
            )
        return categorized


class ITopicSelectionPolicy(ABC):
    """Policy interface for choosing which Topic groups deserve navigation."""

    @abstractmethod
    def select(
        self,
        categorized: Dict[str, List[Repository]],
        repositories: Optional[List[Repository]] = None,
    ) -> Dict[str, List[Repository]]:
        """Return a presentation-focused subset without mutating raw data."""


class FocusedTopicPolicy(ITopicSelectionPolicy):
    """Keep repeated, high-signal Topics ordered by repository coverage."""

    def __init__(
        self,
        minimum_repository_count: int = 2,
        maximum_categories: int = 30,
        excluded_categories: Optional[List[str]] = None,
        other_category: str = "other",
    ):
        if minimum_repository_count < 1:
            raise ValueError("minimum_repository_count must be at least 1")
        if maximum_categories < 1:
            raise ValueError("maximum_categories must be at least 1")
        if not other_category.strip():
            raise ValueError("other_category cannot be blank")
        self.minimum_repository_count = minimum_repository_count
        self.maximum_categories = maximum_categories
        self.other_category = other_category.strip()
        self.excluded_categories = set(
            excluded_categories or ["others", self.other_category]
        )

    def select(
        self,
        categorized: Dict[str, List[Repository]],
        repositories: Optional[List[Repository]] = None,
    ) -> Dict[str, List[Repository]]:
        eligible = [
            (topic, repositories)
            for topic, repositories in categorized.items()
            if topic not in self.excluded_categories
            and len(repositories) >= self.minimum_repository_count
        ]
        eligible.sort(
            key=lambda item: (-len(item[1]), item[0].lower())
        )
        selected = OrderedDict(eligible[: self.maximum_categories])
        focused_topics = set(selected)

        source_repositories = repositories or self._unique_repositories(categorized)
        other_repositories = []
        seen_full_names = set()
        for repository in source_repositories:
            if repository.full_name in seen_full_names:
                continue
            if any(topic in focused_topics for topic in repository.topics):
                continue
            seen_full_names.add(repository.full_name)
            other_repositories.append(repository)

        selected[self.other_category] = other_repositories
        return selected

    @staticmethod
    def _unique_repositories(
        categorized: Dict[str, List[Repository]]
    ) -> List[Repository]:
        """Recover a stable unique source list when callers omit it."""

        unique = OrderedDict()
        for grouped_repositories in categorized.values():
            for repository in grouped_repositories:
                unique.setdefault(repository.full_name, repository)
        return list(unique.values())
