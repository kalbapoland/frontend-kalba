import { render, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, type Metrics } from "react-native-safe-area-context";

import ProfileScreen from "../../../app/(app)/(tabs)/profile";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useSettingsStore } from "@/store/settings";
import { useAuthStore } from "@/store/auth";
import { defaultSettings } from "@/lib/persistence/schema";

// `initialWindowMetrics` is populated natively at app startup; under Jest
// there's no native measurement, so it's always `null` and SafeAreaProvider
// withholds its children forever. Tests that render a full screen must
// supply fixed metrics instead.
const TEST_SAFE_AREA_METRICS: Metrics = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

describe("ProfileScreen — edit name modal", () => {
  beforeEach(() => {
    useSettingsStore.setState({ hydrated: true, settings: defaultSettings() });
    useAuthStore.setState({
      user: { id: "1", email: "ada@example.com", full_name: "Ada Lovelace", is_active: true, role: "user" },
    });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, token: null });
  });

  test("regression: opening the editor renders exactly one name input (PR #126 duplicate-modal bug)", () => {
    // The screen only reads `user`/`signOut` from the auth store (not
    // `token`), so no token is set up above; `retry: false` keeps any
    // mutation failure from retrying and slowing the test down.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { getByTestId, queryAllByTestId, getAllByTestId } = render(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ProfileScreen />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    );

    expect(queryAllByTestId("profile.editname.input")).toHaveLength(0);

    fireEvent.press(getByTestId("profile.editname.button"));

    // The edit-name Modal was briefly duplicated (once inside the
    // ScrollView, once outside) — opening it mounted two overlapping
    // inputs/save buttons sharing the same testID and state. Guards
    // against that regression, since a plain `id:` Maestro tap only
    // ever matches the first one and wouldn't catch a reappearing dupe.
    expect(getAllByTestId("profile.editname.input")).toHaveLength(1);
  });
});
