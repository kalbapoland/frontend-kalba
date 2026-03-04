import { View, Text, Pressable, Alert, Platform, StyleSheet } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useAuthStore } from "@/store/auth";
import { colors } from "@/theme/tokens";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    const doSignOut = async () => {
      queryClient.clear();
      await signOut();
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        doSignOut();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doSignOut },
      ]);
    }
  };

  if (!user) return null;

  const initials = (user.full_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[s.screen, { paddingTop: insets.top + 32 }]}>
      <LinearGradient
        colors={[colors.canvas, colors.canvasDeep]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Profile card */}
      <View style={s.card}>
        {/* Avatar */}
        <View style={s.avatarWrapper}>
          <LinearGradient
            colors={[colors.primaryWash, colors.accentSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.avatarRing}
          />
          <View style={s.avatarInner}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>
        </View>

        <Text style={s.name}>{user.full_name}</Text>
        <Text style={s.email}>{user.email}</Text>

        <View style={s.rolePill}>
          <Text style={s.roleText}>{user.role}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      {/* Sign out */}
      <Pressable
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={({ pressed }) => [
          s.signOutButton,
          {
            marginBottom: Math.max(insets.bottom, 16) + 80,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name="log-out-outline" size={17} color={colors.danger} />
        <Text style={s.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  card: {
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "#FAF8F4",
    borderWidth: 1,
    borderColor: "#EDE9E2",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FAF8F4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: "300",
    letterSpacing: 2,
    color: "#566B52",
  },
  name: {
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: 0.5,
    color: "#2E2E2B",
  },
  email: {
    fontSize: 13,
    fontWeight: "400",
    color: "#8C8A82",
    marginTop: 6,
    letterSpacing: 0.2,
  },
  rolePill: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E8EDE5",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.5,
    color: "#566B52",
    textTransform: "uppercase",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(196,131,110,0.3)",
    backgroundColor: "#FAF8F4",
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.3,
    color: "#C4836E",
  },
});
