/**
 * Migrates a raw persisted blob into a validated settings object.
 *
 * Contract: a broken settings blob must never crash startup. Unknown/corrupt
 * input degrades to schema defaults, and the caller repairs storage on the
 * next persist.
 */

import { SETTINGS_VERSION } from "./schema";
import { validateSettings } from "./validate";
import type { SettingsSchema } from "./schema";

type PersistedBlob = {
  version: number;
  settings: Record<string, unknown>;
};

export function parseAndMigrate(
  raw: string | null,
  currentVersion: number = SETTINGS_VERSION,
): SettingsSchema {
  if (raw === null) {
    return validateSettings(null);
  }

  let blob: unknown;
  try {
    blob = JSON.parse(raw);
  } catch {
    return validateSettings(null);
  }

  if (typeof blob !== "object" || blob === null || Array.isArray(blob)) {
    return validateSettings(null);
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
    return validateSettings(null);
  }

  // v1 is the first schema; future versions add per-version migrations here
  // before falling through to `validateSettings`.
  if (version > currentVersion) {
    // Persisted by a NEWER app build (e.g. downgraded install). Fields the
    // current schema does not know are dropped by `validateSettings`.
    return validateSettings(settings);
  }

  return validateSettings(settings);
}