import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import { exchangeCodeAsync } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { useEffect } from "react";

import {
  exchangeGoogleToken,
  loginWithEmail,
  registerWithEmail,
} from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";
import { colors, radii, spacing } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

type AuthMode = "login" | "register";

type ValidationErrorDetail = {
  loc?: Array<string | number>;
  msg?: string;
};

function normalizeModeParam(value: string | string[] | undefined): AuthMode | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "register" || candidate === "login" ? candidate : null;
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
  const token = useAuthStore((s) => s.token);
  const signIn = useAuthStore((s) => s.signIn);
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string | string[] }>();
  const initialMode = normalizeModeParam(modeParam) ?? "login";

  const [mode, setMode] = useState<AuthMode>(initialMode);
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
  });

  const handleNativeAuth = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      showAuthAlert("Missing details", "Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const authResponse =
        mode === "register"
          ? await registerWithEmail(normalizedEmail, password)
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
  }, [email, mode, password, signIn]);

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
              style={[s.modeButton, mode === "login" && s.modeButtonActive]}
            >
              <Text style={[s.modeButtonText, mode === "login" && s.modeButtonTextActive]}>
                Log In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("register")}
              style={[s.modeButton, mode === "register" && s.modeButtonActive]}
            >
              <Text style={[s.modeButtonText, mode === "register" && s.modeButtonTextActive]}>
                Sign Up
              </Text>
            </Pressable>
          </View>

          <Text style={s.heading}>{isRegister ? "Create your account" : "Welcome back"}</Text>
          <Text style={s.subheading}>
            {isRegister
              ? "Use email and password to create a native Kalba account."
              : "Log in with your Kalba email and password."}
          </Text>

          <View style={s.form}>
            <View style={s.inputGroup}>
              <Text style={s.label}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.inkMuted}
                style={s.input}
                value={email}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Password</Text>
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
                value={password}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: loading || googleLoading }}
              disabled={loading || googleLoading}
              onPress={handleNativeAuth}
              style={({ pressed }) => [
                s.primaryButton,
                { opacity: loading || googleLoading ? 0.6 : pressed ? 0.86 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={s.primaryButtonText}>{isRegister ? "Create Account" : "Log In"}</Text>
              )}
            </Pressable>
          </View>

          <View style={s.footerRow}>
            <Text style={s.footerText}>
              {isRegister ? "Already have an account?" : "Need an account?"}
            </Text>
            <Pressable onPress={() => setMode(isRegister ? "login" : "register")}>
              <Text style={s.footerLink}>{isRegister ? "Log In" : "Sign Up"}</Text>
            </Pressable>
          </View>

          <View style={s.separatorRow}>
            <View style={s.separatorLine} />
            <Text style={s.separatorText}>or</Text>
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
                <Ionicons name="logo-google" size={18} color={colors.primary} />
                <Text style={s.secondaryButtonText}>Continue with Google</Text>
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
    fontWeight: "200",
    letterSpacing: 8,
    marginLeft: 8,
  },
  tagline: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "400",
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
    fontWeight: "600",
    textAlign: "center",
  },
  modeButtonTextActive: {
    color: colors.primary,
  },
  heading: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "600",
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
    fontWeight: "600",
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
    fontWeight: "700",
    letterSpacing: 0.4,
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
    fontWeight: "700",
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
    fontWeight: "600",
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
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
});