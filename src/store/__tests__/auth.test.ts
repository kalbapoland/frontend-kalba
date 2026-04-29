import { useAuthStore } from "../auth";
import * as SecureStore from "expo-secure-store";

// expo-secure-store is auto-mocked by jest-expo preset
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const SCOPED_TOKEN_KEY = "kalba_token_http_localhost_8000_api_v1";
const SCOPED_REFRESH_TOKEN_KEY = "kalba_refresh_token_http_localhost_8000_api_v1";

const reset = () =>
  useAuthStore.setState({ token: null, user: null, isRestoringToken: true });

describe("useAuthStore", () => {
  beforeEach(() => {
    reset();
    jest.clearAllMocks();
  });

  test("initial state has no token and no user", () => {
    const { token, user, isRestoringToken } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(user).toBeNull();
    expect(isRestoringToken).toBe(true);
  });

  test("signIn sets the token in state", async () => {
    await useAuthStore.getState().signIn("test-jwt-token", "test-refresh-token");
    expect(useAuthStore.getState().token).toBe("test-jwt-token");
  });

  test("signIn tolerates a missing refresh token", async () => {
    await useAuthStore.getState().signIn("test-jwt-token");

    expect(useAuthStore.getState().token).toBe("test-jwt-token");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      SCOPED_TOKEN_KEY,
      "test-jwt-token",
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      SCOPED_REFRESH_TOKEN_KEY,
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("kalba_token");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "kalba_refresh_token",
    );
  });

  test("signIn rejects non-string refresh tokens", async () => {
    await expect(
      useAuthStore.getState().signIn("test-jwt-token", { token: "bad" } as never),
    ).rejects.toThrow("Invalid refresh_token");
  });

  test("signOut clears token and user", async () => {
    await useAuthStore.getState().signIn("test-jwt-token", "test-refresh-token");
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
