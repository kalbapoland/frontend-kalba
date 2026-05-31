from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_AVD_NAME = "kalba-pixel6-api36"
DEFAULT_TIMEZONE = "Europe/Warsaw"


def run(
    command: list[str],
    *,
    capture_output: bool = False,
    timeout_seconds: int | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        check=True,
        text=True,
        capture_output=capture_output,
        timeout=timeout_seconds,
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


def list_emulator_serials(adb: str) -> list[str]:
    result = run([adb, "devices"], capture_output=True)
    serials: list[str] = []
    for line in result.stdout.splitlines()[1:]:
        line = line.strip()
        if not line:
            continue
        serial = line.split()[0]
        if serial.startswith("emulator-"):
            serials.append(serial)
    return serials


def wait_for_boot(adb: str, expected_name: str) -> None:
    print(f"Waiting for emulator {expected_name} to boot...")
    deadline = time.monotonic() + 300
    while time.monotonic() < deadline:
        saw_any_emulator = False
        for serial in list_emulator_serials(adb):
            saw_any_emulator = True
            try:
                state = run(
                    [adb, "-s", serial, "get-state"],
                    capture_output=True,
                    timeout_seconds=2,
                )
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                continue

            if state.stdout.strip() != "device":
                continue

            try:
                running_avd_name = run(
                    [adb, "-s", serial, "emu", "avd", "name"],
                    capture_output=True,
                    timeout_seconds=2,
                ).stdout.strip()
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                continue

            if running_avd_name != expected_name:
                continue

            try:
                result = run(
                    [adb, "-s", serial, "shell", "getprop", "sys.boot_completed"],
                    capture_output=True,
                    timeout_seconds=2,
                )
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                continue

            if result.stdout.strip() == "1":
                print(f"Emulator boot completed on {serial}.")
                return

        if not saw_any_emulator:
            time.sleep(2)
            continue

        time.sleep(2)

    raise RuntimeError("Timed out waiting for Android emulator boot completion.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Start an Android emulator for Kalba smoke tests.")
    parser.add_argument("--name", default=DEFAULT_AVD_NAME, help=f"AVD name. Default: {DEFAULT_AVD_NAME}")
    parser.add_argument(
        "--timezone",
        default=DEFAULT_TIMEZONE,
        help=f"Timezone to enforce at launch. Default: {DEFAULT_TIMEZONE}",
    )
    return parser.parse_args()


def list_avds(emulator: str) -> list[str]:
    result = run([emulator, "-list-avds"], capture_output=True)
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def main() -> None:
    args = parse_args()
    sdk_root = resolve_sdk_root()
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
        raise RuntimeError(
            f"AVD {args.name} does not exist. Create it first with create_android_simulator.py."
        )

    command = [emulator, "-avd", args.name, "-timezone", args.timezone]
    print("Starting emulator with:")
    print(" ".join(command))
    subprocess.Popen(command)
    wait_for_boot(adb, args.name)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as err:
        print(err, file=sys.stderr)
        raise SystemExit(1)