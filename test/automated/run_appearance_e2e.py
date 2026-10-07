"""Runtime appearance-pipeline E2E — empirical regression test on a live emulator.

Covers the defect class fixed in 2026-10 (iOS needed an app restart to react
to the system dark-mode toggle; Android over-layered the OS dark setting onto
the in-app choice). All steps drive a REAL app build via adb + probe the
actual rendered pixels; no mocks.

Pipeline under test (src/theme/):
  useSystemScheme — foreground re-read covers backgrounded OS toggles;
  Android AppCompat pin — native chrome follows the resolved app palette.

Phases (system toggle via `adb shell cmd uimode night`):
  1. cold start on system light -> app light
  2. foreground toggle to dark   -> app dark immediately
  3. foreground toggle to light  -> app light immediately
  4. backgrounded toggle to dark, return -> app dark
  5. backgrounded toggle to light, return -> app light
  6. pin OFF (system dark) -> app forces the LIGHT palette
  7. pin ON again (system dark) -> app returns to dark
  8. native chrome: pin OFF -> Alert dialog renders in LIGHT chrome
  9. screen tour, system dark  -> every main screen is dark
  10. screen tour, system light -> every main screen is light

Phases 9-10 walk the main screens (Home, Groups, Calendar, My Kalba,
Profile, Workshop detail — six screens × both schemes = 12 asserts) and
pixel-probe each against the active palette. A screen that left the theme
pipeline (hardcoded colour, missed migration) fails on its own tour step
with the artifact screenshot, instead of "Profile just happened to look
right". Navigation + visibility asserts go through Maestro (Raw uiautomator
dumps fail on non-idle UI: the BreathingCircle animation never idles); the
tour needs the seeded fixtures (`e2e-workshop-free`, `e2e-trainer-group` —
`backend/tests/automated/seed_mobile_e2e_fixtures.py`), which every smoke
run seeds before the appearance phases start.

Usage (one-shot, requires a built APK installed and adb connectivity):
    python test/automated/run_appearance_e2e.py --phase all
    python test/automated/run_appearance_e2e.py --phase system   # 1-5
    python test/automated/run_appearance_e2e.py --phase pin      # 6-8
    python test/automated/run_appearance_e2e.py --phase tour     # 9-10
Artifacts: test/automated/artifacts/appearance/ (gitignored).
"""

from __future__ import annotations

import argparse
import os
import shutil
import struct
import subprocess
import sys
import time
import zlib
from pathlib import Path

APP_ID = "com.kalba.app"
FRONTEND_ROOT = Path(__file__).resolve().parent.parent.parent
ARTIFACT_DIR = FRONTEND_ROOT / "test" / "automated" / "artifacts" / "appearance"
MAESTRO_PREPARE = "test/automated/maestro/flows/appearance/prepare_profile.yaml"
MAESTRO_GO_TAB = "test/automated/maestro/flows/appearance/go_tab.yaml"
MAESTRO_TAP_CARD = "test/automated/maestro/flows/appearance/tap_card.yaml"

# Palette tokens. Screens built like `backgroundColor: c.canvas` render the
# canvas; cards render `c.surface`. The probe point may land on either
# depending on the screen's layout, so BOTH are accepted per palette — a
# screen that left the theme pipeline (hardcoded pure black/white, old
# palette, etc.) matches neither and fails.
NIGHT_CANVAS = (26, 25, 23)
NIGHT_CANVAS_DEEP = (18, 17, 16)
NIGHT_SURFACE = (35, 34, 32)
LIGHT_CANVAS = (245, 241, 235)
LIGHT_CANVAS_DEEP = (237, 232, 224)
LIGHT_SURFACE = (250, 248, 244)


class AppearanceE2EError(RuntimeError):
    pass


def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
    result = subprocess.run(command, **kwargs)  # type: ignore[arg-type]
    if result.returncode != 0:
        raise AppearanceE2EError(f"command failed ({result.returncode}): {command}")
    return result


