import { apiClient } from "../client";
import { exchangeGoogleToken, sendHostAction } from "../endpoints";

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

describe("sendHostAction", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedPost.mockResolvedValue({
      data: { status: "accepted", action: "remove_participant", broadcast_sent: false },
    });
  });

  test("includes target_user_id when removing a participant", async () => {
    await sendHostAction("ws-1", "remove_participant", "user-9");
    expect(mockedPost).toHaveBeenCalledWith(
      "/video/workshops/ws-1/host-action",
      { action: "remove_participant", target_user_id: "user-9" },
    );
  });

  test("omits target_user_id for broadcast actions", async () => {
    await sendHostAction("ws-1", "mute_all");
    expect(mockedPost).toHaveBeenCalledWith(
      "/video/workshops/ws-1/host-action",
      { action: "mute_all" },
    );
  });
});