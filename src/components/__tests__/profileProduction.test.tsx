import { act, render, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, type Metrics } from "react-native-safe-area-context";

import ProfileScreen, { AppearanceSection, DeveloperOptionsSection } from "../../../app/(app)/(tabs)/profile";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useSettingsStore } from "@/store/settings";
import { useAuthStore } from "@/store/auth";
import { defaultSettings } from "@/lib/persistence/schema";
import type { User } from "@/types/api";
import * as buildVariant from "@/lib/buildVariant";

/**
 * Appearance switch + Developer options contract (review question:
 * "budujemy bez DevO — co z follow system?").
 *
 * The first two `describe` blocks render `AppearanceSection` /
 * `DeveloperOptionsSection` directly and exercise their own logic
 * regardless of `isTestBuild`; the real
 * `{isTestBuild && <DeveloperOptionsSection />}` gate inside `ProfileScreen`
 * is only verified by the last block below — see its comment for how the
 * flag is flipped per test.
 */
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const TEST_USER: User = {
  id: "1",
  email: "ada@example.com",
  full_name: "Ada Lovelace",
  is_active: true,
  role: "user",
};

// `initialWindowMetrics` is populated natively at app startup; under Jest
// there's no native measurement, so it's always `null` and SafeAreaProvider
// withholds its children forever. Rendering a full screen needs fixed
// metrics instead (see profileScreen.test.tsx).
const TEST_SAFE_AREA_METRICS: Metrics = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

describe("AppearanceSection — switch behaviour (build-agnostic)", () => {
  beforeEach(() => {
    useSettingsStore.setState({ hydrated: true, settings: defaultSettings() });
  });

  test("Appearance renders and the switch is interactive", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );

    expect(getByTestId("profile.appearance.section")).toBeTruthy();
    const sw = getByTestId("profile.appearance.switch");
    expect(sw.props.value).toBe(true);
    // Guards the masking test below: without this, a bug that disables the
    // switch unconditionally (not just when overridden) would still pass.
    expect(sw.props.disabled).toBe(false);
  });

  test("switch OFF pins light preference", async () => {
    const { getByTestId, rerender } = render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );

    fireEvent(getByTestId("profile.appearance.switch"), "valueChange", false);

    await (async () => {}); // flush the store write

    expect(useSettingsStore.getState().settings.themePreference).toBe("light");
    expect(useSettingsStore.getState().settings.devThemeOverride).toBeNull();

    rerender(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );
    expect(getByTestId("profile.appearance.switch").props.value).toBe(false);
  });

  test("regression: pinning light never masks the switch (user bug — phantom 'Overridden by DEVELOPER OPTIONS')", async () => {
    const { getByTestId, rerender } = render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );

    fireEvent(getByTestId("profile.appearance.switch"), "valueChange", false);
    await (async () => {}); // flush the store write

    rerender(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );
    const sw = getByTestId("profile.appearance.switch");

    // policy === "light" alone is NOT an override: the switch must stay
    // interactive, otherwise production users brick their own preference.
    expect(sw.props.value).toBe(false);
    expect(sw.props.disabled).toBe(false);
  });

  test("Appearance switch is disabled when masked by a DevO override", () => {
    // A DevO palette pin (devThemeOverride) takes priority over the user's
    // own themePreference — the switch must reflect that it is not the
    // thing currently driving the theme (review follow-up on PR #126).
    useSettingsStore.setState({
      hydrated: true,
      settings: { ...defaultSettings(), themePreference: "system", devThemeOverride: "night" },
    });

    const { getByTestId } = render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );

    const sw = getByTestId("profile.appearance.switch");
    expect(sw.props.disabled).toBe(true);
    // `value` must keep reflecting the stored themePreference ("system"),
    // not the override's effective theme — without this assertion, a
    // regression where `value` followed the override instead would go
    // uncaught here.
    expect(sw.props.value).toBe(true);
  });
});

describe("DeveloperOptionsSection — rendered directly (build-agnostic)", () => {
  beforeEach(() => {
    useSettingsStore.setState({ hydrated: true, settings: defaultSettings() });
  });

  test("DeveloperOptionsSection renders a row per registered palette + none", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <DeveloperOptionsSection />
      </ThemeProvider>,
    );

    expect(getByTestId("profile.devoptions.section")).toBeTruthy();
    expect(getByTestId("profile.theme.option.none")).toBeTruthy();
    expect(getByTestId("profile.theme.option.night")).toBeTruthy();
    expect(getByTestId("profile.theme.option.warm-deep")).toBeTruthy();
  });
});

describe("ProfileScreen — isTestBuild gating (real build-flag contract)", () => {
  // `isTestBuild` is only ever set once, by a real build (there's no
  // test-time equivalent of setting `EXPO_PUBLIC_APP_VARIANT` that would
  // re-trigger evaluation without a fresh module import), so there is no
  // env var to set per test here. What IS real and testable is that the
  // gate (`{isTestBuild && <DeveloperOptionsSection />}`) reads the flag
  // live from `@/lib/buildVariant` on every render — confirmed by replacing
  // the already-imported module's own exported property directly (no
  // isolateModules: that re-instantiates react itself and breaks hooks with
  // "Invalid hook call", since profile.tsx would then run against a
  // different react copy than the one react-test-renderer uses).
  //
  // The production direction is also covered end-to-end against a real
  // release bundle by `user_appearance_smoke.yaml` (Maestro).
  let isTestBuildMock: ReturnType<typeof jest.replaceProperty> | undefined;

  afterEach(() => {
    isTestBuildMock?.restore();
    act(() => {
      useAuthStore.setState({ user: null, token: null });
    });
  });

  function renderProfileScreen(isTestBuildValue: boolean) {
    isTestBuildMock = jest.replaceProperty(buildVariant, "isTestBuild", isTestBuildValue);
    useSettingsStore.setState({ hydrated: true, settings: defaultSettings() });
    useAuthStore.setState({ user: TEST_USER });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ProfileScreen />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
  }

  test("production build: Developer options never render", () => {
    const { getByTestId, queryByTestId } = renderProfileScreen(false);
    expect(getByTestId("profile.appearance.section")).toBeTruthy();
    expect(queryByTestId("profile.devoptions.section")).toBeNull();
  });

  test("test build: Developer options render", () => {
    const { getByTestId } = renderProfileScreen(true);
    expect(getByTestId("profile.devoptions.section")).toBeTruthy();
  });
});
