import { consumePendingOAuthUrl, setPendingOAuthUrl } from "../oauth-url";

describe("oauth-url", () => {
  afterEach(() => {
    // Reset state between tests
    consumePendingOAuthUrl();
  });

  test("consumePendingOAuthUrl returns null when nothing was set", () => {
    expect(consumePendingOAuthUrl()).toBeNull();
  });

  test("consumePendingOAuthUrl returns the URL that was set", () => {
    setPendingOAuthUrl("https://example.com/callback?code=abc");
    expect(consumePendingOAuthUrl()).toBe("https://example.com/callback?code=abc");
  });

  test("consumePendingOAuthUrl clears the URL after reading", () => {
    setPendingOAuthUrl("https://example.com");
    consumePendingOAuthUrl();
    expect(consumePendingOAuthUrl()).toBeNull();
  });

  test("setPendingOAuthUrl overwrites previous value", () => {
    setPendingOAuthUrl("https://first.com");
    setPendingOAuthUrl("https://second.com");
    expect(consumePendingOAuthUrl()).toBe("https://second.com");
  });
});
