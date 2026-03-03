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
import Ionicons from "@expo/vector-icons/Ionicons";

import { exchangeGoogleToken } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";

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
      {/* Spacer to push content to golden ratio */}
      <View style={s.topSpacer} />

      <View style={s.hero}>
        <Text style={s.title}>Kalba</Text>
        <Text style={s.tagline}>Mindful workshops, simply found</Text>
      </View>

      <View style={s.divider} />

      <View style={s.actions}>
        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          style={({ pressed }) => [
            s.button,
            {
              opacity: loading ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={loading ? "Signing in" : "Continue with Google"}
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <ActivityIndicator color="#FAF9F6" />
          ) : (
            <View style={s.buttonInner}>
              <Ionicons name="logo-google" size={17} color="#FAF9F6" />
              <Text style={s.buttonText}>Continue with Google</Text>
            </View>
          )}
        </Pressable>

        {error && (
          <View style={s.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color="#C4836E" />
            <Text style={s.error}>{error}</Text>
          </View>
        )}
      </View>

      <View style={s.bottomSpacer} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F2ED",
    paddingHorizontal: 44,
  },
  topSpacer: {
    flex: 3,
  },
  hero: {
    alignItems: "center",
  },
  title: {
    fontSize: 56,
    fontWeight: "100",
    letterSpacing: 12,
    color: "#3D3D3D",
  },
  tagline: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "300",
    letterSpacing: 1,
    color: "#B5B0A8",
  },
  divider: {
    marginVertical: 56,
    height: StyleSheet.hairlineWidth,
    width: 48,
    backgroundColor: "#EBE7E1",
  },
  actions: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5E6B5A",
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 20,
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
    color: "#FAF9F6",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#F8EDE8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  error: {
    fontSize: 14,
    fontWeight: "300",
    color: "#C4836E",
  },
  bottomSpacer: {
    flex: 5,
  },
});
