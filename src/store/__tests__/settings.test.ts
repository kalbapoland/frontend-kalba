import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSettingsStore } from "@/store/settings";
import { defaultSettings, SETTINGS_VERSION } from "@/lib/persistence/schema";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

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
        settings: { themePreference: "night", consentsAccepted: ["tos_v1"] },
      }),
    );

    await useSettingsStore.getState().hydrate();

    expect(mockedGet).toHaveBeenCalledWith("kalba.settings.v1");
    expect(useSettingsStore.getState().settings.themePreference).toBe("night");
    expect(useSettingsStore.getState().hydrated).toBe(true);
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
        settings: { themePreference: "night", consentsAccepted: [] },
      }),
    );

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().settings.themePreference).toBe("night");
    expect(mockedSet).toHaveBeenCalledTimes(1); // migrated blob written back
  });

  test("hydrate does NOT write when the stored blob is valid and current", async () => {
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({
        version: SETTINGS_VERSION,
        settings: { themePreference: "night", consentsAccepted: [] },
      }),
    );

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().settings.themePreference).toBe("night");
    expect(mockedSet).not.toHaveBeenCalled();
  });

  test("hydrate survives storage read failure (defaults, still hydrated)", async () => {
    mockedGet.mockRejectedValueOnce(new Error("disk unlucky"));

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().hydrated).toBe(true);
    expect(useSettingsStore.getState().settings).toEqual(defaultSettings());
  });

  test("setThemePreference updates state and persists atomically", async () => {
    await useSettingsStore.getState().hydrate();
    mockedSet.mockClear();

    await useSettingsStore.getState().setThemePreference("warm-deep");

    expect(useSettingsStore.getState().settings.themePreference).toBe("warm-deep");
    expect(mockedSet).toHaveBeenCalledTimes(1);
    const [key, value] = mockedSet.mock.calls[0];
    expect(key).toBe("kalba.settings.v1");
    expect(JSON.parse(value).settings.themePreference).toBe("warm-deep");
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

    await useSettingsStore.getState().setThemePreference("night");

    expect(useSettingsStore.getState().settings.themePreference).toBe("night");
  });

  test("device-scope: the settings key never embeds the API URL", async () => {
    await useSettingsStore.getState().hydrate();

    for (const call of mockedGet.mock.calls) {
      expect(call[0]).toBe("kalba.settings.v1");
      expect(call[0]).not.toMatch(/localhost|127\.0\.0\.1|https?/);
    }
  });
});