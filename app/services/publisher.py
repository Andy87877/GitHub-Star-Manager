"""Safe filesystem publication services."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Mapping
import os


class PublicationError(RuntimeError):
    """Raised when generated files cannot be published safely."""


class IOutputPublisher(ABC):
    """Interface used by the controller to publish generated artifacts."""

    @abstractmethod
    def publish(self, output_dir: str, files: Mapping[str, str]) -> dict[str, str]:
        """Publish relative file paths and return their absolute paths."""


class AtomicFilePublisher(IOutputPublisher):
    """Stage every file first, then atomically replace each target.

    All relative paths are constrained to ``output_dir`` so a caller cannot
    accidentally write outside the selected publication directory.
    """

    def publish(self, output_dir: str, files: Mapping[str, str]) -> dict[str, str]:
        root = Path(output_dir).resolve()
        root.mkdir(parents=True, exist_ok=True)
        staged: list[tuple[Path, Path]] = []

        try:
            for relative_path, content in files.items():
                target = (root / relative_path).resolve()
                if os.path.commonpath([str(root), str(target)]) != str(root):
                    raise PublicationError(
                        f"Refusing to publish outside output directory: {relative_path}"
                    )
                target.parent.mkdir(parents=True, exist_ok=True)
                with NamedTemporaryFile(
                    "w",
                    encoding="utf-8",
                    newline="\n",
                    dir=target.parent,
                    prefix=f".{target.name}.",
                    suffix=".tmp",
                    delete=False,
                ) as temp_file:
                    temp_file.write(content)
                    if content and not content.endswith("\n"):
                        temp_file.write("\n")
                    staged.append((Path(temp_file.name), target))

            for temporary, target in staged:
                os.replace(temporary, target)
        except Exception:
            for temporary, _ in staged:
                temporary.unlink(missing_ok=True)
            raise

        return {
            relative_path: str((root / relative_path).resolve())
            for relative_path in files
        }
