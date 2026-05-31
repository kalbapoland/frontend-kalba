from __future__ import annotations

import os
import subprocess
import sys
import traceback
from pathlib import Path

from run_android_smoke import (
    AUTOFILL_SERVICE_SETTING,
    disable_android_autofill,
    get_secure_setting,
    restore_android_autofill,
    resolve_adb,
)
from run_android_smoke_ephemeral_db import (
    resolve_tool,
    start_backend_process,
    start_ephemeral_postgres,
    stop_backend_process,
    stop_ephemeral_postgres,
    wait_for_backend_health,
)

TIMEZONE = "Europe/Warsaw"
ANDROID_SMOKE_BUILD_SCRIPT = "android:smoke-build"


def require_directory_env(name: str) -> Path:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is required. Set it to the repository root path.")

    directory = Path(value).expanduser().resolve()
    if not directory.is_dir():
        raise RuntimeError(f"{name} must point to an existing directory: {directory}")

    return directory


def run(command: list[str], *, cwd: Path, env: dict[str, str] | None = None) -> None:
    subprocess.run(command, cwd=str(cwd), env=env, check=True)


def run_script(script_path: Path, *args: str) -> None:
    run([sys.executable, str(script_path), *args], cwd=script_path.parent)


def resolve_npm() -> str:
    candidates = ["npm.cmd", "npm"] if os.name == "nt" else ["npm"]
    for candidate in candidates:
        try:
            return resolve_tool(candidate)
        except RuntimeError:
            continue
    raise RuntimeError("npm not found in PATH")


def main() -> None:
    frontend_root = require_directory_env("KALBA_FRONTEND_DIR")
    backend_root = require_directory_env("KALBA_BACKEND_DIR")

    script_dir = frontend_root / "test" / "automated"
    create_avd_script = script_dir / "create_android_simulator.py"
    start_avd_script = script_dir / "start_android_simulator.py"
    destroy_avd_script = script_dir / "destroy_android_simulator.py"

    docker = resolve_tool("docker")
    uv = resolve_tool("uv")
    npm = resolve_npm()
    maestro = resolve_tool("maestro")
    adb = resolve_adb()

    ephemeral_db = None
    backend_process = None
    avd_created = False
    previous_autofill_service = None
    primary_error: BaseException | None = None
    cleanup_errors: list[Exception] = []

    try:
        run_script(create_avd_script, "--force")
        avd_created = True

        run_script(start_avd_script, "--timezone", TIMEZONE)

        ephemeral_db = start_ephemeral_postgres(docker)

        backend_env = dict(os.environ)
        backend_env["DATABASE_URL"] = ephemeral_db.database_url
        backend_env["APP_ENV"] = "local"

        run([uv, "run", "alembic", "upgrade", "head"], cwd=backend_root, env=backend_env)
        run(
            [uv, "run", "python", "tests/automated/ensure_smoke_trainer.py", "--reset-password"],
            cwd=backend_root,
            env=backend_env,
        )

        backend_process = start_backend_process(backend_root, ephemeral_db.database_url, uv)

        previous_autofill_service = get_secure_setting(
            adb, AUTOFILL_SERVICE_SETTING, frontend_root
        )
        disable_android_autofill(adb, frontend_root)
        run([adb, "reverse", "tcp:8000", "tcp:8000"], cwd=frontend_root)

        run([npm, "run", ANDROID_SMOKE_BUILD_SCRIPT], cwd=frontend_root)

        wait_for_backend_health()

        frontend_env = dict(os.environ)
        frontend_env["DATABASE_URL"] = ephemeral_db.database_url
        frontend_env["APP_ENV"] = "local"

        run(
            [
                maestro,
                "test",
                "test/automated/maestro/flows/smoke/android_trainer_smoke.yaml",
            ],
            cwd=frontend_root,
            env=frontend_env,
        )
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/android_user_smoke.yaml"],
            cwd=frontend_root,
            env=frontend_env,
        )
    except BaseException as err:
        primary_error = err
    finally:
        try:
            stop_backend_process(backend_process)
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

        if ephemeral_db is not None:
            try:
                stop_ephemeral_postgres(docker, ephemeral_db.container_name)
            except Exception as cleanup_err:
                cleanup_errors.append(cleanup_err)

        if avd_created:
            try:
                run_script(destroy_avd_script)
            except Exception as cleanup_err:
                cleanup_errors.append(cleanup_err)

    if primary_error is not None:
        if cleanup_errors:
            print("Cleanup finished with warnings:", file=sys.stderr)
            for cleanup_err in cleanup_errors:
                print(f"  - {cleanup_err}", file=sys.stderr)
        raise primary_error

    if cleanup_errors:
        print("Cleanup finished with warnings:", file=sys.stderr)
        for cleanup_err in cleanup_errors:
            print(f"  - {cleanup_err}", file=sys.stderr)
            traceback.print_exception(cleanup_err, file=sys.stderr)
        raise RuntimeError("Smoke run completed but cleanup reported errors")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as err:
        print(err, file=sys.stderr)
        raise SystemExit(1)