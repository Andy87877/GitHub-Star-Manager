"""Command-line entry point for synchronization and local preview."""

from __future__ import annotations

import argparse
from functools import partial
import http.server
from pathlib import Path
import socketserver

from app.controllers.sync_controller import SyncController


PROJECT_ROOT = Path(__file__).resolve().parent
WEB_ROOT = PROJECT_ROOT / "web"


class ReusableThreadingTCPServer(socketserver.ThreadingTCPServer):
    """Responsive local preview server that can restart without port delays."""

    allow_reuse_address = True


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="GitHub Star Manager")
    parser.add_argument("--username", default="Andy87877")
    parser.add_argument(
        "--client",
        choices=("auto", "rest", "graphql", "mock"),
        default="auto",
        help="GitHub transport; auto uses GraphQL only when GITHUB_TOKEN exists.",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Compatibility alias for --client mock; never use for publication.",
    )
    parser.add_argument("--output-dir", default=str(PROJECT_ROOT))
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    return parser


def serve(host: str, port: int) -> None:
    handler = partial(
        http.server.SimpleHTTPRequestHandler, directory=str(WEB_ROOT)
    )
    with ReusableThreadingTCPServer((host, port), handler) as server:
        print(f"[OK] Preview: http://{host}:{port} (Ctrl+C to stop)")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n[*] Preview stopped.")


def main() -> int:
    args = build_parser().parse_args()
    if args.serve:
        serve(args.host, args.port)
        return 0

    client_type = "mock" if args.mock else args.client
    controller = SyncController(client_type=client_type)
    result = controller.sync(username=args.username, output_dir=args.output_dir)
    print(
        f"[OK] Sync complete: {result['count']} repositories "
        f"at {result['generatedAt']}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