def resolve_adb() -> str:
    found = shutil.which("adb")
    if found:
        return found

    candidates: list[Path] = []
    android_home = os_environ.get("ANDROID_HOME") or os_environ.get("ANDROID_SDK_ROOT")
    if android_home:
        candidates.append(Path(android_home) / "platform-tools" / ("adb.exe" if os_is_windows() else "adb"))
    local_appdata = os_environ.get("LOCALAPPDATA")
    if local_appdata and os_is_windows():
        candidates.append(Path(local_appdata) / "Android" / "Sdk" / "platform-tools" / "adb.exe")
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    raise AppearanceE2EError("adb not found in PATH or common SDK locations")


os_is_windows = lambda: os.name == "nt"
os_environ = os.environ


def resolve_maestro() -> str:
    found = shutil.which("maestro")
    if found:
        return found
    raise AppearanceE2EError("maestro not found in PATH")


def maestro(flow_path: str, cache: dict[str, str] = {}) -> None:
    exe = cache.setdefault("exe", resolve_maestro())
    run([exe, "test", flow_path], cwd=str(FRONTEND_ROOT), capture_output=True)


def launch_app(adb: str) -> None:
    run(
        [adb, "shell", "monkey", "-p", APP_ID, "-c", "android.intent.category.LAUNCHER", "1"],
        capture_output=True,
    )


def force_stop(adb: str) -> None:
    run([adb, "shell", "am", "force-stop", APP_ID], capture_output=True)


def go_home(adb: str) -> None:
    run([adb, "shell", "input", "keyevent", "KEYCODE_HOME"], capture_output=True)


def set_night_mode(adb: str, mode: str) -> None:
    run([adb, "shell", "cmd", "uimode", "night", mode], capture_output=True)


