from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

APP_ID = "com.kalba.app"
BACKEND_CLEANUP_SCRIPT = Path("tests/automated/seed_mobile_e2e_fixtures.py")
BACKEND_ENSURE_TRAINER_SCRIPT = Path("tests/automated/ensure_smoke_trainer.py")
AUTOFILL_SERVICE_SETTING = "autofill_service"


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


def ensure_smoke_trainer_account(backend_root: Path, python_exe: str) -> None:
    run(
        [python_exe, "run", "python", str(BACKEND_ENSURE_TRAINER_SCRIPT), "--reset-password"],
        cwd=backend_root,
    )


def ensure_smoke_user_account(backend_root: Path, python_exe: str) -> None:
    run(
        [python_exe, "run", "python", "tests/automated/ensure_smoke_user.py", "--reset-password"],
        cwd=backend_root,
    )


def get_secure_setting(adb: str, setting_name: str, cwd: Path) -> str | None:
    result = subprocess.run(
        [adb, "shell", "settings", "get", "secure", setting_name],
        cwd=str(cwd),
        check=True,
        capture_output=True,
        text=True,
    )
    value = result.stdout.strip()
    if not value or value.lower() == "null":
        return None
    return value


def disable_android_autofill(adb: str, cwd: Path) -> str | None:
    previous_value = get_secure_setting(adb, AUTOFILL_SERVICE_SETTING, cwd)
    run([adb, "shell", "settings", "put", "secure", AUTOFILL_SERVICE_SETTING, "null"], cwd=cwd)
    return previous_value


def restore_android_autofill(adb: str, cwd: Path, previous_value: str | None) -> None:
    if previous_value is None:
        run([adb, "shell", "settings", "delete", "secure", AUTOFILL_SERVICE_SETTING], cwd=cwd)
        return

    run([adb, "shell", "settings", "put", "secure", AUTOFILL_SERVICE_SETTING, previous_value], cwd=cwd)


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
    previous_autofill_service = get_secure_setting(adb, AUTOFILL_SERVICE_SETTING, frontend_root)

    primary_error: BaseException | None = None
    try:
        disable_android_autofill(adb, frontend_root)
        run([adb, "reverse", "tcp:8000", "tcp:8000"], cwd=frontend_root)
        ensure_smoke_trainer_account(backend_root, uv_exe)
        ensure_smoke_user_account(backend_root, uv_exe)
        install_release_build(frontend_root)
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_negative_login_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/trainer_create_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/trainer_edit_workshop_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_group_subscribe_enroll_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_home_workshops_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_workshop_unenroll_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_group_unsubscribe_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/trainer_edit_group_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/trainer_delete_workshop_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/trainer_delete_group_smoke.yaml"],
            cwd=frontend_root,
        )

        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_signout_smoke.yaml"],
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
            run([adb, "reverse", "--remove", "tcp:8000"], cwd=frontend_root)
        except Exception as cleanup_err:
            cleanup_errors.append(cleanup_err)

        try:
            restore_android_autofill(adb, frontend_root, previous_autofill_service)
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
