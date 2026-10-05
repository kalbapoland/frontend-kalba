import * as Application from "expo-application";

/**
 * App version as installed on the device — read from the native binary, so
 * it is identical to what the OS shows (Android: Settings → Apps → Kalba).
 *
 * `nativeApplicationVersion` is the store-facing versionName; the optional
 * build suffix comes from versionCode (Android) / buildNumber (iOS).
 *
 * Fail-safe: expo-application returns null on unsupported hosts (some web
 * contexts) — callers then render "unknown" instead of crashing.
 */
export function appVersion(): string {
  return Application.nativeApplicationVersion ?? "unknown";
}

export function appBuildVersion(): string {
  return Application.nativeBuildVersion ?? "unknown";
}

/** Human-readable label: "1.0.0 (1)" — or just the version when the build
 *  number is unavailable. */
export function appVersionLabel(includeBuild = false): string {
  const version = appVersion();

  if (!includeBuild) {
    return version;
  }

  return `${version} (${appBuildVersion()})`;
}