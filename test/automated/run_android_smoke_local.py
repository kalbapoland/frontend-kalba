from __future__ import annotations

import os
import subprocess
import sys
import time
import traceback
import re
from pathlib import Path

from run_android_smoke import (
    APP_ID,
    AUTOFILL_SERVICE_SETTING,
    disable_android_autofill,
    get_secure_setting,
    restore_android_autofill,
    resolve_adb,
)
from run_android_smoke_ephemeral_db import (
    BACKEND_PORT,
    resolve_tool,
    start_backend_process,
    start_ephemeral_postgres,
    stop_backend_process,
    stop_ephemeral_postgres,
    wait_for_backend_health,
)

TIMEZONE = "Europe/Warsaw"
ANDROID_SMOKE_BUILD_SCRIPT = "android:release:local"
EPHEMERAL_DB_CONTAINER_PREFIX = "kalba-smoke-pg-"
SMOKE_WORKSHOP_OFFSET_MINUTES = "1440"


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


def run_best_effort(command: list[str], *, cwd: Path) -> None:
    try:
        run(command, cwd=cwd)
    except Exception as err:
        print(f"[smoke] warning: command failed during best-effort cleanup: {command} ({err})")


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


def cleanup_stale_ephemeral_postgres(docker: str) -> None:
    try:
        result = subprocess.run(
            [docker, "ps", "-a", "--format", "{{.Names}}"],
            check=True,
            text=True,
            capture_output=True,
        )
    except Exception as err:
        print(f"[smoke] warning: unable to list existing Docker containers: {err}")
        return

    stale_containers = [
        name.strip()
        for name in result.stdout.splitlines()
        if name.strip().startswith(EPHEMERAL_DB_CONTAINER_PREFIX)
    ]
    if not stale_containers:
        return

    print(f"[smoke] removing stale ephemeral postgres containers: {', '.join(stale_containers)}")
    for container_name in stale_containers:
        subprocess.run([docker, "rm", "-f", container_name], check=False, capture_output=True, text=True)


