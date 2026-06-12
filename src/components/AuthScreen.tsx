import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import { exchangeCodeAsync, makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useEffect } from "react";

import {
  exchangeGoogleToken,
  loginWithEmail,
  registerWithEmail,
} from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";
import { colors, fonts, radii, spacing } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

type AuthMode = "login" | "register";

type ValidationErrorDetail = {
  loc?: Array<string | number>;
  msg?: string;
};

const AUTH_TEST_IDS = {
  nameInput: "signin.name.input",
  emailInput: "signin.email.input",
  passwordInput: "signin.password.input",
  submitButton: "signin.submit.button",
  loginModeButton: "signin.mode.login.button",
  registerModeButton: "signin.mode.register.button",
  forgotPasswordButton: "signin.forgot.button",
} as const;

function normalizeModeParam(value: string | string[] | undefined): AuthMode | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "register" || candidate === "login" ? candidate : null;
}

// Google's native OAuth clients (iOS/Android) require the redirect URI to use
// the reverse of the client ID as a custom scheme — e.g.
// `com.googleusercontent.apps.<ID>:/oauthredirect`. expo-auth-session v7
// defaults the native redirect to `<applicationId>:/oauthredirect`
// (`com.kalba.app:/oauthredirect`), which is NOT registered in the native
// manifests and is NOT accepted by Google for native clients, so the browser
// has nowhere to redirect back to after sign-in (it strands on google.com).
// Build the reverse-client-id redirect that matches the registered schemes
// (Android intentFilters / iOS CFBundleURLSchemes in app.config.js).
function googleNativeRedirectUri(): string | undefined {
  if (Platform.OS === "web") {
    return undefined; // let the provider derive the web redirect from the URL
  }

  // Expo Go uses a proxy-based auth flow and cannot handle app-defined
  // native URL schemes from app config.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return undefined;
  }

  const clientId =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  if (!clientId) {
    return undefined;
  }

  const reversed = clientId.replace(/\.apps\.googleusercontent\.com$/, "");
  return makeRedirectUri({
    native: `com.googleusercontent.apps.${reversed}:/oauthredirect`,
  });
}

