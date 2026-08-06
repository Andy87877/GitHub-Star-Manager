"""
Analytics calculator service for GitHub Star Manager.
Implements SRP (Single Responsibility Principle) for computing repository dataset metrics.
"""

from typing import List, Dict, Any, Optional
from collections import Counter, defaultdict
from app.models.repository import Repository


class AnalyticsCalculator:
    """Computes statistical metrics and distributions for repository collections."""

    @staticmethod
    def calculate(repositories: List[Repository]) -> Dict[str, Any]:
        """Calculates comprehensive analytics for the given repository list."""
        if not repositories:
            return {
                "totalCount": 0,
                "totalStars": 0,
                "totalForks": 0,
                "archivedCount": 0,
                "activeCount": 0,
                "languageBreakdown": {},
                "topTopics": [],
                "starredByYear": {},
            }

        total_count = len(repositories)
        total_stars = sum(repo.stars for repo in repositories)
        total_forks = sum(repo.forks for repo in repositories)
        archived_count = sum(1 for repo in repositories if repo.is_archived)
        active_count = total_count - archived_count

        # Language distribution
        lang_counter = Counter(repo.language or "Others" for repo in repositories)
        language_breakdown = {
            lang: {
                "count": count,
                "percentage": round((count / total_count) * 100, 1),
            }
            for lang, count in sorted(lang_counter.items(), key=lambda x: (-x[1], x[0]))
        }

        # Top Topics
        topic_counter: Counter = Counter()
        for repo in repositories:
            for topic in repo.topics:
                topic_counter[topic] += 1

        top_topics = [
            {"topic": topic, "count": count}
            for topic, count in sorted(topic_counter.items(), key=lambda x: (-x[1], x[0]))[:15]
        ]

        # Starred by Year
        year_counter: Counter = Counter()
        for repo in repositories:
            starred_at = repo.starred_at or ""
            if len(starred_at) >= 4 and starred_at[:4].isdigit():
                year_counter[starred_at[:4]] += 1
            else:
                year_counter["Unknown"] += 1

        starred_by_year = dict(sorted(year_counter.items(), key=lambda x: x[0]))

        return {
            "totalCount": total_count,
            "totalStars": total_stars,
            "totalForks": total_forks,
            "archivedCount": archived_count,
            "activeCount": active_count,
            "languageBreakdown": language_breakdown,
            "topTopics": top_topics,
            "starredByYear": starred_by_year,
        }
