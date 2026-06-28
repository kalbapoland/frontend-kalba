import { useState } from "react";
import {
  View,
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
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { deleteAccount } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";
import { displayName, initials as userInitials } from "@/lib/user";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { listItemEntering } from "@/lib/entrance";
import { colors, fonts, radii, shadows, spacing } from "@/theme/tokens";

const PRIVACY_POLICY_URL = "https://backend-kalba.fly.dev/privacy";

export default function ProfileScreen() {
  const { t } = useTranslation();
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
      if (window.confirm(t("profile_screen.signout_confirm"))) {
        doSignOut();
      }
    } else {
      Alert.alert(
        t("profile_screen.signout"),
        t("profile_screen.signout_confirm"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("profile_screen.signout"),
            style: "destructive",
            onPress: doSignOut,
          },
        ],
      );
    }
  };

  const doDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setDeleting(false);
      const msg = t("profile_screen.delete_failed");
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert(t("profile_screen.delete_title"), msg);
      }
      return;
    }
    // Account is gone on the server — clear local cache and session.
    queryClient.clear();
    await signOut();
  };

  const handleDeleteAccount = () => {
    if (deleting) return;

    const body = t("profile_screen.delete_body");

    if (Platform.OS === "web") {
      // Double confirm because the action is irreversible.
      if (!window.confirm(body)) return;
      if (!window.confirm(t("profile_screen.delete_confirm_again"))) return;
      void doDeleteAccount();
      return;
    }

    Alert.alert(t("profile_screen.delete_title"), body, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("profile_screen.delete"),
        style: "destructive",
        onPress: () =>
          Alert.alert(
            t("profile_screen.delete_confirm_title"),
            t("profile_screen.delete_confirm_body"),
            [
              { text: t("cancel"), style: "cancel" },
              {
                text: t("profile_screen.delete_account"),
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
      <Animated.View entering={listItemEntering(0)} style={s.card}>
        {/* Avatar */}
        <View style={s.avatarWrapper}>
          <LinearGradient
            colors={[colors.primaryWash, colors.accentSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.avatarRing}
          />
          <View style={s.avatarInner}>
            <AppText style={s.avatarInitials}>{initials}</AppText>
          </View>
        </View>

        <AppText variant="title">{displayName(user)}</AppText>
        <AppText variant="caption" tone="muted" style={s.email}>
          {user.email}
        </AppText>

        <View style={s.rolePill}>
          <AppText variant="overline" tone="primary">
            {user.role}
          </AppText>
        </View>
      </Animated.View>

      <View style={{ flex: 1 }} />

      {/* Account actions */}
      <View style={[s.bottomGroup, { marginBottom: Math.max(insets.bottom, 16) + 80 }]}>
        <Button
          label={t("profile_screen.signout")}
          onPress={handleSignOut}
          variant="danger"
          icon="log-out-outline"
          fullWidth
          accessibilityLabel={t("profile_screen.signout")}
          testID="profile.signout.button"
        />

        <Pressable
          onPress={handleDeleteAccount}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel={t("profile_screen.delete_account")}
          testID="profile.deleteaccount.button"
          style={({ pressed }) => [
            s.deleteButton,
            { opacity: deleting ? 0.5 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="trash-outline" size={15} color={colors.inkMuted} />
          <AppText variant="captionMedium" tone="muted">
            {deleting
              ? t("profile_screen.deleting")
              : t("profile_screen.delete_account")}
          </AppText>
        </Pressable>

        <Pressable
          onPress={handleOpenPrivacy}
          accessibilityRole="link"
          accessibilityLabel={t("profile_screen.privacy_policy")}
          testID="profile.privacy.link"
          hitSlop={8}
        >
          <AppText variant="caption" tone="muted" style={s.privacyText}>
            {t("profile_screen.privacy_policy")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  card: {
    alignItems: "center",
    borderRadius: radii.card + 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineWhisper,
    paddingHorizontal: 32,
    paddingVertical: 40,
    ...shadows.card,
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    marginBottom: spacing.cardPadding,
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
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: 2,
    color: colors.primary,
  },
  email: {
    marginTop: 6,
  },
  rolePill: {
    marginTop: spacing.elementGap,
    paddingHorizontal: spacing.elementGap,
    paddingVertical: 6,
    borderRadius: radii.button,
    backgroundColor: colors.primaryWash,
  },
  bottomGroup: {
    gap: 14,
    alignItems: "stretch",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  privacyText: {
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