function showAuthAlert(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

function resolveAuthError(error: unknown, mode: AuthMode): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string" && detail) {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item: ValidationErrorDetail) => {
          if (typeof item?.msg !== "string" || !item.msg) {
            return null;
          }

          const field = item.loc?.at(-1);
          if (field === "email") {
            return "Enter a valid email address.";
          }

          if (field === "password") {
            return item.msg;
          }

          return item.msg;
        })
        .filter((message): message is string => Boolean(message));

      if (messages.length > 0) {
        return messages.join("\n");
      }
    }
  }

  return mode === "register"
    ? "Unable to create account right now. Please try again."
    : "Invalid credentials";
}

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const signIn = useAuthStore((s) => s.signIn);
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string | string[] }>();
  const initialMode = normalizeModeParam(modeParam) ?? "login";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const nextMode = normalizeModeParam(modeParam);
    if (nextMode) {
      setMode(nextMode);
    }
  }, [modeParam]);

  const [request, _response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: googleNativeRedirectUri(),
  });

  const handleNativeAuth = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!normalizedEmail || !password) {
      showAuthAlert(
        t("missing_details_title", "Missing details"),
        t("missing_details_body", "Email and password are required."),
      );
      return;
    }

    if (mode === "register" && !trimmedName) {
      showAuthAlert(
        t("missing_details_title", "Missing details"),
        t("name_required", "Please enter your name."),
      );
      return;
    }

    setLoading(true);
    try {
      const authResponse =
        mode === "register"
          ? await registerWithEmail(normalizedEmail, password, trimmedName)
          : await loginWithEmail(normalizedEmail, password);

      await signIn(authResponse.access_token, authResponse.refresh_token);
    } catch (error) {
      showAuthAlert(
        mode === "register" ? "Sign Up Failed" : "Log In Failed",
        resolveAuthError(error, mode),
      );
    } finally {
      setLoading(false);
    }
  }, [email, mode, name, password, signIn, t]);

  const handleGoogleAuth = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const result = await promptAsync();

      if (result.type !== "success") {
        if (result.type !== "dismiss") {
          showAuthAlert("Google Sign-In Failed", "Please try again.");
        }
        return;
      }

      const params = (result as any).params ?? {};
      let idToken: string | undefined = params.id_token;

      if (!idToken && params.code && request) {
        const clientId =
          Platform.OS === "android"
            ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!
            : Platform.OS === "ios"
              ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!
              : process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;

        const tokenResponse = await exchangeCodeAsync(
          {
            clientId,
            code: params.code,
            redirectUri: request.redirectUri,
            extraParams: request.codeVerifier
              ? { code_verifier: request.codeVerifier }
              : undefined,
          },
          { tokenEndpoint: "https://oauth2.googleapis.com/token" },
        );

        idToken = tokenResponse.idToken ?? undefined;
      }

      if (!idToken) {
        showAuthAlert("Google Sign-In Failed", "Please try again.");
        return;
      }

      const authResponse = await exchangeGoogleToken(idToken);
      await signIn(authResponse.access_token, authResponse.refresh_token);
    } catch {
      showAuthAlert("Google Sign-In Failed", "Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }, [promptAsync, request, signIn]);

  if (token) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const isRegister = mode === "register";

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
        <View style={s.hero}>
          <Text style={s.brand}>Kalba</Text>
          <Text style={s.tagline}>A calmer way to join workshops and live sessions</Text>
        </View>

        <View style={s.card}>
          <View style={s.modeSwitch}>
            <Pressable
              onPress={() => setMode("login")}
              testID={AUTH_TEST_IDS.loginModeButton}
              style={[s.modeButton, mode === "login" && s.modeButtonActive]}
            >
              <Text style={[s.modeButtonText, mode === "login" && s.modeButtonTextActive]}>
                {t("login", "Log In")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("register")}
              testID={AUTH_TEST_IDS.registerModeButton}
              style={[s.modeButton, mode === "register" && s.modeButtonActive]}
            >
              <Text style={[s.modeButtonText, mode === "register" && s.modeButtonTextActive]}>
                {t("signup", "Sign Up")}
              </Text>
            </Pressable>
          </View>

          <Text style={s.heading}>{isRegister ? t("create_account_title", "Create your account") : t("welcome_back", "Welcome back")}</Text>
          <Text style={s.subheading}>
            {isRegister
              ? t("create_account_subtitle", "Use email and password to create a native Kalba account.")
              : t("login_subtitle", "Log in with your Kalba email and password.")}
          </Text>

          <View style={s.form}>
            {isRegister && (
              <View style={s.inputGroup}>
                <Text style={s.label}>{t("name_label", "Name")}</Text>
                <TextInput
                  autoCapitalize="words"
                  autoComplete="name"
                  onChangeText={setName}
                  placeholder={t("name_placeholder", "Your name")}
                  placeholderTextColor={colors.inkMuted}
                  style={s.input}
                  testID={AUTH_TEST_IDS.nameInput}
                  value={name}
                />
              </View>
            )}

            <View style={s.inputGroup}>
              <Text style={s.label}>{t("email_label", "Email")}</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.inkMuted}
                style={s.input}
                testID={AUTH_TEST_IDS.emailInput}
                value={email}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>{t("password_label", "Password")}</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete={isRegister ? "new-password" : "password"}
                onChangeText={setPassword}
                onSubmitEditing={() => {
                  if (loading || googleLoading) {
                    return;
                  }

                  void handleNativeAuth();
                }}
                placeholder={isRegister ? "At least 8 characters, letters and numbers" : "Enter your password"}
                placeholderTextColor={colors.inkMuted}
                returnKeyType={isRegister ? "done" : "go"}
                secureTextEntry
                style={s.input}
                testID={AUTH_TEST_IDS.passwordInput}
                value={password}
              />
            </View>

            {!isRegister && (
              <Pressable
                onPress={() => router.push("/forgot-password")}
                testID={AUTH_TEST_IDS.forgotPasswordButton}
                style={s.forgotPasswordRow}
              >
                <Text style={s.forgotPasswordText}>
                  {t("forgot_password", "Forgot password?")}
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: loading || googleLoading }}
              disabled={loading || googleLoading}
              onPress={handleNativeAuth}
              testID={AUTH_TEST_IDS.submitButton}
              style={({ pressed }) => [
                s.primaryButton,
                { opacity: loading || googleLoading ? 0.6 : pressed ? 0.86 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={s.primaryButtonText}>{isRegister ? t("create_account_title", "Create Account") : t("login", "Log In")}</Text>
              )}
            </Pressable>
          </View>

          <View style={s.footerRow}>
            <Text style={s.footerText}>
              {isRegister ? t("already_have_account", "Already have an account?") : t("need_account", "Need an account?")}
            </Text>
            <Pressable onPress={() => setMode(isRegister ? "login" : "register")}>
              <Text style={s.footerLink}>{isRegister ? t("login", "Log In") : t("signup", "Sign Up")}</Text>
            </Pressable>
          </View>

          <View style={s.separatorRow}>
            <View style={s.separatorLine} />
            <Text style={s.separatorText}>{t("or", "or")}</Text>
            <View style={s.separatorLine} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: googleLoading, disabled: googleLoading || loading }}
            disabled={googleLoading || loading}
            onPress={handleGoogleAuth}
            style={({ pressed }) => [
              s.secondaryButton,
              { opacity: googleLoading || loading ? 0.6 : pressed ? 0.86 : 1 },
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={s.secondaryButtonInner}>
                <Image
                  source={require("../../assets/google-g.png")}
                  style={s.googleIcon}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
                <Text style={s.secondaryButtonText}>{t("continue_with_google", "Continue with Google")}</Text>
              </View>
            )}
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
    paddingVertical: spacing.sectionGap,
  },
  hero: {
    alignItems: "center",
    marginBottom: 32,
  },
  brand: {
    color: colors.ink,
    fontSize: 44,
    fontFamily: fonts.displayLight,
    letterSpacing: 8,
    marginLeft: 8,
  },
  tagline: {
    color: colors.inkMuted,
    fontSize: 14,
    fontFamily: fonts.body,
    letterSpacing: 0.4,
    marginTop: 14,
    textAlign: "center",
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
  modeSwitch: {
    alignSelf: "center",
    backgroundColor: colors.primaryWash,
    borderRadius: radii.button,
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
    padding: 6,
  },
  modeButton: {
    borderRadius: radii.button,
    minWidth: 112,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modeButtonActive: {
    backgroundColor: colors.elevated,
  },
  modeButtonText: {
    color: colors.inkMuted,
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    textAlign: "center",
  },
  modeButtonTextActive: {
    color: colors.primary,
  },
  heading: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 36,
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
    marginTop: 8,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.4,
  },
  forgotPasswordRow: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotPasswordText: {
    color: colors.accent,
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 18,
  },
  footerText: {
    color: colors.inkBody,
    fontSize: 14,
  },
  footerLink: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  separatorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginVertical: 22,
  },
  separatorLine: {
    backgroundColor: colors.line,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  separatorText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderColor: colors.line,
    borderRadius: radii.button,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
  },
  secondaryButtonInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  googleIcon: {
    height: 18,
    width: 18,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
});