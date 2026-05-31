from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

APP_ID = "com.kalba.app"
BACKEND_CLEANUP_SCRIPT = Path("tests/automated/seed_mobile_e2e_fixtures.py")


def run(command: list[str], cwd: Path) -> None:
    subprocess.run(command, cwd=str(cwd), check=True)


def resolve_tool(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    raise RuntimeError(f"{name} not found in PATH")


def resolve_adb() -> str:
    adb_in_path = shutil.which("adb")
    if adb_in_path:
        return adb_in_path

    candidates: list[Path] = []
    android_home = os.getenv("ANDROID_HOME")
    if android_home:
        candidates.append(Path(android_home) / "platform-tools" / ("adb.exe" if os.name == "nt" else "adb"))

    android_sdk_root = os.getenv("ANDROID_SDK_ROOT")
    if android_sdk_root:
        candidates.append(Path(android_sdk_root) / "platform-tools" / ("adb.exe" if os.name == "nt" else "adb"))

    local_appdata = os.getenv("LOCALAPPDATA")
    if local_appdata:
        candidates.append(Path(local_appdata) / "Android" / "Sdk" / "platform-tools" / "adb.exe")

    home = Path.home()
    candidates.append(home / "Library" / "Android" / "sdk" / "platform-tools" / "adb")

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    raise RuntimeError("adb not found. Install Android platform-tools or add adb to PATH.")


def cleanup_backend_fixtures(backend_root: Path, python_exe: str) -> None:
    run([python_exe, "run", "python", str(BACKEND_CLEANUP_SCRIPT), "--cleanup"], cwd=backend_root)


def install_release_build(frontend_root: Path) -> None:
    gradlew = frontend_root / "android" / ("gradlew.bat" if os.name == "nt" else "gradlew")
    if not gradlew.exists():
        raise RuntimeError("Android Gradle wrapper not found. Cannot install release build for smoke tests.")

    run([str(gradlew), "installRelease"], cwd=frontend_root / "android")


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    frontend_root = script_dir.parent.parent
    backend_root = frontend_root.parent / "backend"
    uv_exe = resolve_tool("uv")

    maestro = resolve_tool("maestro")
    adb = resolve_adb()

    primary_error: BaseException | None = None
    try:
        run([adb, "reverse", "tcp:8000", "tcp:8000"], cwd=frontend_root)
        install_release_build(frontend_root)
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/android_trainer_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/android_user_smoke.yaml"],
            cwd=frontend_root,
        )
    except BaseException as err:
        primary_error = err
        raise
    finally:
        cleanup_errors: list[Exception] = []
        for command in ([adb, "shell", "pm", "clear", APP_ID],):
            try:
                run(command, cwd=frontend_root)
            except Exception as cleanup_err:
                cleanup_errors.append(cleanup_err)

        try:
            cleanup_backend_fixtures(backend_root, uv_exe)
        except Exception as cleanup_err:
            cleanup_errors.append(cleanup_err)

        try:
            run([adb, "reverse", "--remove-all"], cwd=frontend_root)
        except Exception as cleanup_err:
            cleanup_errors.append(cleanup_err)

        if cleanup_errors:
            print("Cleanup finished with warnings:", file=sys.stderr)
            for cleanup_err in cleanup_errors:
                print(f"  - {cleanup_err}", file=sys.stderr)
            if primary_error is None:
                raise cleanup_errors[0]


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as err:
        print(err, file=sys.stderr)
        raise SystemExit(1)
