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
  extractHashtagNames,
  segmentDescription,
} from "@/lib/hashtags";
import { colors } from "@/theme/tokens";

type Props = Pick<TextInputProps, "placeholder"> & {
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
export function HashtagTextInput({ value, onChangeText, placeholder }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const segments = segmentDescription(value);
  const isCollapsed = selection.start === selection.end;
  const active =
    focused && isCollapsed
      ? detectActiveHashtag(value, selection.start)
      : null;

  const alreadyUsed = extractHashtagNames(value);
  const { suggestions, isLoading } = useTagSuggestions(
    active?.prefix ?? "",
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

  const showDropdown =
    active !== null && (isLoading || suggestions.length > 0);

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
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
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
