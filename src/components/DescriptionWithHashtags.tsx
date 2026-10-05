import { StyleSheet, Text, type TextStyle } from "react-native";

import { segmentDescription } from "@/lib/hashtags";
import { useThemedStyles } from "@/theme/useThemedStyles";
import type { ThemeColors } from "@/theme/themes";

type Props = {
  text: string;
  style?: TextStyle;
};

function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
    base: {
      color: c.inkBody,
      fontSize: 15,
      lineHeight: 22,
    },
    hashtag: {
      color: c.accent,
      textDecorationLine: "underline",
    },
  });
}

/** Renders description text with the first 5 hashtags highlighted. */
export function DescriptionWithHashtags({ text, style }: Props) {
  const s = useThemedStyles(buildStyles);
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
