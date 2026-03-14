import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { Redirect } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import { exchangeCodeAsync } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { exchangeGoogleToken } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";
import { colors } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const token = useAuthStore((s) => s.token);
  const signIn = useAuthStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (request) {
      console.log("[SignIn] redirectUri:", request.redirectUri);
      console.log("[SignIn] androidClientId:", process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
    }
  }, [request]);

  const handleSignIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await promptAsync();
      console.log("[SignIn] promptAsync result type:", result.type);
      if (result.type === "success") {
        const params = (result as any).params ?? {};
        let idToken: string | undefined = params.id_token;

        if (!idToken && params.code && request) {
          // Google Android client returns authorization code (PKCE/code flow).
          // Exchange it for tokens to get id_token.
          console.log("[SignIn] exchanging code for tokens");
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
            { tokenEndpoint: "https://oauth2.googleapis.com/token" }
          );
          console.log("[SignIn] code exchange complete, hasIdToken:", !!tokenResponse.idToken);
          idToken = tokenResponse.idToken ?? undefined;
        }

        if (idToken) {
          const authResponse = await exchangeGoogleToken(idToken);
          await signIn(authResponse.access_token);
          // Navigation handled reactively: sign-in's <Redirect> if still mounted,
          // or oauthredirect's token watcher if we were navigated there.
        } else {
          console.warn("[SignIn] no id_token obtained from params:", JSON.stringify(params));
          setError("Something went wrong. Please try again.");
          setLoading(false);
        }
      } else if (result.type === "dismiss") {
        setLoading(false);
      } else {
        setError("Google sign-in failed. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("[SignIn] handleSignIn error:", err?.response?.data ?? err?.message ?? err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }, [promptAsync, signIn, request]);

  if (token) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[colors.accentSoft, colors.canvas, colors.canvas]}
        locations={[0, 0.42, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top spacer (golden ratio) */}
      <View style={s.topSpacer} />

      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.brand}>Kalba</Text>
        <Text style={s.tagline}>Mindful workshops, simply found</Text>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Actions */}
      <View style={s.actions}>
        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={loading ? "Signing in" : "Continue with Google"}
          accessibilityState={{ disabled: loading }}
          style={({ pressed }) => [
            s.button,
            {
              opacity: loading ? 0.55 : 1,
              transform: [{ scale: pressed && !loading ? 0.97 : 1 }],
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <View style={s.buttonInner}>
              <Ionicons name="logo-google" size={17} color={colors.surface} />
              <Text style={s.buttonText}>Continue with Google</Text>
            </View>
          )}
        </Pressable>

        {error && (
          <View style={s.errorPill}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Bottom spacer */}
      <View style={s.bottomSpacer} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 44,
  },
  topSpacer: { flex: 3 },
  bottomSpacer: { flex: 5 },
  hero: {
    alignItems: "center",
  },
  brand: {
    fontSize: 56,
    fontWeight: "100",
    letterSpacing: 12,
    color: "#2E2E2B",
  },
  tagline: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "300",
    letterSpacing: 1,
    color: "#8C8A82",
  },
  divider: {
    marginVertical: 56,
    height: StyleSheet.hairlineWidth,
    width: 40,
    backgroundColor: "#DDD9D1",
  },
  actions: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    width: "100%",
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#566B52",
    borderRadius: 999,
    paddingHorizontal: 28,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: "#FAF8F4",
  },
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: "#F8EDE8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "300",
    color: "#C4836E",
  },
});
