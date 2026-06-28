from __future__ import annotations

import os
import subprocess
import sys
import time
import traceback
from pathlib import Path

from run_android_smoke import (
    APP_ID,
    AUTOFILL_SERVICE_SETTING,
    disable_android_autofill,
    get_secure_setting,
    restore_android_autofill,
    resolve_adb,
)
from run_android_smoke_ephemeral_db import resolve_tool


TIMEZONE = "Europe/Warsaw"
ANDROID_SMOKE_BUILD_SCRIPT = "android:release:remote"
SMOKE_WORKSHOP_OFFSET_MINUTES = "1440"
MAESTRO_FLOW_RETRY_DELAY_SECONDS = 5


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


def run_maestro_flow(
    flow_path: str,
    *,
    maestro: str,
    adb: str,
    cwd: Path,
    env: dict[str, str] | None = None,
    max_attempts: int = 2,
) -> None:
    for attempt in range(1, max_attempts + 1):
        run([adb, "shell", "pm", "clear", APP_ID], cwd=cwd)
        try:
            run([maestro, "test", flow_path], cwd=cwd, env=env)
            return
        except subprocess.CalledProcessError:
            if attempt == max_attempts:
                raise
            flow_name = Path(flow_path).name
            print(f"[smoke] attempt {attempt}/{max_attempts} failed for {flow_name}, retrying in {MAESTRO_FLOW_RETRY_DELAY_SECONDS}s...")
            time.sleep(MAESTRO_FLOW_RETRY_DELAY_SECONDS)


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    frontend_root = script_dir.parent.parent

    create_avd_script = script_dir / "create_android_simulator.py"
    start_avd_script = script_dir / "start_android_simulator.py"
    destroy_avd_script = script_dir / "destroy_android_simulator.py"

    npm = resolve_npm()
    maestro = resolve_tool("maestro")
    adb = resolve_adb()

    avd_created = False
    previous_autofill_service = None
    primary_error: BaseException | None = None
    cleanup_errors: list[Exception] = []

    try:
        run_script(create_avd_script, "--force")
        avd_created = True

        run_script(start_avd_script, "--timezone", TIMEZONE)

        previous_autofill_service = get_secure_setting(
            adb, AUTOFILL_SERVICE_SETTING, frontend_root
        )
        disable_android_autofill(adb, frontend_root)

        build_env = dict(os.environ)
        build_env["EXPO_PUBLIC_SMOKE_WORKSHOP_OFFSET_MINUTES"] = SMOKE_WORKSHOP_OFFSET_MINUTES
        run([npm, "run", ANDROID_SMOKE_BUILD_SCRIPT], cwd=frontend_root, env=build_env)

        def flow(path: str) -> None:
            run_maestro_flow(path, maestro=maestro, adb=adb, cwd=frontend_root)

        flow("test/automated/maestro/flows/smoke/user_negative_login_smoke.yaml")
        # max_attempts=1: hardcoded email e2e.register.smoke@kalba.dev — retry after successful
        # registration would hit 409 and convert a transient flake into a guaranteed failure.
        run_maestro_flow(
            "test/automated/maestro/flows/smoke/user_register_smoke.yaml",
            maestro=maestro, adb=adb, cwd=frontend_root, max_attempts=1,
        )
        flow("test/automated/maestro/flows/smoke/user_forgot_password_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/trainer_create_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/trainer_create_workshop_date_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/trainer_edit_workshop_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/user_group_subscribe_enroll_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/user_home_workshops_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/user_workshop_unenroll_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/user_group_unsubscribe_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/trainer_edit_group_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/trainer_delete_workshop_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/trainer_delete_group_smoke.yaml")
        flow("test/automated/maestro/flows/smoke/user_signout_smoke.yaml")
    except BaseException as err:
        primary_error = err
    finally:
        try:
            run([adb, "shell", "pm", "clear", APP_ID], cwd=frontend_root)
        except Exception as cleanup_err:
            cleanup_errors.append(cleanup_err)

        try:
            restore_android_autofill(adb, frontend_root, previous_autofill_service)
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
