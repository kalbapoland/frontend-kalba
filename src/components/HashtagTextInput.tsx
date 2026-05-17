import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { segmentDescription } from "@/lib/hashtags";
import { colors } from "@/theme/tokens";

type Props = Pick<TextInputProps, "placeholder"> & {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * Multiline TextInput that visually highlights the first 5 hashtags in the
 * value. Highlighting is a read-only overlay rendered behind a transparent
 * TextInput — selection, caret and IME stay in the native input.
 *
 * The 6th+ hashtag and over-long / too-short tags render as plain text and
 * are NOT persisted by the backend (which uses the same parser).
 */
export function HashtagTextInput({ value, onChangeText, placeholder }: Props) {
  const [focused, setFocused] = useState(false);
  const segments = segmentDescription(value);

  return (
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
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="transparent"
        multiline
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={s.input}
      />
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
});
