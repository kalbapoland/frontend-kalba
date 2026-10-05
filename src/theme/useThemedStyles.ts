import { useMemo } from "react";

import { useTheme } from "./ThemeProvider";
import type { ThemeColors } from "./themes";

type StylesFactory<T> = (colors: ThemeColors) => T;

/**
 * Cache of built StyleSheet objects: palette instance → factory → styles.
 * `StyleSheet.create` registers styles with the native side — that cost is
 * paid once per (palette, factory) pair for the whole app, not per render or
 * per mount. WeakMaps let palettes and factories be collected when no longer
 * referenced.
 */
const cache = new WeakMap<ThemeColors, WeakMap<StylesFactory<object>, object>>();

/**
 * Pure cache read/build, extracted from the hook so the semantics (identity
 * keyed, rebuild on palette or factory change) are directly testable without
 * rendering.
 */
export function getOrCreateCachedStyles<T extends object>(
  colors: ThemeColors,
  factory: StylesFactory<T>,
): T {
  let perFactory = cache.get(colors);

  if (perFactory === undefined) {
    perFactory = new WeakMap();
    cache.set(colors, perFactory);
  }

  const cached = perFactory.get(factory) as T | undefined;
  if (cached !== undefined) {
    return cached;
  }

  const built = factory(colors);
  perFactory.set(factory, built);

  return built;
}

/**
 * Builds styles from the active theme with per-palette caching.
 *
 * `factory` MUST be a stable module-level reference (or memoised callback):
 * cache identity is the function reference itself, so a factory recreated
 * inline on every render would rebuild styles every time.
 */
export function useThemedStyles<T extends object>(factory: StylesFactory<T>): T {
  const { colors } = useTheme();

  return useMemo(
    () => getOrCreateCachedStyles(colors, factory),
    [colors, factory],
  );
}