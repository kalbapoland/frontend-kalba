/**
 * Hashtag parsing — kept in sync with backend `app/services/hashtags.py`.
 *
 * Any change to the regex, normalization, or limits MUST be mirrored on
 * both sides; otherwise the highlighted tags in the input won't match the
 * tags the backend actually persists.
 */

export const MAX_TAGS_PER_WORKSHOP = 5;
export const MIN_TAG_LENGTH = 2;
export const MAX_TAG_LENGTH = 30;

// `\p{L}` letters (unicode), `\p{N}` digits, `_` — matches backend `\w` under
// re.UNICODE. Lookbehind ensures '#' is not preceded by a word char.
// Lookahead ensures the captured run ends on a non-word boundary, excluding
// over-long tags.
const HASHTAG_RE = new RegExp(
  String.raw`(?<![\p{L}\p{N}_])#([\p{L}\p{N}_]{${MIN_TAG_LENGTH},${MAX_TAG_LENGTH}})(?![\p{L}\p{N}_])`,
  "gu",
);

export interface HashtagMatch {
  /** Character index of the leading '#'. */
  start: number;
  /** Length of the full match including the leading '#'. */
  length: number;
  /** Normalized tag name (lowercase, NFC). */
  name: string;
}

/** Find at most MAX_TAGS_PER_WORKSHOP hashtags in `text`. */
export function findHashtags(text: string | null | undefined): HashtagMatch[] {
  if (!text) return [];
  const result: HashtagMatch[] = [];
  const seen = new Set<string>();
  HASHTAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HASHTAG_RE.exec(text)) !== null) {
    const raw = m[1];
    // toLowerCase (not toLocaleLowerCase) — locale-independent, matches
    // Python's str.casefold() for the Latin / Polish alphabet we target.
    const normalized = raw.normalize("NFC").toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push({
      start: m.index,
      length: m[0].length,
      name: normalized,
    });
    if (result.length >= MAX_TAGS_PER_WORKSHOP) break;
  }
  return result;
}

/** Return up to MAX_TAGS_PER_WORKSHOP normalized hashtag names. */
export function extractHashtagNames(text: string | null | undefined): string[] {
  return findHashtags(text).map((m) => m.name);
}

export type DescriptionSegment =
  | { type: "text"; text: string }
  | { type: "hashtag"; text: string; name: string };

const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;
const WORD_CHARS_ONLY_RE = /^[\p{L}\p{N}_]*$/u;
const WHITESPACE_RE = /\s/;

export interface ActiveHashtag {
  /** Index of the leading '#'. */
  start: number;
  /** Cursor position. */
  end: number;
  /** Characters typed between '#' and the cursor (may be empty). */
  prefix: string;
}

/**
 * Detect whether the cursor is currently inside a hashtag being typed.
 *
 * "Inside" means: walking backward from the cursor produces only word chars
 * (letters/digits/underscore) until reaching a '#', and that '#' itself is
 * not preceded by a word char (matching the parser's lookbehind).
 *
 * Returns the hashtag range and the typed prefix, or null when the cursor is
 * not actively editing a hashtag.
 */
export function detectActiveHashtag(
  text: string,
  cursor: number,
): ActiveHashtag | null {
  if (cursor < 0 || cursor > text.length) return null;

  for (let i = cursor - 1; i >= 0; i--) {
    const ch = text[i];
    if (WHITESPACE_RE.test(ch)) return null;
    if (ch === "#") {
      if (i > 0 && WORD_CHAR_RE.test(text[i - 1])) return null;
      const prefix = text.slice(i + 1, cursor);
      if (!WORD_CHARS_ONLY_RE.test(prefix)) return null;
      return { start: i, end: cursor, prefix };
    }
    if (!WORD_CHAR_RE.test(ch)) return null;
  }
  return null;
}

/**
 * Whether the user is composing a hashtag the backend would discard.
 *
 * Returns `true` when the active hashtag sits beyond the persistence cap —
 * i.e. the text already contains MAX_TAGS_PER_WORKSHOP valid hashtags and
 * the active one isn't among them (so it's a 6th, 7th, ...). UI uses this
 * to suppress autocomplete for hashtags that won't be saved.
 *
 * If a counted hashtag is deleted later, the count drops below the cap and
 * the active hashtag becomes eligible again — no special handling needed.
 */
export function isActiveHashtagBeyondCap(
  text: string,
  active: ActiveHashtag,
): boolean {
  const counted = findHashtags(text);
  const activeIsCounted = counted.some((h) => h.start === active.start);
  return counted.length >= MAX_TAGS_PER_WORKSHOP && !activeIsCounted;
}

/**
 * Apply a suggestion: replace the partial hashtag at `active` with the full
 * canonical tag name. Inserts a trailing space so the user can keep typing.
 * Returns the new text and the cursor position after insertion.
 */
export function applySuggestion(
  text: string,
  active: ActiveHashtag,
  tagName: string,
): { text: string; cursor: number } {
  const replacement = `#${tagName} `;
  const before = text.slice(0, active.start);
  const after = text.slice(active.end);
  return {
    text: before + replacement + after,
    cursor: before.length + replacement.length,
  };
}

/**
 * Split text into segments for rendering. Hashtags beyond the 5-tag cap are
 * emitted as plain text segments — they aren't highlighted and won't be
 * persisted by the backend.
 */
export function segmentDescription(
  text: string | null | undefined,
): DescriptionSegment[] {
  if (!text) return [];
  const matches = findHashtags(text);
  if (matches.length === 0) return [{ type: "text", text }];

  const segments: DescriptionSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) {
      segments.push({ type: "text", text: text.slice(cursor, match.start) });
    }
    segments.push({
      type: "hashtag",
      text: text.slice(match.start, match.start + match.length),
      name: match.name,
    });
    cursor = match.start + match.length;
  }
  if (cursor < text.length) {
    segments.push({ type: "text", text: text.slice(cursor) });
  }
  return segments;
}