def get_night_mode(adb: str) -> str:
    result = subprocess.run(
        [adb, "shell", "cmd", "uimode", "night"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def capture(adb: str, png: Path) -> tuple[tuple[int, int, int], str]:
    raw = subprocess.run(
        [adb, "exec-out", "screencap", "-p"],
        check=True,
        capture_output=True,
    ).stdout
    if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        raise AppearanceE2EError("screencap did not return a PNG")

    png.parent.mkdir(parents=True, exist_ok=True)
    png.write_bytes(raw)

    centre = probe_png_centre(raw, x=100, y=460)  # left margin above content — raw canvas on every screen
    band = classify(centre)
    return centre, band


def probe_png_centre(data: bytes, x: int | None = None, y: int | None = None) -> tuple[int, int, int]:
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise AppearanceE2EError("not a PNG")

    pos, width, height, bit_depth, colour_type = 8, 0, 0, 0, 0
    idat = b""
    while pos < len(data):
        (length,) = struct.unpack_from(">I", data, pos)
        chunk_type = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        if chunk_type == b"IHDR":
            width, height, bit_depth, colour_type = struct.unpack_from(">IIBB", chunk, 0)
        elif chunk_type == b"IDAT":
            idat += chunk
        elif chunk_type == b"IEND":
            break
        pos += 12 + length

    if bit_depth != 8 or colour_type not in (2, 6):
        raise AppearanceE2EError(
            f"unexpected PNG layout: bit_depth={bit_depth} colour_type={colour_type}"
        )

    channels = 3 if colour_type == 2 else 4
    stride = width * channels + 1
    decompressed = zlib.decompress(idat)
    probe_row = y if y is not None else height // 2

    prev = bytearray(width * channels)
    line = bytearray()
    offset = 0
    for _ in range(probe_row + 1):
        filter_type = decompressed[offset]
        line = bytearray(decompressed[offset + 1 : offset + 1 + width * channels])
        offset += stride
        if filter_type == 1:
            for i in range(channels, len(line)):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif filter_type == 2:
            for i in range(len(line)):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif filter_type == 3:
            for i in range(len(line)):
                left = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif filter_type == 4:
            for i in range(len(line)):
                left = line[i - channels] if i >= channels else 0
                above = prev[i]
                up_left = prev[i - channels] if i >= channels else 0
                p = left + above - up_left
                pa, pb, pc = abs(p - left), abs(p - above), abs(p - up_left)
                predictor = left if (pa <= pb and pa <= pc) else (above if pb <= pc else up_left)
                line[i] = (line[i] + predictor) & 0xFF
        prev = line

    px = x if x is not None else width // 2
    return line[px * channels], line[px * channels + 1], line[px * channels + 2]


def close_enough(actual: tuple[int, int, int], expected: tuple[int, int, int], tolerance: int = 6) -> bool:
    return all(abs(a - e) <= tolerance for a, e in zip(actual, expected))


PALETTES: dict[str, tuple[tuple[int, int, int], ...]] = {
    "dark": (NIGHT_CANVAS, NIGHT_CANVAS_DEEP, NIGHT_SURFACE),
    "light": (LIGHT_CANVAS, LIGHT_CANVAS_DEEP, LIGHT_SURFACE),
}


def classify(rgb: tuple[int, int, int]) -> str:
    # Strict palette matching: a screen that drifted to its own hardcoded
    # background (pure black/white, brand colour...) matches NEITHER palette
    # and must fail — a loose luminance threshold would pass it.
    for name, tokens in PALETTES.items():
        for token in tokens:
            if close_enough(rgb, token):
                return name
    return "unknown"


def assert_canvas(adb: str, label: str, expected: str, png: Path) -> None:
    rgb, band = capture(adb, png)
    if band != expected:
        raise AppearanceE2EError(
            f"{label}: expected {expected} canvas ("
            f"{PALETTES[expected]}), probed rgb={rgb} ({band}) — artifact: {png}"
        )
    print(f"[appearance-e2e] PASS: {label}  rgb={rgb}")


def uiautomator_resource_ids(adb: str) -> dict[str, str]:
    run([adb, "shell", "uiautomator", "dump", "/sdcard/window_dump.xml"], capture_output=True)
    xml = (
        subprocess.run(
            [adb, "shell", "cat", "/sdcard/window_dump.xml"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout
    )
    import re

    return {
        match.group(1): match.group(2)
        for match in re.finditer(r'resource-id="([^"]+)"[^>]*bounds="(\[[0-9,\[\]]+\])"', xml)
    }


def tap_switch(adb: str) -> None:
    ids = uiautomator_resource_ids(adb)
    # uiautomator dumps ReactNative testIDs WITHOUT the package prefix.
    bounds = ids.get("profile.appearance.switch")
    if not bounds:
        raise AppearanceE2EError("appearance switch not found on screen")
    import re

    corners = re.findall(r"\d+", bounds)
    x = (int(corners[0]) + int(corners[2])) // 2
    y = (int(corners[1]) + int(corners[3])) // 2
    run([adb, "shell", "input", "tap", str(x), str(y)], capture_output=True)


def tap_resource(adb: str, resource_id: str) -> None:
    ids = uiautomator_resource_ids(adb)
    bounds = ids.get(resource_id)
    if not bounds:
        raise AppearanceE2EError(f"{resource_id} not found on screen")
    import re

    corners = re.findall(r"\d+", bounds)
    x = (int(corners[0]) + int(corners[2])) // 2
    y = (int(corners[1]) + int(corners[3])) // 2
    run([adb, "shell", "input", "tap", str(x), str(y)], capture_output=True)


def wait_for_ids(adb: str, resource_id: str, timeout_s: float = 15.0) -> None:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            if resource_id in uiautomator_resource_ids(adb):
                return
        except AppearanceE2EError:
            pass
        time.sleep(1)
    raise AppearanceE2EError(f"{resource_id} not visible within {timeout_s}s")


# Screen tour: tabs in tap order. The deterministic seeded fixtures
# (seed_mobile_e2e_fixtures.py) back the group/workshop cards on Home and
# Groups; the smoke suite's live-created fixtures are NOT needed.
# Probe point (100, 460) sits on raw canvas on every toured screen (verified
# on both palettes); tour PNGs land in artifacts/appearance/tour/.
TOUR_PNG = ARTIFACT_DIR / "tour"

TOUR_TABS: list[tuple[str, str, str]] = [
    # (tour key, tab button id segment, destination testID)
    ("home", "index", "home.workshops.list"),
    ("groups", "groups", "group.card.e2e-trainer-group"),
    ("calendar", "calendar", "calendar.content"),
    ("my-kalba", "my-kalba", "my-kalba.goal.decrease"),
    ("profile", "profile", "profile.appearance.section"),
]

# Workshop detail is reached from the Home list. The seeded user is ENROLLED
# in the "free" workshop — the detail screen shows the Unenroll button (not
# Enroll).
WORKSHOP_CARD_FROM_HOME = "home.workshop.card.e2e-workshop-free"
WORKSHOP_DETAIL_ID = "workshop.unenroll.button"


def maestro_tab(adb: str, tab_segment: str, wait_id: str) -> None:
    """Navigate AND verify via Maestro. Raw uiautomator dumps are unusable
    here: the BreathingCircle's infinite Reanimated animation keeps the UI
    in a non-idle state, so `uiautomator dump` fails ("could not get idle
    state") and keeps re-serving a stale cached hierarchy. Maestro's engine
    is unaffected."""
    run(
        [resolve_maestro(), "test", "-e", f"TAB_ID=tab.{tab_segment}.button",
         "-e", f"WAIT_ID={wait_id}", MAESTRO_GO_TAB],
        cwd=str(FRONTEND_ROOT),
        capture_output=True,
    )


def maestro_wait(adb: str, wait_id: str) -> None:
    run(
        [resolve_maestro(), "test", "-e", "TAB_ID=tab.index.button",
         "-e", f"WAIT_ID={wait_id}", MAESTRO_GO_TAB],
        cwd=str(FRONTEND_ROOT),
        capture_output=True,
    )


def maestro_tap_card(card_id: str, wait_id: str) -> None:
    run(
        [resolve_maestro(), "test", "-e", f"CARD_ID={card_id}",
         "-e", f"WAIT_ID={wait_id}", MAESTRO_TAP_CARD],
        cwd=str(FRONTEND_ROOT),
        capture_output=True,
    )


def phase_screen_tour(adb: str) -> None:
    """Phases 9-10: every main screen renders the active palette in BOTH
    system schemes. A screen that left the theme pipeline (hardcoded colour,
    missed migration) goes light while the rest of the app is dark — this
    tour catches exactly that class."""
    print("[appearance-e2e] === phases 9-10: per-screen palette tour ===")

    def assert_tour(expected: str, phase: int) -> None:
        for index, (_key, tab_segment, wait_id) in enumerate(TOUR_TABS, start=1):
            maestro_tab(adb, tab_segment, wait_id)
            time.sleep(1)
            assert_canvas(
                adb,
                f"tour {phase}.{index}: {tab_segment}",
                expected,
                TOUR_PNG / f"{phase}_{index}_{tab_segment}_{expected}.png",
            )

        # Workshop detail is reached from the Home list.
        maestro_tab(adb, "index", "home.workshops.list")
        maestro_tap_card(WORKSHOP_CARD_FROM_HOME, WORKSHOP_DETAIL_ID)
        time.sleep(1)
        assert_canvas(
            adb,
            f"tour {phase}.6: workshop detail",
            expected,
            TOUR_PNG / f"{phase}_6_workshop_detail_{expected}.png",
        )
        # Back to Home for the next assert (or the tour's end state).
        run([adb, "shell", "input", "keyevent", "KEYCODE_BACK"], capture_output=True)
        maestro_wait(adb, "home.workshops.list")

    set_night_mode(adb, "yes")
    time.sleep(3)
    assert_tour("dark", 9)

    set_night_mode(adb, "no")
    time.sleep(3)
    assert_tour("light", 10)


def phase_system_follow(adb: str) -> None:
    """Phases 1-5: system-follow round trips (foreground + backgrounded)."""
    print("[appearance-e2e] === phases 1-5: system-follow pipeline ===")
    force_stop(adb)
    set_night_mode(adb, "no")
    launch_app(adb)
    time.sleep(6)
    # Sign in / open profile first — the app must be on a themed screen.
    maestro(MAESTRO_PREPARE)
    time.sleep(2)

    assert_canvas(adb, "cold start, system light -> app light", "light", ARTIFACT_DIR / "1_cold_light.png")

    set_night_mode(adb, "yes")
    time.sleep(3)
    assert_canvas(adb, "foreground toggle -> dark", "dark", ARTIFACT_DIR / "2_fg_dark.png")

    set_night_mode(adb, "no")
    time.sleep(3)
    assert_canvas(adb, "foreground toggle -> light", "light", ARTIFACT_DIR / "3_fg_light.png")

    go_home(adb)
    set_night_mode(adb, "yes")
    launch_app(adb)
    time.sleep(3)
    assert_canvas(adb, "backgrounded toggle -> dark on return", "dark", ARTIFACT_DIR / "4_bg_dark.png")

    go_home(adb)
    set_night_mode(adb, "no")
    launch_app(adb)
    time.sleep(3)
    assert_canvas(adb, "backgrounded toggle -> light on return", "light", ARTIFACT_DIR / "5_bg_light.png")


def phase_pin_light(adb: str) -> None:
    """Phases 6-8: in-app pin cuts through the system dark setting."""
    print("[appearance-e2e] === phases 6-8: pin-light vs system dark ===")
    # Precondition: on the Profile screen (phases 1-5 end here), system LIGHT.

    # 6. system -> dark (app dark, pin still system).
    set_night_mode(adb, "yes")
    time.sleep(3)
    assert_canvas(adb, "system dark with follow ON -> dark", "dark", ARTIFACT_DIR / "6_follow_dark.png")

    # 7. pin OFF (light policy). The app must switch to the LIGHT palette
    #    while the OS stays dark — the exact reported defect.
    tap_switch(adb)
    time.sleep(3)
    assert_canvas(
        adb,
        "pin OFF while system dark -> app forced LIGHT",
        "light",
        ARTIFACT_DIR / "7_pin_off_light.png",
    )

    # 8. pin ON again -> back to dark with the OS still dark.
    tap_switch(adb)
    time.sleep(3)
    assert_canvas(
        adb,
        "pin ON while system dark -> app back to dark",
        "dark",
        ARTIFACT_DIR / "8_pin_on_dark.png",
    )

    # Leave the follow-system policy for the next run.
    # (taps above restored it — steps 7 and 8 balance out.)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--phase",
        default="all",
        help="'all', 'system' (1-5), 'pin' (6-8) or 'tour' (9-10)",
    )
    parser.add_argument("--app-id", default=APP_ID)
    args = parser.parse_args()

    app_id = args.app_id

    adb = resolve_adb()
    previous = get_night_mode(adb)
    app_installed = (
        subprocess.run([adb, "shell", "pm", "path", APP_ID], capture_output=True).returncode == 0
    )
    if not app_installed:
        raise AppearanceE2EError(f"{APP_ID} is not installed on the emulator")

    resolve_maestro()

    exit_code = 1
    try:
        phase = args.phase
        if phase in ("all", "system"):
            phase_system_follow(adb)
        if phase in ("all", "pin"):
            phase_pin_light(adb)
        if phase in ("all", "tour"):
            phase_screen_tour(adb)
        print("[appearance-e2e] ALL PASSED")
        exit_code = 0
    except AppearanceE2EError as error:
        print(f"[appearance-e2e] FAILED: {error}")
    finally:
        # Restore the device-side state so this test never leaks OS settings.
        if previous.strip().lower() == "night mode: yes":
            set_night_mode(adb, "yes")
        elif previous.strip().lower() == "night mode: no":
            set_night_mode(adb, "no")

    return exit_code

if __name__ == "__main__":
    sys.exit(main())

