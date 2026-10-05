/**
 * Migrates a raw persisted blob into a validated settings object.
 *
 * Contract: a broken settings blob must never crash startup. Unknown/corrupt
 * input degrades to schema defaults, and the caller repairs storage on the
 * next persist.
 *
 * `testMode` propagates to `validateSettings` (default: the real build
 * flag) so tests can exercise both build flavours explicitly.
 */

import { SETTINGS_VERSION } from "./schema";
import { validateSettings } from "./validate";
import type { SettingsSchema } from "./schema";
import { isTestBuild } from "@/lib/buildVariant";

type PersistedBlob = {
  version: number;
  settings: Record<string, unknown>;
};

export function parseAndMigrate(
  raw: string | null,
  currentVersion: number = SETTINGS_VERSION,
  testMode: boolean = isTestBuild,
): SettingsSchema {
  const validate = (input: unknown): SettingsSchema => validateSettings(input, testMode);

  if (raw === null) {
    return validate(null);
  }

  let blob: unknown;
  try {
    blob = JSON.parse(raw);
  } catch {
    return validate(null);
  }

  if (typeof blob !== "object" || blob === null || Array.isArray(blob)) {
    return validate(null);
  }

  const candidate = blob as Partial<PersistedBlob> & Record<string, unknown>;
  const version = typeof candidate.version === "number" ? candidate.version : null;
  const settings =
    typeof candidate.settings === "object"
    && candidate.settings !== null
    && !Array.isArray(candidate.settings)
      ? (candidate.settings as Record<string, unknown>)
      : null;

  if (version === null || settings === null) {
    return validate(null);
  }

  // v1 is the first schema; future versions add per-version migrations here
  // before falling through to validation.
  if (version > currentVersion) {
    // Persisted by a NEWER app build (e.g. downgraded install). Fields the
    // current schema does not know are dropped by validation.
    return validate(settings);
  }

  return validate(settings);
}