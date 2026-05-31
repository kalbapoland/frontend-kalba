from __future__ import annotations

import subprocess
from pathlib import Path


def run(command: list[str], cwd: Path) -> None:
    subprocess.run(command, cwd=str(cwd), check=True)


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    frontend_root = script_dir.parent.parent
    workspace_root = frontend_root.parent
    backend_root = workspace_root / "backend"

    run(
        ["uv", "run", "python", "tests/automated/seed_mobile_e2e_fixtures.py", "--cleanup"],
        cwd=backend_root,
    )


if __name__ == "__main__":
    main()
