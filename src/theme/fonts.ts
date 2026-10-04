import {
  Fraunces_300Light,
  Fraunces_400Regular,
  Fraunces_500Medium,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

import { fonts } from "./tokens";

/**
 * Font assets keyed by the family name used in `fontFamily`.
 *
 * `useFonts` accepts any string key, so a family that is missing here would
 * silently fall back to the system font instead of failing. `buildFontMap`
 * turns that into a loud error.
 */
const FONT_ASSETS: Record<string, number> = {
  Fraunces_300Light,
  Fraunces_400Regular,
  Fraunces_500Medium,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
};

/**
 * Builds the `useFonts` map from `src/theme/fonts.json`, so a family added to
 * the font list cannot be silently left unloaded. Add the matching import to
 * `FONT_ASSETS` when you add a family.
 *
 * `names` is injectable so the failure path stays testable.
 */
export function buildFontMap(
  names: readonly string[] = Object.values(fonts),
): Record<string, number> {
  const map: Record<string, number> = {};

  for (const name of names) {
    const asset = FONT_ASSETS[name];

    if (asset === undefined) {
      throw new Error(
        `No font asset registered for "${name}" from src/theme/fonts.json. ` +
          "Add the matching import to FONT_ASSETS in src/theme/fonts.ts.",
      );
    }

    map[name] = asset;
  }

  return map;
}

/** Resolved once — `useFonts` reads the map only on mount. */
export const fontMap = buildFontMap();