def kill_processes_on_backend_port(port: int) -> None:
    if os.name != "nt":
        return

    result = subprocess.run(
        ["netstat", "-ano"],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return

    pid_pattern = re.compile(rf":{port}\s+[^\s]+\s+LISTENING\s+(\d+)")
    pids = sorted({match.group(1) for match in pid_pattern.finditer(result.stdout) if match.group(1) != "0"})
    if not pids:
        return

    print(f"[smoke] killing stale process(es) on port {port}: {', '.join(pids)}")
    for pid in pids:
        subprocess.run(["taskkill", "/PID", pid, "/F", "/T"], check=False, capture_output=True, text=True)


def verify_emulator_backend_connectivity(adb: str, frontend_root: Path) -> None:
    """Verify adb reverse tunnel is configured for the backend port.

    Android API 36 ships without wget/curl in the system shell, so we verify
    the tunnel via `adb reverse --list` on the host side instead of probing
    from inside the emulator. The backend health is already confirmed by
    wait_for_backend_health() before this call.
    """
    port_token = f"tcp:{BACKEND_PORT}"
    result = subprocess.run(
        [adb, "reverse", "--list"],
        cwd=str(frontend_root),
        capture_output=True,
        text=True,
        timeout=10,
    )
    if result.returncode != 0 or port_token not in result.stdout:
        raise RuntimeError(
            f"[smoke] preflight FAILED: adb reverse {port_token} not found in reverse list. "
            f"stdout={result.stdout!r} stderr={result.stderr!r}"
        )
    print(f"[smoke] preflight: adb reverse {port_token} confirmed")


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
        print("[smoke] cleaning stale state before run (emulator + db)")
        run_best_effort([sys.executable, str(destroy_avd_script)], cwd=script_dir)
        run_best_effort([adb, "reverse", "--remove", "tcp:8000"], cwd=frontend_root)
        cleanup_stale_ephemeral_postgres(docker)
        kill_processes_on_backend_port(BACKEND_PORT)

        print("[smoke] preparing Android emulator AVD")
        run_script(create_avd_script, "--force")
        avd_created = True

        print("[smoke] starting Android emulator and waiting for boot")
        run_script(start_avd_script, "--timezone", TIMEZONE)

        print("[smoke] starting ephemeral Postgres for smoke run")
        ephemeral_db = start_ephemeral_postgres(docker)

        backend_env = dict(os.environ)
        backend_env["DATABASE_URL"] = ephemeral_db.database_url
        backend_env["APP_ENV"] = "local"

        print("[smoke] running Alembic migrations")
        run([uv, "run", "alembic", "upgrade", "head"], cwd=backend_root, env=backend_env)

        print("[smoke] ensuring smoke trainer account exists")
        run(
            [uv, "run", "python", "tests/automated/ensure_smoke_trainer.py", "--reset-password"],
            cwd=backend_root,
            env=backend_env,
        )

        print("[smoke] ensuring smoke user account exists")
        run(
            [uv, "run", "python", "tests/automated/ensure_smoke_user.py", "--reset-password"],
            cwd=backend_root,
            env=backend_env,
        )

        print("[smoke] starting backend API server")
        backend_process = start_backend_process(backend_root, ephemeral_db.database_url, uv)

        print("[smoke] waiting for backend health check")
        wait_for_backend_health()

        print("[smoke] disabling Android autofill and configuring adb reverse")
        previous_autofill_service = get_secure_setting(
            adb, AUTOFILL_SERVICE_SETTING, frontend_root
        )
        disable_android_autofill(adb, frontend_root)
        run([adb, "reverse", "tcp:8000", "tcp:8000"], cwd=frontend_root)

        print("[smoke] preflight: verifying emulator can reach backend via adb reverse")
        verify_emulator_backend_connectivity(adb, frontend_root)

        print("[smoke] building and installing release APK on emulator")
        build_env = dict(os.environ)
        build_env["EXPO_PUBLIC_SMOKE_WORKSHOP_OFFSET_MINUTES"] = SMOKE_WORKSHOP_OFFSET_MINUTES
        run([npm, "run", ANDROID_SMOKE_BUILD_SCRIPT], cwd=frontend_root, env=build_env)

        frontend_env = dict(os.environ)
        frontend_env["DATABASE_URL"] = ephemeral_db.database_url
        frontend_env["APP_ENV"] = "local"

        print("[smoke] running Android user negative login Maestro flow")
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_negative_login_smoke.yaml"],
            cwd=frontend_root,
            env=frontend_env,
        )
        print("[smoke] running Android trainer Maestro flow")
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [
                maestro,
                "test",
                "test/automated/maestro/flows/smoke/trainer_create_smoke.yaml",
            ],
            cwd=frontend_root,
            env=frontend_env,
        )
        print("[smoke] running Android trainer edit Maestro flow")
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [
                maestro,
                "test",
                "test/automated/maestro/flows/smoke/trainer_edit_workshop_smoke.yaml",
            ],
            cwd=frontend_root,
            env=frontend_env,
        )
        print("[smoke] running Android user Maestro flow")
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_group_subscribe_enroll_smoke.yaml"],
            cwd=frontend_root,
            env=frontend_env,
        )
        print("[smoke] running Android user home workshops Maestro flow")
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_home_workshops_smoke.yaml"],
            cwd=frontend_root,
            env=frontend_env,
        )
        print("[smoke] running Android user unenroll Maestro flow")
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_workshop_unenroll_smoke.yaml"],
            cwd=frontend_root,
            env=frontend_env,
        )
        print("[smoke] running Android user unsubscribe Maestro flow")
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_group_unsubscribe_smoke.yaml"],
            cwd=frontend_root,
            env=frontend_env,
        )
        print("[smoke] running Android trainer edit group Maestro flow")
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/trainer_edit_group_smoke.yaml"],
            cwd=frontend_root,
            env=frontend_env,
        )
        print("[smoke] running Android trainer delete Maestro flow")
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/trainer_delete_workshop_smoke.yaml"],
            cwd=frontend_root,
            env=frontend_env,
        )
        print("[smoke] running Android user signout Maestro flow")
        run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        run(
            [maestro, "test", "test/automated/maestro/flows/smoke/user_signout_smoke.yaml"],
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

        if primary_error is None:
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
        else:
            print("[smoke] preserving emulator and ephemeral DB for failure debugging")
            if ephemeral_db is not None:
                print(f"[smoke] preserved DB container: {ephemeral_db.container_name}")
            print("[smoke] next smoke run will clean stale emulator and DB state at startup")

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