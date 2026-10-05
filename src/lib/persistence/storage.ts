import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Single persistence adapter for app settings. AsyncStorage is the chosen
 * engine (device-scoped key-value; no native rebuild needed) — if it is ever
 * swapped for another KV engine, only this file changes.
 */
export function readRawSettings(storageKey: string): Promise<string | null> {
  return AsyncStorage.getItem(storageKey);
}

export function writeRawSettings(storageKey: string, value: string): Promise<void> {
  return AsyncStorage.setItem(storageKey, value);
}