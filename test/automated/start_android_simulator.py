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


def describe_emulator_devices(adb: str) -> str:
    result = run([adb, "devices"], capture_output=True)
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return " | ".join(lines)


def parse_avd_name_output(raw_output: str) -> str:
    # Emulator console output may append status lines like "OK" after the AVD name.
    for line in raw_output.splitlines():
        value = line.strip()
        if not value or value.upper() == "OK":
            continue
        return value
    return ""


def wait_for_boot(adb: str, expected_name: str) -> str:
    print(f"Waiting for emulator {expected_name} to boot...")
    deadline = time.monotonic() + 600
    last_progress_log = 0.0
    last_device_log = 0.0
    try:
        run([adb, "wait-for-device"], timeout_seconds=120)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        pass

    while time.monotonic() < deadline:
        now = time.monotonic()
        if now - last_progress_log >= 30:
            remaining = int(deadline - now)
            print(f"Waiting for boot completion... {remaining}s remaining")
            last_progress_log = now

        if now - last_device_log >= 10:
            print(f"[boot] adb devices: {describe_emulator_devices(adb)}")
            last_device_log = now

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

            print(f"[boot] {serial} get-state -> {state.stdout.strip()}")

            if state.stdout.strip() != "device":
                continue

            try:
                result = run(
                    [adb, "-s", serial, "shell", "getprop", "sys.boot_completed"],
                    capture_output=True,
                    timeout_seconds=2,
                )
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                continue

            print(f"[boot] {serial} sys.boot_completed -> {result.stdout.strip()}")

            if result.stdout.strip() == "1":
                try:
                    running_avd_name = parse_avd_name_output(
                        run(
                        [adb, "-s", serial, "emu", "avd", "name"],
                        capture_output=True,
                        timeout_seconds=2,
                        ).stdout
                    )
                except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                    running_avd_name = expected_name

                print(f"[boot] {serial} avd name -> {running_avd_name}")

                if running_avd_name != expected_name:
                    continue

                print(f"Emulator boot completed on {serial}.")
                return serial

        if not saw_any_emulator:
            time.sleep(2)
            continue

        time.sleep(2)

    raise RuntimeError("Timed out waiting for Android emulator boot completion.")


def enforce_24h_time_format(adb: str, serial: str) -> None:
    print(f"Enforcing 24h time format on {serial}...")
    # Retry briefly because settings provider can be unavailable right after boot.
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        try:
            run([adb, "-s", serial, "shell", "settings", "put", "system", "time_12_24", "24"])
            result = run(
                [adb, "-s", serial, "shell", "settings", "get", "system", "time_12_24"],
                capture_output=True,
                timeout_seconds=3,
            )
            value = result.stdout.strip()
            if value == "24":
                print(f"24h time format enabled on {serial}.")
                return
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            pass
        time.sleep(1)

    raise RuntimeError("Failed to enforce 24h time format on emulator.")


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
    serial = wait_for_boot(adb, args.name)
    enforce_24h_time_format(adb, serial)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as err:
        print(err, file=sys.stderr)
        raise SystemExit(1)