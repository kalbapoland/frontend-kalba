import * as Application from "expo-application";

import { appBuildVersion, appVersion, appVersionLabel } from "@/lib/appVersion";

const ORIGINAL = {
  nativeApplicationVersion: Application.nativeApplicationVersion,
  nativeBuildVersion: Application.nativeBuildVersion,
};

afterEach(() => {
  // Restore the real (Jest-constant) values so suites stay independent.
  Object.defineProperty(Application, "nativeApplicationVersion", {
    value: ORIGINAL.nativeApplicationVersion,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(Application, "nativeBuildVersion", {
    value: ORIGINAL.nativeBuildVersion,
    configurable: true,
    writable: true,
  });
});

function setNative(version: string | null, build: string | null): void {
  Object.defineProperty(Application, "nativeApplicationVersion", {
    value: version,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(Application, "nativeBuildVersion", {
    value: build,
    configurable: true,
    writable: true,
  });
}

describe("appVersion", () => {
  test("reads the native version identical to the OS app settings", () => {
    setNative("1.2.3", "7");

    expect(appVersion()).toBe("1.2.3");
    expect(appBuildVersion()).toBe("7");
  });

  test("label without build is the bare version (user-facing footers)", () => {
    setNative("1.2.3", "7");

    expect(appVersionLabel()).toBe("1.2.3");
    expect(appVersionLabel(false)).toBe("1.2.3");
  });

  test("label with build matches the versionName (versionCode) pairing", () => {
    setNative("1.2.3", "7");

    expect(appVersionLabel(true)).toBe("1.2.3 (7)");
  });

  test("null native values degrade to unknown instead of crashing", () => {
    setNative(null, null);

    expect(appVersion()).toBe("unknown");
    expect(appBuildVersion()).toBe("unknown");
    expect(appVersionLabel(true)).toBe("unknown (unknown)");
  });
});
