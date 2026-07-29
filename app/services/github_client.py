"""GitHub API clients used by the synchronization pipeline.

The high-level controller depends on ``IGitHubClient`` rather than a concrete
transport.  Live clients fail closed: an incomplete API response raises an
exception instead of returning a partial list that could overwrite good data.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, List, Optional

import requests

from app.models.repository import Repository


class GitHubClientError(RuntimeError):
    """Raised when GitHub data cannot be fetched completely and safely."""


class IGitHubClient(ABC):
    """Small read-only interface for fetching a user's starred repositories."""

    source_name = "unknown"

    @abstractmethod
    def fetch_starred_repositories(
        self, username: str, limit: Optional[int] = None
    ) -> List[Repository]:
        """Return a complete, newest-first list of starred repositories."""


class GitHubRESTClient(IGitHubClient):
    """Fetch public Stars through GitHub's REST API.

    The Star media type returns ``starred_at`` together with the repository
    object.  This makes the unauthenticated fallback semantically equivalent to
    the GraphQL client for the fields used by this project.
    """

    source_name = "GitHub REST API"

    def __init__(
        self,
        token: Optional[str] = None,
        session: Optional[requests.Session] = None,
        timeout_seconds: int = 20,
    ) -> None:
        self.token = token
        self.base_url = "https://api.github.com"
        self.session = session or requests.Session()
        self.timeout_seconds = timeout_seconds

    def _headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.star+json",
            "User-Agent": "Andy87877-GitHub-Star-Manager",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def fetch_starred_repositories(
        self, username: str, limit: Optional[int] = None
    ) -> List[Repository]:
        repositories: List[Repository] = []
        page = 1
        per_page = min(limit or 100, 100)

        while True:
            url = f"{self.base_url}/users/{username}/starred"
            try:
                response = self.session.get(
                    url,
                    params={"per_page": per_page, "page": page},
                    headers=self._headers(),
                    timeout=self.timeout_seconds,
                )
            except requests.RequestException as exc:
                raise GitHubClientError(
                    f"GitHub REST request failed on page {page}: {exc}"
                ) from exc

            if response.status_code != 200:
                remaining = response.headers.get("X-RateLimit-Remaining", "unknown")
                raise GitHubClientError(
                    "GitHub REST API returned "
                    f"HTTP {response.status_code} on page {page} "
                    f"(rate remaining: {remaining})."
                )

            try:
                items = response.json()
            except ValueError as exc:
                raise GitHubClientError(
                    f"GitHub REST API returned invalid JSON on page {page}."
                ) from exc

            if not isinstance(items, list):
                raise GitHubClientError(
                    f"GitHub REST API returned an unexpected payload on page {page}."
                )
            if not items:
                break

            for entry in items:
                if not isinstance(entry, dict):
                    raise GitHubClientError(
                        f"GitHub REST API returned an invalid item on page {page}."
                    )

                # Star media type: {"starred_at": "...", "repo": {...}}.
                # The fallback accepts a plain repository payload for test
                # doubles and forward compatibility.
                item: dict[str, Any] = entry.get("repo", entry)
                starred_at = entry.get("starred_at", "")
                owner = item.get("owner") or {}
                owner_login = owner.get("login", "")
                name = item.get("name", "")
                full_name = item.get("full_name", f"{owner_login}/{name}")
                html_url = item.get("html_url", "")

                if not full_name or not html_url:
                    raise GitHubClientError(
                        f"GitHub REST API returned an incomplete repository on page {page}."
                    )

                repositories.append(
                    Repository(
                        name=name,
                        owner=owner_login,
                        full_name=full_name,
                        url=html_url,
                        description=item.get("description") or "",
                        language=item.get("language") or "Others",
                        topics=list(item.get("topics") or []),
                        stars=int(item.get("stargazers_count") or 0),
                        forks=int(item.get("forks_count") or 0),
                        is_archived=bool(item.get("archived", False)),
                        starred_at=starred_at,
                        updated_at=item.get("updated_at") or "",
                    )
                )

                if limit and len(repositories) >= limit:
                    return repositories[:limit]

            if len(items) < per_page:
                break
            page += 1

        return repositories


