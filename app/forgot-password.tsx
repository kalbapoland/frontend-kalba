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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { requestPasswordReset } from "@/api/endpoints";
import { colors, fonts, radii, spacing } from "@/theme/tokens";

const FORGOT_TEST_IDS = {
  emailInput: "forgot.email.input",
  submitButton: "forgot.submit.button",
  backButton: "forgot.back.button",
} as const;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(normalizedEmail);
    } catch {
      // The endpoint intentionally never reveals whether an account exists, so
      // we show the same confirmation regardless of the outcome.
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }, [email]);

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
          <Text style={s.heading}>{t("forgot_title", "Reset your password")}</Text>

          {submitted ? (
            <>
              <Text style={s.subheading}>
                {t(
                  "forgot_sent",
                  "If an account exists for that email, we've sent a link to reset your password. Check your inbox.",
                )}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace("/sign-in")}
                testID={FORGOT_TEST_IDS.backButton}
                style={({ pressed }) => [s.primaryButton, { opacity: pressed ? 0.86 : 1 }]}
              >
                <Text style={s.primaryButtonText}>{t("back_to_login", "Back to Log In")}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.subheading}>
                {t(
                  "forgot_subtitle",
                  "Enter your account email and we'll send you a link to reset your password.",
                )}
              </Text>

              <View style={s.form}>
                <View style={s.inputGroup}>
                  <Text style={s.label}>{t("email_label", "Email")}</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    onSubmitEditing={() => {
                      if (!loading) {
                        void handleSubmit();
                      }
                    }}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.inkMuted}
                    returnKeyType="go"
                    style={s.input}
                    testID={FORGOT_TEST_IDS.emailInput}
                    value={email}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: loading, disabled: loading }}
                  disabled={loading}
                  onPress={handleSubmit}
                  testID={FORGOT_TEST_IDS.submitButton}
                  style={({ pressed }) => [
                    s.primaryButton,
                    { opacity: loading ? 0.6 : pressed ? 0.86 : 1 },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={s.primaryButtonText}>{t("forgot_submit", "Send reset link")}</Text>
                  )}
                </Pressable>
              </View>

              <Pressable
                onPress={() => router.replace("/sign-in")}
                testID={FORGOT_TEST_IDS.backButton}
                style={s.footerRow}
              >
                <Text style={s.footerLink}>{t("back_to_login", "Back to Log In")}</Text>
              </Pressable>
            </>
          )}
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
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    justifyContent: "center",
    minHeight: 54,
    marginTop: 24,
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
