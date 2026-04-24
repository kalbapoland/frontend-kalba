const requestUse = jest.fn();
const responseUse = jest.fn();
const mockApiClient = Object.assign(jest.fn(), {
  post: jest.fn(),
  interceptors: {
    request: { use: requestUse },
    response: { use: responseUse },
  },
});

const mockIsAxiosError = jest.fn(() => true);
const mockLoadRefreshToken = jest.fn();
const mockSignIn = jest.fn().mockResolvedValue(undefined);
const mockSignOut = jest.fn().mockResolvedValue(undefined);

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockApiClient),
    isAxiosError: mockIsAxiosError,
  },
  create: jest.fn(() => mockApiClient),
  isAxiosError: mockIsAxiosError,
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiUrlNative: "https://api.example.com/api/v1",
      },
    },
  },
}));

jest.mock("@/store/auth", () => ({
  loadRefreshToken: mockLoadRefreshToken,
  useAuthStore: {
    getState: () => ({
      token: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
    }),
  },
}));

describe("apiClient auth retry interceptor", () => {
  let rejectHandler: (error: any) => Promise<unknown>;

  beforeAll(() => {
    require("../client");
    rejectHandler = responseUse.mock.calls[0][1];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAxiosError.mockReturnValue(true);
    mockApiClient.mockReset();
    mockApiClient.post.mockReset();
  });

  test("stores rotated refresh token before retrying the original request", async () => {
    const error = {
      config: {
        url: "/users/me",
        headers: {},
      },
      response: {
        status: 401,
      },
    };

    mockLoadRefreshToken.mockResolvedValue("stored-refresh-token");
    mockApiClient.post.mockResolvedValue({
      data: {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
      },
    });
    mockApiClient.mockResolvedValue({ data: { ok: true } });

    await rejectHandler(error);

    expect(mockApiClient.post).toHaveBeenCalledWith(
      "/auth/refresh",
      { refresh_token: "stored-refresh-token" },
      { _skipAuthRefresh: true },
    );
    expect(mockSignIn).toHaveBeenCalledWith(
      "new-access-token",
      "new-refresh-token",
    );
    expect(error.config.headers.Authorization).toBe("Bearer new-access-token");
    expect(mockApiClient).toHaveBeenCalledWith(error.config);
  });

  test("does not try to refresh a failed refresh request", async () => {
    const error = {
      config: {
        url: "/auth/refresh",
        headers: {},
      },
      response: {
        status: 401,
      },
    };

    await expect(rejectHandler(error)).rejects.toBe(error);

    expect(mockLoadRefreshToken).not.toHaveBeenCalled();
    expect(mockApiClient.post).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockApiClient).not.toHaveBeenCalled();
  });
});