class GitHubGraphQLClient(IGitHubClient):
    """Fetch Stars through GitHub GraphQL when a token is available."""

    source_name = "GitHub GraphQL API"

    def __init__(
        self,
        token: str,
        session: Optional[requests.Session] = None,
        timeout_seconds: int = 20,
    ) -> None:
        if not token:
            raise ValueError("GitHubGraphQLClient requires a token.")
        self.token = token
        self.graphql_url = "https://api.github.com/graphql"
        self.session = session or requests.Session()
        self.timeout_seconds = timeout_seconds

    def fetch_starred_repositories(
        self, username: str, limit: Optional[int] = None
    ) -> List[Repository]:
        query = """
        query ($username: String!, $after: String) {
          user(login: $username) {
            starredRepositories(
              first: 100
              after: $after
              orderBy: {field: STARRED_AT, direction: DESC}
            ) {
              edges {
                starredAt
                node {
                  name
                  nameWithOwner
                  owner { login }
                  url
                  description
                  stargazerCount
                  forkCount
                  isArchived
                  updatedAt
                  primaryLanguage { name }
                  repositoryTopics(first: 100) {
                    nodes { topic { name } }
                  }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
        """
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "User-Agent": "Andy87877-GitHub-Star-Manager",
        }
        repositories: List[Repository] = []
        end_cursor: Optional[str] = None

        while True:
            try:
                response = self.session.post(
                    self.graphql_url,
                    json={
                        "query": query,
                        "variables": {"username": username, "after": end_cursor},
                    },
                    headers=headers,
                    timeout=self.timeout_seconds,
                )
            except requests.RequestException as exc:
                raise GitHubClientError(f"GitHub GraphQL request failed: {exc}") from exc

            if response.status_code != 200:
                raise GitHubClientError(
                    f"GitHub GraphQL API returned HTTP {response.status_code}."
                )

            try:
                body = response.json()
            except ValueError as exc:
                raise GitHubClientError("GitHub GraphQL returned invalid JSON.") from exc

            if body.get("errors"):
                raise GitHubClientError(
                    f"GitHub GraphQL returned errors: {body['errors']}"
                )

            user = (body.get("data") or {}).get("user")
            if user is None:
                raise GitHubClientError(f"GitHub user '{username}' was not found.")

            connection = user.get("starredRepositories") or {}
            for edge in connection.get("edges") or []:
                node = edge.get("node") or {}
                topics = [
                    topic_node["topic"]["name"]
                    for topic_node in (node.get("repositoryTopics") or {}).get(
                        "nodes", []
                    )
                    if (topic_node.get("topic") or {}).get("name")
                ]
                primary_language = node.get("primaryLanguage") or {}
                repositories.append(
                    Repository(
                        name=node.get("name", ""),
                        owner=(node.get("owner") or {}).get("login", ""),
                        full_name=node.get("nameWithOwner", ""),
                        url=node.get("url", ""),
                        description=node.get("description") or "",
                        language=primary_language.get("name") or "Others",
                        topics=topics,
                        stars=int(node.get("stargazerCount") or 0),
                        forks=int(node.get("forkCount") or 0),
                        is_archived=bool(node.get("isArchived", False)),
                        starred_at=edge.get("starredAt") or "",
                        updated_at=node.get("updatedAt") or "",
                    )
                )
                if limit and len(repositories) >= limit:
                    return repositories[:limit]

            page_info = connection.get("pageInfo") or {}
            if not page_info.get("hasNextPage"):
                break
            end_cursor = page_info.get("endCursor")
            if not end_cursor:
                raise GitHubClientError(
                    "GitHub GraphQL indicated another page without a cursor."
                )

        return repositories


class MockGitHubClient(IGitHubClient):
    """Deterministic offline client used only by tests and demonstrations."""

    source_name = "Mock fixture"

    def fetch_starred_repositories(
        self, username: str, limit: Optional[int] = None
    ) -> List[Repository]:
        mock_data = [
            Repository(
                name="fastapi",
                owner="fastapi",
                full_name="fastapi/fastapi",
                url="https://github.com/fastapi/fastapi",
                description="FastAPI framework for production APIs",
                language="Python",
                topics=["python", "api", "fastapi"],
                stars=75_000,
                forks=6_200,
                starred_at="2026-07-20T10:00:00Z",
                updated_at="2026-07-28T15:30:00Z",
            ),
            Repository(
                name="react",
                owner="facebook",
                full_name="facebook/react",
                url="https://github.com/facebook/react",
                description="The library for web and native user interfaces.",
                language="JavaScript",
                topics=["javascript", "react", "frontend"],
                stars=220_000,
                forks=45_000,
                starred_at="2026-07-15T08:20:00Z",
                updated_at="2026-07-29T09:12:00Z",
            ),
            Repository(
                name="robotframework",
                owner="robotframework",
                full_name="robotframework/robotframework",
                url="https://github.com/robotframework/robotframework",
                description="Generic automation framework for acceptance testing and RPA",
                language="Python",
                topics=["python", "testing", "robotframework"],
                stars=10_500,
                forks=2_400,
                starred_at="2026-07-10T14:45:00Z",
                updated_at="2026-07-27T11:00:00Z",
            ),
        ]
        return mock_data[:limit] if limit else mock_data


class GitHubClientFactory:
    """Create a live or deterministic client without leaking transport choices."""

    @staticmethod
    def create_client(
        client_type: str = "auto", token: Optional[str] = None
    ) -> IGitHubClient:
        normalized = client_type.lower()
        if normalized == "mock":
            return MockGitHubClient()
        if normalized == "rest":
            return GitHubRESTClient(token=token)
        if normalized == "graphql":
            if not token:
                raise ValueError("--client graphql requires GITHUB_TOKEN.")
            return GitHubGraphQLClient(token=token)
        if normalized == "auto":
            return (
                GitHubGraphQLClient(token=token)
                if token
                else GitHubRESTClient(token=token)
            )
        raise ValueError(f"Unknown GitHub client type: {client_type}")
