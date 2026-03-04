import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Redirect } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
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

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === "success" && response.params.id_token) {
      setLoading(true);
      exchangeGoogleToken(response.params.id_token)
        .then((authResponse) => signIn(authResponse.access_token))
        .catch((err) => {
          console.error("[SignIn] exchangeGoogleToken failed:", err?.response?.data ?? err?.message ?? err);
          setError("Something went wrong. Please try again.");
        })
        .finally(() => setLoading(false));
    } else if (response.type === "error") {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [response, signIn]);

  const handleSignIn = useCallback(() => {
    setError(null);
    setLoading(true);
    promptAsync().catch(() => {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    });
  }, [promptAsync]);

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
