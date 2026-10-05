/**
 * Global test setup: native modules the settings persistence imports must be
 * mockable everywhere. AsyncStorage ships native code, so any suite that
 * transitively imports the settings store (theme provider, themed styles,
 * persistence) would otherwise crash at import time with
 * "NativeModule: AsyncStorage is null".
 *
 * Suites that need specific behaviour override these mocks locally
 * (jest.mock in the test file), and `jest.clearAllMocks` in each suite's
 * beforeEach clears the shared mock state.
 */
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));