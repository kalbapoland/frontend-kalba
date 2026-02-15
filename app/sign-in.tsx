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
        .catch(() => setError("Something went wrong. Please try again."))
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
            { opacity: pressed ? 0.9 : loading ? 0.7 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FAFAF7" />
          ) : (
            <View style={s.buttonInner}>
              <Ionicons name="logo-google" size={18} color="#FAFAF7" />
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
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F2ED",
    paddingHorizontal: 40,
  },
  hero: {
    alignItems: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "200",
    letterSpacing: 8,
    color: "#3D3D3D",
  },
  tagline: {
    marginTop: 12,
    fontSize: 15,
    letterSpacing: 0.5,
    color: "#B0AEA6",
  },
  divider: {
    marginVertical: 48,
    height: 1,
    width: 40,
    backgroundColor: "#E8E4DE",
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
    backgroundColor: "#7C8B72",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.3,
    color: "#FAFAF7",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
  },
  error: {
    fontSize: 13,
    color: "#C4836E",
  },
});
