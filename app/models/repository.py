"""
Domain models for GitHub Star Manager.
Implements SRP (Single Responsibility Principle) for repository & category domain logic.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class Repository:
    """Represents a starred GitHub Repository."""
    name: str
    owner: str
    full_name: str
    url: str
    description: str = ""
    language: str = "Others"
    topics: List[str] = field(default_factory=list)
    stars: int = 0
    forks: int = 0
    is_archived: bool = False
    starred_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Converts the repository instance to a dictionary for JSON serialization."""
        return {
            "name": self.name,
            "owner": self.owner,
            "fullName": self.full_name,
            "url": self.url,
            "description": self.description or "",
            "language": self.language or "Others",
            "topics": self.topics or [],
            "stars": self.stars,
            "forks": self.forks,
            "isArchived": self.is_archived,
            "starredAt": self.starred_at,
            "updatedAt": self.updated_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Repository':
        """Constructs a Repository object from a dictionary."""
        return cls(
            name=data.get("name", ""),
            owner=data.get("owner", ""),
            full_name=data.get("fullName", data.get("full_name", "")),
            url=data.get("url", ""),
            description=data.get("description", ""),
            language=data.get("language") or "Others",
            topics=data.get("topics", []),
            stars=data.get("stars", 0),
            forks=data.get("forks", 0),
            is_archived=data.get("isArchived", data.get("is_archived", False)),
            starred_at=data.get("starredAt", data.get("starred_at", "")),
            updated_at=data.get("updatedAt", data.get("updated_at", ""))
        )
