import { create } from "zustand";

import {
  defaultSettings,
  SETTINGS_VERSION,
  type SettingsSchema,
} from "@/lib/persistence/schema";
import { parseAndMigrate } from "@/lib/persistence/migrate";
import {
  readRawSettings,
  writeRawSettings,
} from "@/lib/persistence/storage";
import type { ThemeName } from "@/theme/themes";

/**
 * Device-scoped app settings. Deliberately NOT routed through the auth
 * store's backend-scoped keys: switching the API environment must never reset
 * the user's appearance. One serialized blob under one storage key.
 */
const SETTINGS_KEY = "kalba.settings.v1";

type SettingsState = {
  /** True once hydration finished (defaults before that). */
  hydrated: boolean;
  settings: SettingsSchema;
  hydrate: () => Promise<void>;
  /** Appearance switch: ON = follow system, OFF = pinned light. */
  setFollowSystem: (on: boolean) => Promise<void>;
  setDevThemeOverride: (theme: ThemeName | null) => Promise<void>;
};

function serialize(settings: SettingsSchema): string {
  return JSON.stringify({ version: SETTINGS_VERSION, settings });
}

async function persist(settings: SettingsSchema): Promise<void> {
  // Write failures must not break the UI — the user just loses the change on
  // next launch. Storage errors are logged with no PII.
  try {
    await writeRawSettings(SETTINGS_KEY, serialize(settings));
  } catch (error) {
    console.warn("[settings] persist failed:", error);
  }
}

/**
 * True when the stored blob needs an eager repair write: absent, corrupt, or
 * persisted by a different schema version than the running one. A valid,
 * current blob is left untouched — cold starts then pay a read only.
 */
function needsRepair(raw: string | null, currentVersion: number): boolean {
  if (raw === null) {
    return true;
  }

  try {
    const blob = JSON.parse(raw) as { version?: unknown } | null;

    return typeof blob !== "object" || blob === null
      || typeof blob.version !== "number"
      || blob.version !== currentVersion;
  } catch {
    return true;
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hydrated: false,
  settings: defaultSettings(),

  hydrate: async () => {
    let raw: string | null = null;

    try {
      raw = await readRawSettings(SETTINGS_KEY);
    } catch (error) {
      console.warn("[settings] hydration failed, using defaults:", error);
      raw = null;
    }

    const parsed = parseAndMigrate(raw);

    // Repair only when the stored shape/version was actually broken (or the
    // schema migrated forward) — see needsRepair. A healthy cold start is
    // then a single read.
    if (needsRepair(raw, SETTINGS_VERSION)) {
      await persist(parsed);
    }

    set({ settings: parsed, hydrated: true });
  },

  setFollowSystem: async (on) => {
    // Appearance switch: ON = follow the OS light/dark toggle; OFF = pin the
    // light palette regardless of the system setting. The dev override
    // (test builds) is NOT touched here — Developer options manages it.
    const next: SettingsSchema = {
      ...get().settings,
      themePreference: on ? "system" : "light",
    };
    set({ settings: next });
    await persist(next);
  },

  setDevThemeOverride: async (theme) => {
    const next: SettingsSchema = { ...get().settings, devThemeOverride: theme };
    set({ settings: next });
    await persist(next);
  },
}));