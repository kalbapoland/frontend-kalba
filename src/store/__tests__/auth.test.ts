import { useAuthStore } from "../auth";

// expo-secure-store is auto-mocked by jest-expo preset
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const reset = () =>
  useAuthStore.setState({ token: null, user: null, isRestoringToken: true });

describe("useAuthStore", () => {
  beforeEach(reset);

  test("initial state has no token and no user", () => {
    const { token, user, isRestoringToken } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(user).toBeNull();
    expect(isRestoringToken).toBe(true);
  });

  test("signIn sets the token in state", async () => {
    await useAuthStore.getState().signIn("test-jwt-token");
    expect(useAuthStore.getState().token).toBe("test-jwt-token");
  });

  test("signOut clears token and user", async () => {
    await useAuthStore.getState().signIn("test-jwt-token");
    useAuthStore.getState().setUser({ id: "1", email: "a@b.com", full_name: "Test", is_active: true, role: "user" });
    await useAuthStore.getState().signOut();
    const { token, user } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(user).toBeNull();
  });

  test("setUser stores user in state", () => {
    const user = { id: "1", email: "a@b.com", full_name: "Test", is_active: true, role: "user" as const };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  test("restoreToken sets isRestoringToken to false", async () => {
    await useAuthStore.getState().restoreToken();
    expect(useAuthStore.getState().isRestoringToken).toBe(false);
  });
});
