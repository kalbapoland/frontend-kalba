import { View, Pressable, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors } from "@/theme/tokens";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: "grid", inactive: "grid-outline" },
  groups: { active: "people", inactive: "people-outline" },
  "my-kalba": { active: "sparkles", inactive: "sparkles-outline" },
  calendar: { active: "calendar", inactive: "calendar-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outerContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View style={styles.pill}>
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

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? { active: "ellipse", inactive: "ellipse-outline" };

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
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
              <Ionicons
                name={isFocused ? icons.active : icons.inactive}
                size={22}
                color={isFocused ? colors.primary : colors.inkMuted}
              />
              {/* Active dot indicator */}
              {isFocused && <View style={styles.activeDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

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
    height: 64,
    borderRadius: 999,
    overflow: "hidden",
    minWidth: 160,
    paddingHorizontal: 8,
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
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#566B52",
  },
});
