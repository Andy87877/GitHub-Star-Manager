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
            return self.selection_policy.select(categorized)
        if self.sort_categories:
            return OrderedDict(
                sorted(categorized.items(), key=lambda item: item[0].lower())
            )
        return categorized


class ITopicSelectionPolicy(ABC):
    """Policy interface for choosing which Topic groups deserve navigation."""

    @abstractmethod
    def select(
        self, categorized: Dict[str, List[Repository]]
    ) -> Dict[str, List[Repository]]:
        """Return a presentation-focused subset without mutating raw data."""


class FocusedTopicPolicy(ITopicSelectionPolicy):
    """Keep repeated, high-signal Topics ordered by repository coverage."""

    def __init__(
        self,
        minimum_repository_count: int = 2,
        maximum_categories: int = 30,
        excluded_categories: Optional[List[str]] = None,
    ):
        if minimum_repository_count < 1:
            raise ValueError("minimum_repository_count must be at least 1")
        if maximum_categories < 1:
            raise ValueError("maximum_categories must be at least 1")
        self.minimum_repository_count = minimum_repository_count
        self.maximum_categories = maximum_categories
        self.excluded_categories = set(excluded_categories or ["others"])

    def select(
        self, categorized: Dict[str, List[Repository]]
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
        return OrderedDict(eligible[: self.maximum_categories])
