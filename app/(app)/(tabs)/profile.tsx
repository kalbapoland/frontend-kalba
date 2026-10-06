import { useState } from "react";
import {
  View,
  Pressable,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { deleteAccount } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";
import { useUpdateUser } from "@/hooks/useUser";
import { displayName, initials as userInitials } from "@/lib/user";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { listItemEntering } from "@/lib/entrance";
import { fonts, radii, cardShadow, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { THEME_NAMES, type ThemeColors, type ThemeName } from "@/theme/themes";
import { isTestBuild } from "@/lib/buildVariant";
import { appVersionLabel } from "@/lib/appVersion";

const PRIVACY_POLICY_URL = "https://backend-kalba.fly.dev/privacy";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useThemedStyles(buildStyles);
  const [deleting, setDeleting] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const updateUser = useUpdateUser();

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

  const handleOpenEditName = () => {
    setNameInput(user?.full_name ?? "");
    setEditNameVisible(true);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    updateUser.mutate(
      { full_name: trimmed },
      {
        onSuccess: () => setEditNameVisible(false),
        onError: () => {
          const msg = t("profile_screen.edit_name_failed");
          if (Platform.OS === "web") {
            window.alert(msg);
          } else {
            Alert.alert(t("profile_screen.edit_name"), msg);
          }
        },
      },
    );
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

      {/* The whole screen scrolls: with Appearance + dev options + account
          rows the content can exceed the viewport (iOS small heights). */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

        <View style={s.nameRow}>
          <AppText variant="title">{displayName(user)}</AppText>
          <Pressable
            onPress={handleOpenEditName}
            accessibilityLabel={t("profile_screen.edit_name")}
            testID="profile.editname.button"
            hitSlop={8}
            style={s.editNameButton}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.inkMuted} />
          </Pressable>
        </View>
        <AppText variant="caption" tone="muted" style={s.email}>
          {user.email}
        </AppText>

        <View style={s.rolePill}>
          <AppText variant="overline" tone="primary">
            {user.role}
          </AppText>
        </View>
      </Animated.View>

      {/* Appearance + (test builds) dev options sit right under the user card
          with the same rhythm as the sections' internal gap. */}
      <View style={s.settingsStack}>
        <AppearanceSection />
        {isTestBuild && <DeveloperOptionsSection />}
      </View>

      {/* Account actions */}
      <View style={s.bottomGroup}>
        <Button
          label={t("profile_screen.signout")}
          onPress={handleSignOut}
          variant="danger"
          icon="log-out-outline"
          fullWidth
          accessibilityLabel={t("profile_screen.signout")}
          testID="profile.signout.button"
        />

        <Button
          label={
            deleting
              ? t("profile_screen.deleting")
              : t("profile_screen.delete_account")
          }
          onPress={handleDeleteAccount}
          disabled={deleting}
          variant="dangerSolid"
          icon="trash-outline"
          fullWidth
          accessibilityLabel={t("profile_screen.delete_account")}
          testID="profile.deleteaccount.button"
        />

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

        <AppText variant="caption" tone="muted" style={s.versionText} testID="profile.version">
          {t("profile_screen.version_label", { version: appVersionLabel() })}
        </AppText>
      </View>
      </ScrollView>

      {/* Modal rendered OUTSIDE the ScrollView (fixed overlay). */}
      <Modal
        visible={editNameVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditNameVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <AppText variant="title" style={s.modalTitle}>
              {t("profile_screen.edit_name")}
            </AppText>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={t("profile_screen.edit_name_placeholder")}
              placeholderTextColor={colors.inkMuted}
              autoFocus
              maxLength={100}
              style={s.modalInput}
              testID="profile.editname.input"
            />
            <View style={s.modalActions}>
              <View style={s.modalActionButton}>
                <Button
                  label={t("cancel")}
                  onPress={() => setEditNameVisible(false)}
                  variant="ghost"
                  fullWidth
                />
              </View>
              <View style={s.modalActionButton}>
                <Button
                  label={
                    updateUser.isPending
                      ? t("profile_screen.save") + "…"
                      : t("profile_screen.save")
                  }
                  onPress={handleSaveName}
                  disabled={updateUser.isPending || !nameInput.trim()}
                  fullWidth
                  testID="profile.editname.save.button"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Production-vs-test contract reviewed here: named exports so the sections
 * can be rendered directly in tests without auth/modals scaffolding.
 */
export function AppearanceSection() {
  const { t } = useTranslation();
  const { themeName, appearancePolicy, systemScheme, setPreference, colors, systemFollowing, preference } = useTheme();
  const styles = useThemedStyles(buildStyles);

  // Switch reads the POLICY (store value), not the effective selection —
  // with a dev override active, the effective theme comes from the override
  // and `preference === "system"` would be permanently false, making the
  // switch a dead control (user-reported bug). When an override masks the
  // policy, the switch is shown disabled with a one-line pointer.
  const maskedByOverride = !!preference && preference !== appearancePolicy;
  const followSystem = appearancePolicy === "system";
  const schemeLabel = maskedByOverride
    ? t("profile_screen.appearance_masked_hint")
    : followSystem
      ? systemScheme === "dark"
        ? t("profile_screen.system_scheme_dark")
        : t("profile_screen.system_scheme_light")
      : t("profile_screen.appearance_hint_light_fixed");

  return (
    <View style={styles.settingsGroup} testID="profile.appearance.section">
      <AppText variant="overline" tone="muted">
        {t("profile_screen.appearance_title")}
      </AppText>
      <View style={[styles.settingsRow, maskedByOverride && styles.settingsRowDisabled]}>
        <AppText variant="body">{t("profile_screen.appearance_option_system")}</AppText>
        <Switch
          value={followSystem}
          // Locked builds refuse writes via setPreference; disabled when the
          // policy is masked by a dev override (test builds only).
          disabled={maskedByOverride}
          onValueChange={(on) => setPreference(on ? "system" : "light")}
          trackColor={{ false: colors.line, true: colors.primarySoft }}
          thumbColor={colors.elevated}
          testID="profile.appearance.switch"
        />
      </View>
      <AppText variant="caption" tone="muted">
        {schemeLabel}
      </AppText>
    </View>
  );
}

export function DeveloperOptionsSection() {
  const { t } = useTranslation();
  const { preference, systemFollowing, setDevOverride, colors } = useTheme();
  const styles = useThemedStyles(buildStyles);

  const options: Array<{ key: ThemeName | null; label: string }> = [
    { key: null, label: t("profile_screen.dev_option_palette_none") },
    ...THEME_NAMES.map((name) => ({
      key: name,
      label: t(`profile_screen.dev_option_theme_${name.replace("-", "_")}`),
    })),
  ];

  return (
    <View style={styles.settingsGroup} testID="profile.devoptions.section">
      <AppText variant="overline" tone="muted">
        {t("profile_screen.dev_options_title")}
      </AppText>
      {/* colour schemes sub-header (review: replace hint text + build row) */}
      <AppText variant="captionMedium">
        {t("profile_screen.dev_options_schemes_header")}
      </AppText>
      {options.map(({ key, label }) => {
        // "None" is selected when the appearance follows the system (no
        // override); a concrete palette is selected when it is the resolved
        // theme AND an override is actually active.
        const selected = key === null ? systemFollowing : !systemFollowing && preference === key;
        return (
          <Pressable
            key={String(key)}
            onPress={() => setDevOverride(key)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            testID={`profile.theme.option.${key ?? "none"}`}
            style={({ pressed }) => [
              styles.settingsRow,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText variant="body" tone={selected ? "primary" : "body"}>
              {label}
            </AppText>
            {selected && (
              <Ionicons name="checkmark" size={16} color={colors.primary} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function buildStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
    },
    scroll: {
      flex: 1,
    },
    card: {
      alignItems: "center",
      borderRadius: radii.card + 4,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.lineWhisper,
      paddingHorizontal: 32,
      paddingVertical: 40,
      ...cardShadow(c),
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
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitials: {
      fontFamily: fonts.display,
      fontSize: 26,
      lineHeight: 34,
      letterSpacing: 2,
      color: c.primary,
    },
    email: {
      marginTop: 6,
    },
    rolePill: {
      marginTop: spacing.elementGap,
      paddingHorizontal: spacing.elementGap,
      paddingVertical: 6,
      borderRadius: radii.button,
      backgroundColor: c.primaryWash,
    },
    bottomGroup: {
      marginTop: spacing.elementGap,
      gap: spacing.elementGap,
      alignItems: "stretch",
    },
    settingsStack: {
      marginTop: spacing.elementGap,
      gap: spacing.elementGap,
    },
    settingsGroup: {
      gap: 6,
      paddingVertical: 8,
      borderRadius: radii.card,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.lineWhisper,
      paddingHorizontal: spacing.elementGap,
    },
    settingsRow: {
      flexDirection: "row",
      minHeight: 40,
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    settingsRowDisabled: {
      opacity: 0.5,
    },
    privacyText: {
      textAlign: "center",
      textDecorationLine: "underline",
    },
    versionText: {
      textAlign: "center",
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    editNameButton: {
      padding: 4,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radii.card,
      borderTopRightRadius: radii.card,
      padding: spacing.screenPadding,
      paddingBottom: 40,
      gap: 16,
    },
    modalTitle: {
      textAlign: "center",
    },
    modalInput: {
      borderWidth: 1,
      borderColor: c.lineWhisper,
      borderRadius: radii.button,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: c.ink,
      fontSize: 16,
      backgroundColor: c.canvas,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
    },
    modalActionButton: {
      flex: 1,
    },
  });
}
