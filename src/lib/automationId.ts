/**
 * Converts a display string to a stable automation testID slug.
 * Matches the pattern used by Maestro id: selectors for data-driven testIDs.
 */
export function toAutomationSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
