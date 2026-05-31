from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

DEFAULT_AVD_NAME = "kalba-pixel6-api36"
DEFAULT_DEVICE = "pixel_6"
DEFAULT_SYSTEM_IMAGE = "system-images;android-36;google_apis;x86_64"


def run(
    command: list[str],
    *,
    input_text: str | None = None,
    capture_output: bool = False,
    sdk_root: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    if sdk_root is not None:
        env["ANDROID_HOME"] = str(sdk_root)
        env["ANDROID_SDK_ROOT"] = str(sdk_root)

    return subprocess.run(
        command,
        check=True,
        text=True,
        input=input_text,
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


def install_system_image(sdkmanager: str, package_name: str, sdk_root: Path) -> None:
    print(f"Ensuring system image is installed: {package_name}")
    run(
        [sdkmanager, f"--sdk_root={sdk_root}", "--install", package_name],
        input_text="y\n" * 20,
        sdk_root=sdk_root,
    )


def create_avd(avdmanager: str, name: str, device: str, package_name: str, sdk_root: Path) -> None:
    print(f"Creating AVD {name} ({device}, {package_name})")
    run(
        [
            avdmanager,
            "create",
            "avd",
            "--name",
            name,
            "--package",
            package_name,
            "--device",
            device,
            "--force",
        ],
        input_text="no\n",
        sdk_root=sdk_root,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a clean Android emulator AVD for Kalba smoke tests.")
    parser.add_argument("--name", default=DEFAULT_AVD_NAME, help=f"AVD name. Default: {DEFAULT_AVD_NAME}")
    parser.add_argument("--device", default=DEFAULT_DEVICE, help=f"Hardware profile. Default: {DEFAULT_DEVICE}")
    parser.add_argument(
        "--system-image",
        default=DEFAULT_SYSTEM_IMAGE,
        help=f"System image package. Default: {DEFAULT_SYSTEM_IMAGE}",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Recreate the AVD if it already exists.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    script_dir = Path(__file__).resolve().parent
    sdk_root = resolve_sdk_root()
    sdkmanager = resolve_tool(
        "sdkmanager",
        sdk_root,
        "cmdline-tools/latest/bin/sdkmanager.bat",
        "cmdline-tools/latest/bin/sdkmanager",
    )
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

    existing_avds = list_avds(emulator)
    if args.name in existing_avds and not args.force:
        print(f"AVD {args.name} already exists.")
        print(f"Start it with: {sdk_root / 'emulator' / ('emulator.exe' if os.name == 'nt' else 'emulator')} -avd {args.name}")
        return

    if args.name in existing_avds and args.force:
        destroy_script = script_dir / "destroy_android_simulator.py"
        print(f"AVD {args.name} already exists. Recreating because --force was provided.")
        run([sys.executable, str(destroy_script), "--name", args.name], sdk_root=sdk_root)
        existing_avds = list_avds(emulator)
        if args.name in existing_avds:
            print(f"Failed to recreate AVD {args.name}: old instance still exists.")
            raise SystemExit(1)

    install_system_image(sdkmanager, args.system_image, sdk_root)
    create_avd(avdmanager, args.name, args.device, args.system_image, sdk_root)

    print()
    print("AVD created successfully.")
    print(f"Name: {args.name}")
    print(f"Start command: {sdk_root / 'emulator' / ('emulator.exe' if os.name == 'nt' else 'emulator')} -avd {args.name}")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as err:
        print(err, file=sys.stderr)
        raise SystemExit(1)