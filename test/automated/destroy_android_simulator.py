from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_AVD_NAME = "kalba-pixel6-api36"


def run(
    command: list[str],
    *,
    capture_output: bool = False,
    check: bool = True,
    sdk_root: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    if sdk_root is not None:
        env["ANDROID_HOME"] = str(sdk_root)
        env["ANDROID_SDK_ROOT"] = str(sdk_root)

    return subprocess.run(
        command,
        check=check,
        text=True,
        capture_output=capture_output,
        env=env,
    )


def resolve_sdk_root() -> Path:
    candidates: list[Path] = []

    android_home = os.getenv("ANDROID_HOME")
    if android_home:
        candidates.append(Path(android_home))

    android_sdk_root = os.getenv("ANDROID_SDK_ROOT")
    if android_sdk_root:
        candidates.append(Path(android_sdk_root))

    local_appdata = os.getenv("LOCALAPPDATA")
    if local_appdata:
        candidates.append(Path(local_appdata) / "Android" / "Sdk")

    candidates.append(Path.home() / "Library" / "Android" / "sdk")

    for candidate in candidates:
        if candidate.exists():
            return candidate

    raise RuntimeError("Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT.")


def resolve_tool(explicit_name: str, sdk_root: Path, *relative_candidates: str) -> str:
    found = shutil.which(explicit_name)
    if found:
        return found

    for relative_candidate in relative_candidates:
        candidate = sdk_root / relative_candidate
        if candidate.exists():
            return str(candidate)

    raise RuntimeError(f"{explicit_name} not found. Install Android command-line tools.")


def list_avds(emulator: str) -> set[str]:
    result = run([emulator, "-list-avds"], capture_output=True)
    return {line.strip() for line in result.stdout.splitlines() if line.strip()}


def kill_running_avd(adb: str, avd_name: str) -> None:
    devices = run([adb, "devices"], capture_output=True, sdk_root=None)
    for line in devices.stdout.splitlines()[1:]:
        serial = line.split()[0] if line.strip() else ""
        if not serial.startswith("emulator-"):
            continue

        avd_result = run([adb, "-s", serial, "emu", "avd", "name"], capture_output=True, check=False)
        if avd_result.returncode != 0:
            continue

        if avd_result.stdout.strip() == avd_name:
            print(f"Stopping running emulator {serial} for AVD {avd_name}")
            run([adb, "-s", serial, "emu", "kill"], check=False)


def wait_for_avd_shutdown(adb: str, avd_name: str, timeout_seconds: int = 30) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        devices = run([adb, "devices"], capture_output=True, check=False)
        running_for_avd = False
        for line in devices.stdout.splitlines()[1:]:
            serial = line.split()[0] if line.strip() else ""
            if not serial.startswith("emulator-"):
                continue

            avd_result = run([adb, "-s", serial, "emu", "avd", "name"], capture_output=True, check=False)
            if avd_result.returncode == 0 and avd_result.stdout.strip() == avd_name:
                running_for_avd = True
                break

        if not running_for_avd:
            return

        time.sleep(1)

    raise RuntimeError(f"Timed out waiting for AVD {avd_name} to shut down")


def remove_with_retries(path: Path, retries: int = 20, delay_seconds: float = 0.5) -> None:
    last_error: Exception | None = None
    for _ in range(retries):
        try:
            if not path.exists():
                return
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink()
            return
        except PermissionError as err:
            last_error = err
            time.sleep(delay_seconds)

    if last_error is not None:
        raise last_error


def delete_leftovers(avd_name: str) -> None:
    avd_root = Path.home() / ".android" / "avd"
    ini_path = avd_root / f"{avd_name}.ini"
    avd_dir = avd_root / f"{avd_name}.avd"

    if ini_path.exists():
        remove_with_retries(ini_path)

    if avd_dir.exists():
        remove_with_retries(avd_dir)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Destroy an Android emulator AVD used by Kalba smoke tests.")
    parser.add_argument("--name", default=DEFAULT_AVD_NAME, help=f"AVD name. Default: {DEFAULT_AVD_NAME}")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    sdk_root = resolve_sdk_root()
    avdmanager = resolve_tool(
        "avdmanager",
        sdk_root,
        "cmdline-tools/latest/bin/avdmanager.bat",
        "cmdline-tools/latest/bin/avdmanager",
    )
    emulator = resolve_tool(
        "emulator",
        sdk_root,
        "emulator/emulator.exe",
        "emulator/emulator",
    )
    adb = resolve_tool(
        "adb",
        sdk_root,
        "platform-tools/adb.exe",
        "platform-tools/adb",
    )

    existing_avds = list_avds(emulator)
    if args.name not in existing_avds:
        print(f"AVD {args.name} does not exist.")
        delete_leftovers(args.name)
        return

    kill_running_avd(adb, args.name)
    wait_for_avd_shutdown(adb, args.name)
    print(f"Deleting AVD {args.name}")
    run([avdmanager, "delete", "avd", "--name", args.name], sdk_root=sdk_root)
    delete_leftovers(args.name)
    print("AVD deleted successfully.")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as err:
        print(err, file=sys.stderr)
        raise SystemExit(1)