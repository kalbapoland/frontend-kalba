import { useState } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { lightImpact } from "@/lib/haptics";
import { colors, layout, motion } from "@/theme/tokens";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: "grid", inactive: "grid-outline" },
  groups: { active: "people", inactive: "people-outline" },
  "my-kalba": { active: "sparkles", inactive: "sparkles-outline" },
  calendar: { active: "calendar", inactive: "calendar-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

const INDICATOR_SIZE = 44;

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(focused ? 1.12 : 1, {
          damping: 14,
          stiffness: 220,
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? colors.primary : colors.inkMuted}
      />
    </Animated.View>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [pillWidth, setPillWidth] = useState(0);

  const tabCount = state.routes.length;
  const innerWidth = pillWidth - 2 * PILL_PADDING;
  const tabWidth = tabCount > 0 ? innerWidth / tabCount : 0;

  const indicatorStyle = useAnimatedStyle(() => {
    const targetX =
      PILL_PADDING + state.index * tabWidth + (tabWidth - INDICATOR_SIZE) / 2;
    return {
      opacity: tabWidth > 0 ? withTiming(1, { duration: motion.base }) : 0,
      transform: [
        {
          translateX: withSpring(targetX, {
            damping: 16,
            stiffness: 180,
            reduceMotion: ReduceMotion.System,
          }),
        },
      ],
    };
  }, [state.index, tabWidth]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outerContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View
        style={styles.pill}
        onLayout={(e) => setPillWidth(e.nativeEvent.layout.width)}
      >
        <BlurView
          tint="systemChromeMaterialLight"
          intensity={80}
          style={StyleSheet.absoluteFill}
        />
        {/* Fallback bg for Android */}
        {Platform.OS === "android" && (
          <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
        )}
        {/* Pill border */}
        <View style={[StyleSheet.absoluteFill, styles.pillBorder]} />

        {/* Sliding active-tab indicator */}
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, indicatorStyle]}
        />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? { active: "ellipse", inactive: "ellipse-outline" };

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              lightImpact();
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={options.title ?? route.name}
              accessibilityState={{ selected: isFocused }}
              testID={`tab.${route.name}.button`}
              style={({ pressed }) => [
                styles.tab,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <TabIcon
                name={isFocused ? icons.active : icons.inactive}
                focused={isFocused}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const PILL_PADDING = 8;

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  pill: {
    flexDirection: "row",
    height: layout.tabBarHeight,
    borderRadius: 999,
    overflow: "hidden",
    minWidth: 160,
    paddingHorizontal: PILL_PADDING,
  },
  pillBorder: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(221,217,209,0.6)",
  },
  androidFallback: {
    backgroundColor: "rgba(250,248,244,0.94)",
    borderRadius: 999,
  },
  indicator: {
    position: "absolute",
    left: 0,
    top: (layout.tabBarHeight - INDICATOR_SIZE) / 2,
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    backgroundColor: colors.primaryWash,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 4,
  },
});
