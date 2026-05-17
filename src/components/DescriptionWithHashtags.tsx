import { StyleSheet, Text, type TextStyle } from "react-native";

import { segmentDescription } from "@/lib/hashtags";
import { colors } from "@/theme/tokens";

type Props = {
  text: string;
  style?: TextStyle;
};

/** Renders description text with the first 5 hashtags highlighted. */
export function DescriptionWithHashtags({ text, style }: Props) {
  const segments = segmentDescription(text);
  if (segments.length === 0) {
    return null;
  }

  return (
    <Text style={[s.base, style]}>
      {segments.map((seg, i) =>
        seg.type === "hashtag" ? (
          <Text key={i} style={s.hashtag}>
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        )
      )}
    </Text>
  );
}

const s = StyleSheet.create({
  base: {
    color: colors.inkBody,
    fontSize: 15,
    lineHeight: 22,
  },
  hashtag: {
    color: colors.accent,
    textDecorationLine: "underline",
  },
});
