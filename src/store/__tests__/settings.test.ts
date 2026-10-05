import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSettingsStore } from "@/store/settings";
import { defaultSettings, SETTINGS_VERSION } from "@/lib/persistence/schema";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// The settings store hydrates through validateSettings, which honours the
// dev override only on test builds — these are test-build behaviour tests.
jest.mock("@/lib/buildVariant", () => ({ isTestBuild: true }));

const mockedGet = AsyncStorage.getItem as jest.Mock;
const mockedSet = AsyncStorage.setItem as jest.Mock;

// The store API is plain state + actions, so tests drive it via getState()
// directly — no rendering, no react-test-renderer version constraints.
describe("useSettingsStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({ hydrated: false, settings: defaultSettings() });
  });

  test("hydrate stores the parsed blob under the settings key", async () => {
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({
        version: SETTINGS_VERSION,
        settings: { themePreference: "system", devThemeOverride: "night", consentsAccepted: ["tos_v1"] },
      }),
    );

    await useSettingsStore.getState().hydrate();

    expect(mockedGet).toHaveBeenCalledWith("kalba.settings.v1");
    expect(useSettingsStore.getState().settings.devThemeOverride).toBe("night");
    expect(useSettingsStore.getState().settings.themePreference).toBe("system");
    expect(useSettingsStore.getState().hydrated).toBe(true);
  });

  test("v1 blob migrates: concrete palette preference → system-follow (override cleared)", async () => {
    // v1 stored concrete palette names in themePreference; the v2 policy is
    // "system" + optional dev override. A pre-v2 "night" degrades to
    // system-following — a user's old palette choice is not silently kept.
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({
        version: 1,
        settings: { themePreference: "night", consentsAccepted: ["tos_v1"] },
      }),
    );

    await useSettingsStore.getState().hydrate();

    const settings = useSettingsStore.getState().settings;
    expect(settings.themePreference).toBe("system");
    expect(settings.devThemeOverride).toBeNull();
    expect(settings.consentsAccepted).toEqual(["tos_v1"]);
    // Version bump triggers the repair (rewrite as v2).
    expect(mockedSet).toHaveBeenCalledTimes(1);
    const persisted = JSON.parse(mockedSet.mock.calls[0][1]);
    expect(persisted.version).toBe(2);
    expect(persisted.settings.devThemeOverride).toBeNull();
  });

  test("hydrate repairs storage when the blob is corrupt", async () => {
    mockedGet.mockResolvedValueOnce("{corrupt");

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().settings).toEqual(defaultSettings());
    // Repair write of a valid blob must have been issued.
    expect(mockedSet).toHaveBeenCalledWith(
      "kalba.settings.v1",
      JSON.stringify({ version: SETTINGS_VERSION, settings: defaultSettings() }),
    );
  });

  test("hydrate repairs storage when the blob is from an older schema version", async () => {
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({
        version: SETTINGS_VERSION - 1,
        settings: { themePreference: "system", devThemeOverride: null, consentsAccepted: [] },
      }),
    );

    await useSettingsStore.getState().hydrate();

    expect(mockedSet).toHaveBeenCalledTimes(1); // migrated blob written back
    expect(JSON.parse(mockedSet.mock.calls[0][1]).version).toBe(SETTINGS_VERSION);
  });

  test("hydrate does NOT write when the stored blob is valid and current", async () => {
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({
        version: SETTINGS_VERSION,
        settings: { themePreference: "system", devThemeOverride: "warm-deep", consentsAccepted: [] },
      }),
    );

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().settings.devThemeOverride).toBe("warm-deep");
    expect(mockedSet).not.toHaveBeenCalled();
  });

  test("hydrate survives storage read failure (defaults, still hydrated)", async () => {
    mockedGet.mockRejectedValueOnce(new Error("disk unlucky"));

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().hydrated).toBe(true);
    expect(useSettingsStore.getState().settings).toEqual(defaultSettings());
  });

  test("setFollowSystem toggles the appearance policy and persists (review: switch ON/OFF)", async () => {
    await useSettingsStore.getState().hydrate();
    mockedSet.mockClear();

    // OFF: pin the light palette regardless of the OS setting.
    await useSettingsStore.getState().setFollowSystem(false);

    let settings = useSettingsStore.getState().settings;
    expect(settings.themePreference).toBe("light");
    expect(settings.devThemeOverride).toBeNull(); // untouched by the switch
    expect(mockedSet).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockedSet.mock.calls[0][1]).settings.themePreference).toBe("light");

    // ON: follow the OS light/dark switch again.
    await useSettingsStore.getState().setFollowSystem(true);

    settings = useSettingsStore.getState().settings;
    expect(settings.themePreference).toBe("system");
    expect(mockedSet).toHaveBeenCalledTimes(2);
  });

  test("production build ignores a stale test-build dev override on hydration (review Major #1)", () => {
    // AsyncStorage survives app replacement: a device moving from a -test
    // build (override night) to a production build must boot system-follow,
    // with no stuck palette and no in-app way to clear the override needed.
    // validateSettings is pure — the production path is exercised directly
    // via the testMode parameter (default: the real build flag).
    const { validateSettings } = jest.requireActual<typeof import("@/lib/persistence/validate")>(
      "@/lib/persistence/validate",
    );

    const productionResult = validateSettings(
      { themePreference: "system", devThemeOverride: "night", consentsAccepted: ["tos_v1"] },
      false,
    );

    expect(productionResult.devThemeOverride).toBeNull();
    expect(productionResult.consentsAccepted).toEqual(["tos_v1"]);
    expect(productionResult.themePreference).toBe("system");

    // The test-build path (this suite's mocked flag) keeps the override.
    const testResult = validateSettings(
      { themePreference: "system", devThemeOverride: "night", consentsAccepted: ["tos_v1"] },
      true,
    );
    expect(testResult.devThemeOverride).toBe("night");
  });

  test("setDevThemeOverride stores the concrete palette (test-build override)", async () => {
    await useSettingsStore.getState().hydrate();
    mockedSet.mockClear();

    await useSettingsStore.getState().setDevThemeOverride("warm-deep");

    expect(useSettingsStore.getState().settings.devThemeOverride).toBe("warm-deep");
    expect(mockedSet).toHaveBeenCalledTimes(1);
    const [key, value] = mockedSet.mock.calls[0];
    expect(key).toBe("kalba.settings.v1");
    expect(JSON.parse(value).settings.devThemeOverride).toBe("warm-deep");
  });

  test("hydrate first-run (no blob) writes defaults exactly once", async () => {
    mockedGet.mockResolvedValueOnce(null);

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().settings).toEqual(defaultSettings());
    expect(mockedSet).toHaveBeenCalledTimes(1);
    expect(mockedSet).toHaveBeenCalledWith(
      "kalba.settings.v1",
      JSON.stringify({ version: SETTINGS_VERSION, settings: defaultSettings() }),
    );
  });

  test("persist failure does not throw and state stays applied", async () => {
    mockedSet.mockRejectedValueOnce(new Error("disk full"));

    await useSettingsStore.getState().setDevThemeOverride("night");

    expect(useSettingsStore.getState().settings.devThemeOverride).toBe("night");
  });

  test("device-scope: the settings key never embeds the API URL", async () => {
    await useSettingsStore.getState().hydrate();

    for (const call of mockedGet.mock.calls) {
      expect(call[0]).toBe("kalba.settings.v1");
      expect(call[0]).not.toMatch(/localhost|127\.0\.0\.1|https?/);
    }
  });
});