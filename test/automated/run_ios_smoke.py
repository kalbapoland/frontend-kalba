from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

APP_ID = "com.kalba.app"
BACKEND_CLEANUP_SCRIPT = Path("tests/automated/seed_mobile_e2e_fixtures.py")
BACKEND_ENSURE_TRAINER_SCRIPT = Path("tests/automated/ensure_smoke_trainer.py")


def run(command: list[str], cwd: Path) -> None:
    subprocess.run(command, cwd=str(cwd), check=True)


def cleanup_backend_fixtures(backend_root: Path, uv_exe: str) -> None:
    run([uv_exe, "run", "python", str(BACKEND_CLEANUP_SCRIPT), "--cleanup"], cwd=backend_root)


def ensure_smoke_trainer_account(backend_root: Path, uv_exe: str) -> None:
    run(
        [uv_exe, "run", "python", str(BACKEND_ENSURE_TRAINER_SCRIPT), "--reset-password"],
        cwd=backend_root,
    )


def resolve_tool(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    raise RuntimeError(f"{name} not found in PATH")


def main() -> None:
    if sys.platform != "darwin":
        print("iOS smoke tests require macOS.", file=sys.stderr)
        raise SystemExit(1)

    script_dir = Path(__file__).resolve().parent
    frontend_root = script_dir.parent.parent
    backend_root = frontend_root.parent / "backend"

    maestro = resolve_tool("maestro")
    uv_exe = resolve_tool("uv")

    primary_error: BaseException | None = None
    try:
        ensure_smoke_trainer_account(backend_root, uv_exe)
        run([maestro, "test", "test/automated/maestro/flows/smoke/ios_smoke.yaml"], cwd=frontend_root)
    except BaseException as err:
        primary_error = err
        raise
    finally:
        cleanup_errors: list[Exception] = []

        if shutil.which("xcrun"):
            try:
                run(["xcrun", "simctl", "uninstall", "booted", APP_ID], cwd=frontend_root)
            except Exception as cleanup_err:
                cleanup_errors.append(cleanup_err)

        try:
            cleanup_backend_fixtures(backend_root, uv_exe)
        except Exception as cleanup_err:
            cleanup_errors.append(cleanup_err)

        if cleanup_errors:
            print("Cleanup finished with warnings:", file=sys.stderr)
            for cleanup_err in cleanup_errors:
                print(f"  - {cleanup_err}", file=sys.stderr)
            if primary_error is None:
                raise cleanup_errors[0]


if __name__ == "__main__":
    main()
