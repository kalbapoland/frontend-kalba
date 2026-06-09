import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
  View,
} from "react-native";

import { useTagSuggestions } from "@/hooks/useTagSuggestions";
import {
  applySuggestion,
  detectActiveHashtag,
  findHashtags,
  isActiveHashtagBeyondCap,
  segmentDescription,
} from "@/lib/hashtags";
import { colors } from "@/theme/tokens";

type Props = Pick<TextInputProps, "placeholder" | "testID"> & {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * Multiline TextInput that visually highlights the first 5 hashtags and
 * shows an autocomplete dropdown when the user is typing a hashtag.
 *
 * Highlighting: a read-only Text overlay sits above a transparent native
 * TextInput; selection/caret/IME stay on the input.
 *
 * Autocomplete: when the cursor is inside an in-progress `#...`, we fetch
 * tag suggestions by prefix from the backend (sorted by popularity) and
 * render them as a tap-to-insert dropdown below the input.
 */
export function HashtagTextInput({ value, onChangeText, placeholder, testID }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const segments = segmentDescription(value);
  // Use `selection.end` (rightmost edge) as the cursor — works for both a
  // collapsed caret and a transient range selection that Android's predictive
  // text / autocorrect sometimes produces while the user is typing a word.
  // Without this, the dropdown would flicker open/closed every time the OS
  // briefly turned the caret into a range.
  const active = focused
    ? detectActiveHashtag(value, selection.end)
    : null;

  // The first MAX_TAGS_PER_WORKSHOP hashtags in the draft are what the
  // backend will actually persist; anything beyond that is plain text and
  // shouldn't be autocompleted. Deleting one of the existing tags drops the
  // count back below the cap and re-enables the dropdown automatically.
  const beyondCap =
    active !== null && isActiveHashtagBeyondCap(value, active);

  // Already-typed hashtags get filtered out of suggestions so the dropdown
  // doesn't repeat what's already in the draft. The hashtag the user is
  // actively typing is excluded from that filter — otherwise it would filter
  // itself the moment it becomes long enough for the parser to recognize, and
  // the dropdown would vanish exactly at the keystroke that completes a tag.
  const activeName = active?.prefix.toLowerCase() ?? null;
  const alreadyUsed = findHashtags(value)
    .map((h) => h.name)
    .filter((tag) => tag !== activeName);
  const suggestPrefix = beyondCap ? "" : active?.prefix ?? "";
  const { suggestions, isLoading } = useTagSuggestions(
    suggestPrefix,
    alreadyUsed,
  );

  const onSelectionChange = (
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => setSelection(e.nativeEvent.selection);

  const handlePickSuggestion = (tagName: string) => {
    if (!active) return;
    const result = applySuggestion(value, active, tagName);
    onChangeText(result.text);
    // Reset selection to where the insertion ended; the native TextInput will
    // catch up on the next render via its `selection` prop is not set, but
    // updating local state keeps the dropdown from immediately re-opening
    // on the now-completed tag.
    setSelection({ start: result.cursor, end: result.cursor });
  };

  // Show the dropdown only when there's something to show. Rendering a
  // spinner-only state during the in-flight fetch produces a 1-line empty
  // flash that vanishes once the API returns `[]` for a non-matching prefix
  // — perceived as a flicker. Waiting until results arrive trades a small
  // delay for a calm UI.
  const showDropdown = active !== null && suggestions.length > 0;

  return (
    <View>
      <View style={[s.container, focused && s.containerFocused]}>
        <Text style={s.overlay} pointerEvents="none">
          {segments.length === 0 ? (
            <Text style={s.placeholder}>{placeholder ?? ""}</Text>
          ) : (
            segments.map((seg, i) =>
              seg.type === "hashtag" ? (
                <Text key={i} style={s.hashtag}>
                  {seg.text}
                </Text>
              ) : (
                <Text key={i} style={s.plain}>
                  {seg.text}
                </Text>
              )
            )
          )}
        </Text>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          testID={testID}
          placeholderTextColor="transparent"
          multiline
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSelectionChange={onSelectionChange}
          style={s.input}
        />
      </View>

      {showDropdown ? (
        <View style={s.dropdown}>
          {isLoading && suggestions.length === 0 ? (
            <View style={s.dropdownLoading}>
              <ActivityIndicator size="small" color={colors.inkMuted} />
            </View>
          ) : (
            suggestions.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => handlePickSuggestion(tag)}
                accessibilityRole="button"
                accessibilityLabel={`Insert hashtag ${tag}`}
                style={({ pressed }) => [
                  s.dropdownItem,
                  pressed && s.dropdownItemPressed,
                ]}
              >
                <Text style={s.dropdownItemText}>
                  <Text style={s.dropdownItemHash}>#</Text>
                  {tag}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const TEXT_STYLE = {
  fontSize: 15,
  lineHeight: 22,
  color: colors.ink,
} as const;

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    minHeight: 100,
    position: "relative",
  },
  containerFocused: {
    borderColor: colors.primarySoft,
  },
  input: {
    ...TEXT_STYLE,
    color: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlignVertical: "top",
    minHeight: 100,
  },
  overlay: {
    ...TEXT_STYLE,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  plain: TEXT_STYLE,
  hashtag: {
    ...TEXT_STYLE,
    color: colors.accent,
    textDecorationLine: "underline",
  },
  placeholder: {
    ...TEXT_STYLE,
    color: colors.inkMuted,
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: colors.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownLoading: {
    paddingVertical: 12,
    alignItems: "center",
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineWhisper,
  },
  dropdownItemPressed: {
    backgroundColor: colors.primaryWash,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.ink,
  },
  dropdownItemHash: {
    color: colors.accent,
    fontWeight: "600",
  },
});
