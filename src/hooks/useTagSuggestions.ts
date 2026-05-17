import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { suggestTags } from "@/api/endpoints";

const DEBOUNCE_MS = 200;
const SUGGESTION_LIMIT = 10;
const STALE_MS = 30_000;

/**
 * Fetch tag suggestions for the prefix the user is currently typing.
 *
 * Debounces by DEBOUNCE_MS so we don't fire a request per keystroke. Returns
 * an empty list when prefix is empty (no "popular tags overall" view today —
 * we only autocomplete what's being typed).
 *
 * @param prefix The active hashtag prefix (without the leading '#').
 * @param excluded Tags already used in the current draft — filtered client-side
 *                 so users don't see duplicate suggestions for the same tag.
 */
export function useTagSuggestions(prefix: string, excluded: string[] = []) {
  const [debouncedPrefix, setDebouncedPrefix] = useState(prefix);

  useEffect(() => {
    if (prefix === "") {
      setDebouncedPrefix("");
      return;
    }
    const handle = setTimeout(() => setDebouncedPrefix(prefix), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [prefix]);

  const query = useQuery({
    queryKey: ["tag-suggestions", debouncedPrefix],
    queryFn: () => suggestTags(debouncedPrefix, SUGGESTION_LIMIT),
    enabled: debouncedPrefix.length >= 1,
    staleTime: STALE_MS,
    // Keep previous results visible while the new prefix's query is in flight,
    // so the dropdown doesn't briefly empty out between keystrokes.
    placeholderData: keepPreviousData,
  });

  const excludedSet = new Set(excluded);
  const suggestions = (query.data ?? []).filter((tag) => !excludedSet.has(tag));

  if (__DEV__ && debouncedPrefix.length >= 1) {
    console.log(
      "[tag-suggestions]",
      JSON.stringify({
        prefix,
        debouncedPrefix,
        excluded,
        rawData: query.data,
        suggestions,
        isFetching: query.isFetching,
      }),
    );
  }

  return {
    suggestions,
    isLoading: query.isFetching && debouncedPrefix.length >= 1,
  };
}
