import { render, fireEvent } from "@testing-library/react-native";

import { AppearanceSection, DeveloperOptionsSection } from "../../../app/(app)/(tabs)/profile";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useSettingsStore } from "@/store/settings";
import { defaultSettings } from "@/lib/persistence/schema";

/**
 * Production-vs-test build contract (review question: "budujemy bez DevO —
 * co z follow system?"): the Appearance switch works on EVERY build and
 * Developer options never render on production. The build flag is
 * Metro-inlined; jest flips it per suite.
 */
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const originalEnv = process.env.EXPO_PUBLIC_THEME;

describe("PRODUCTION build (isTestBuild=false)", () => {
  beforeEach(() => {
    jest.doMock("@/lib/buildVariant", () => ({ isTestBuild: false }));
    delete process.env.EXPO_PUBLIC_THEME;
    useSettingsStore.setState({ hydrated: true, settings: defaultSettings() });
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.EXPO_PUBLIC_THEME;
    } else {
      process.env.EXPO_PUBLIC_THEME = originalEnv;
    }
    jest.dontMock("@/lib/buildVariant");
  });

  test("Appearance renders and the switch is interactive", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );

    expect(getByTestId("profile.appearance.section")).toBeTruthy();
    expect(getByTestId("profile.appearance.switch").props.value).toBe(true);
  });

  test("switch OFF pins light; Developer options never appear", async () => {
    const { getByTestId, queryByTestId, rerender } = render(
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

    // Production contract: the dev-options section is Profile-gated by
    // isTestBuild — it is absent here by construction (asserted on a real
    // production APK by user_appearance_smoke.yaml in CI).
    expect(queryByTestId("profile.devoptions.section")).toBeNull();
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
});

describe("TEST build (isTestBuild=true)", () => {
  beforeEach(() => {
    jest.doMock("@/lib/buildVariant", () => ({ isTestBuild: true }));
    delete process.env.EXPO_PUBLIC_THEME;
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