import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Linking,
  Platform,
  StyleSheet,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { deleteAccount } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";
import { displayName, initials as userInitials } from "@/lib/user";
import { colors } from "@/theme/tokens";

const PRIVACY_POLICY_URL = "https://backend-kalba.fly.dev/privacy";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [deleting, setDeleting] = useState(false);

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

  const doDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setDeleting(false);
      const msg =
        "We couldn't delete your account right now. Please try again.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Delete Account", msg);
      }
      return;
    }
    // Account is gone on the server — clear local cache and session.
    queryClient.clear();
    await signOut();
  };

  const handleDeleteAccount = () => {
    if (deleting) return;

    const title = "Delete Account";
    const body =
      "This permanently deletes your account and all your data. This cannot be undone.";

    if (Platform.OS === "web") {
      // Double confirm because the action is irreversible.
      if (!window.confirm(body)) return;
      if (!window.confirm("Are you absolutely sure? This is permanent.")) return;
      void doDeleteAccount();
      return;
    }

    Alert.alert(title, body, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            "Are you sure?",
            "This is permanent and cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete account",
                style: "destructive",
                onPress: () => void doDeleteAccount(),
              },
            ],
          ),
      },
    ]);
  };

  const handleOpenPrivacy = () => {
    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  if (!user) return null;

  const initials = userInitials(user);

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

        <Text style={s.name}>{displayName(user)}</Text>
        <Text style={s.email}>{user.email}</Text>

        <View style={s.rolePill}>
          <Text style={s.roleText}>{user.role}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      {/* Account actions */}
      <View style={[s.bottomGroup, { marginBottom: Math.max(insets.bottom, 16) + 80 }]}>
        <Pressable
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          testID="profile.signout.button"
          style={({ pressed }) => [
            s.signOutButton,
            {
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="log-out-outline" size={17} color={colors.danger} />
          <Text style={s.signOutText}>Sign Out</Text>
        </Pressable>

        <Pressable
          onPress={handleDeleteAccount}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          testID="profile.deleteaccount.button"
          style={({ pressed }) => [
            s.deleteButton,
            { opacity: deleting ? 0.5 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="trash-outline" size={15} color={colors.inkMuted} />
          <Text style={s.deleteText}>{deleting ? "Deleting…" : "Delete account"}</Text>
        </Pressable>

        <Pressable
          onPress={handleOpenPrivacy}
          accessibilityRole="link"
          accessibilityLabel="Privacy policy"
          testID="profile.privacy.link"
          hitSlop={8}
        >
          <Text style={s.privacyText}>Privacy Policy</Text>
        </Pressable>
      </View>
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
  bottomGroup: {
    gap: 14,
    alignItems: "stretch",
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
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
    color: "#8C8A82",
  },
  privacyText: {
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 0.3,
    color: "#8C8A82",
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
