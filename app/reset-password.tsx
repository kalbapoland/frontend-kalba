import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { resetPassword } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";
import { translateApiError } from "@/lib/apiErrors";
import { colors, fonts, radii, spacing } from "@/theme/tokens";

const RESET_TEST_IDS = {
  passwordInput: "reset.password.input",
  confirmInput: "reset.confirm.input",
  submitButton: "reset.submit.button",
  backButton: "reset.back.button",
} as const;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolveResetError(error: unknown, fallback: string, t: (key: string) => string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail) {
      return translateApiError(detail, t, fallback);
    }
    if (Array.isArray(detail)) {
      const msg = detail.find((item) => typeof item?.msg === "string")?.msg;
      if (msg) {
        return msg;
      }
    }
  }
  return fallback;
}

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = firstParam(tokenParam);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!token) {
      return;
    }

    if (password !== confirm) {
      setError(t("reset_password_mismatch", "Passwords don't match."));
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const authResponse = await resetPassword(token, password);
      await signIn(authResponse.access_token, authResponse.refresh_token);
      router.replace("/(app)/(tabs)");
    } catch (err) {
      setError(
        resolveResetError(
          err,
          t("reset_password_failed", "This reset link is invalid or has expired."),
          t,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [confirm, password, router, signIn, t, token]);

  if (!token) {
    return <Redirect href="/forgot-password" />;
  }

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[colors.accentSoft, colors.canvas, colors.canvas]}
        locations={[0, 0.34, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.keyboardAvoidingView}
      >
        <View style={s.card}>
          <Text style={s.heading}>{t("reset_title", "Choose a new password")}</Text>
          <Text style={s.subheading}>
            {t("reset_subtitle", "Enter a new password for your Kalba account.")}
          </Text>

          <View style={s.form}>
            <View style={s.inputGroup}>
              <Text style={s.label}>{t("new_password_label", "New password")}</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                onChangeText={setPassword}
                placeholder={t(
                  "password_placeholder_register",
                  "At least 8 characters, letters and numbers",
                )}
                placeholderTextColor={colors.inkMuted}
                secureTextEntry
                style={s.input}
                testID={RESET_TEST_IDS.passwordInput}
                value={password}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>{t("confirm_password_label", "Confirm password")}</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                onChangeText={setConfirm}
                onSubmitEditing={() => {
                  if (!loading) {
                    void handleSubmit();
                  }
                }}
                placeholder={t("confirm_password_placeholder", "Re-enter your new password")}
                placeholderTextColor={colors.inkMuted}
                returnKeyType="done"
                secureTextEntry
                style={s.input}
                testID={RESET_TEST_IDS.confirmInput}
                value={confirm}
              />
            </View>

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: loading }}
              disabled={loading}
              onPress={handleSubmit}
              testID={RESET_TEST_IDS.submitButton}
              style={({ pressed }) => [
                s.primaryButton,
                { opacity: loading ? 0.6 : pressed ? 0.86 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={s.primaryButtonText}>{t("reset_submit", "Reset password")}</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.replace("/sign-in")}
            testID={RESET_TEST_IDS.backButton}
            style={s.footerRow}
          >
            <Text style={s.footerLink}>{t("back_to_login", "Back to Log In")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screenPadding,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.lineWhisper,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  heading: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 34,
    fontFamily: fonts.displayMedium,
    textAlign: "center",
  },
  subheading: {
    color: colors.inkBody,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: "center",
  },
  form: {
    gap: spacing.elementGap,
    marginTop: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  input: {
    backgroundColor: colors.elevated,
    borderColor: colors.line,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    justifyContent: "center",
    minHeight: 54,
    marginTop: 8,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.4,
  },
  footerRow: {
    alignItems: "center",
    marginTop: 18,
  },
  footerLink: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
});
