import { apiClient } from "../client";
import { exchangeGoogleToken } from "../endpoints";

jest.mock("../client", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockedPost = apiClient.post as jest.Mock;

describe("exchangeGoogleToken", () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  test("normalizes a missing refresh token", async () => {
    mockedPost.mockResolvedValue({
      data: {
        access_token: "test-access-token",
        token_type: "bearer",
        user_id: "user-123",
      },
    });

    await expect(exchangeGoogleToken("google-id-token")).resolves.toEqual({
      access_token: "test-access-token",
      refresh_token: null,
      token_type: "bearer",
      user_id: "user-123",
    });
  });

  test("rejects non-string access tokens", async () => {
    mockedPost.mockResolvedValue({
      data: {
        access_token: { token: "bad" },
        refresh_token: "refresh-token",
      },
    });

    await expect(exchangeGoogleToken("google-id-token")).rejects.toThrow(
      "Invalid auth response field access_token",
    );
  });
});