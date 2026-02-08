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

import { exchangeGoogleToken } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const token = useAuthStore((s) => s.token);
  const signIn = useAuthStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  console.log("[AUTH] request ready:", !!request);
  console.log("[AUTH] redirectUri:", request?.redirectUri);

  useEffect(() => {
    console.log("[AUTH] response changed:", JSON.stringify(response, null, 2));
    if (!response) return;
    if (response.type === "success" && response.params.id_token) {
      console.log("[AUTH] got id_token, exchanging with backend...");
      setLoading(true);
      exchangeGoogleToken(response.params.id_token)
        .then((authResponse) => {
          console.log("[AUTH] backend exchange success");
          return signIn(authResponse.access_token);
        })
        .catch((e) => {
          console.error("[AUTH] backend exchange failed:", e);
          setError("Something went wrong. Please try again.");
        })
        .finally(() => setLoading(false));
    } else if (response.type === "error") {
      console.error("[AUTH] Google error:", response.error);
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    } else {
      console.log("[AUTH] response type:", response.type);
      setLoading(false);
    }
  }, [response, signIn]);

  const handleSignIn = useCallback(() => {
    console.log("[AUTH] promptAsync triggered");
    setError(null);
    setLoading(true);
    promptAsync()
      .then((result) => console.log("[AUTH] promptAsync resolved:", result?.type))
      .catch((e) => {
        console.error("[AUTH] promptAsync error:", e);
        setError("Something went wrong. Please try again.");
        setLoading(false);
      });
  }, [promptAsync]);

  if (token) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Kalba</Text>
      <Text style={s.tagline}>Mindful workshops, simply found</Text>

      <View style={s.divider} />

      <Pressable
        onPress={handleSignIn}
        disabled={loading}
        style={s.button}
      >
        {loading ? (
          <ActivityIndicator color="#FAFAF7" />
        ) : (
          <Text style={s.buttonText}>Sign in with Google</Text>
        )}
      </Pressable>

      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F2ED",
    paddingHorizontal: 48,
    paddingBottom: 80,
  },
  title: {
    fontSize: 48,
    fontWeight: "200",
    letterSpacing: 8,
    color: "#3D3D3D",
  },
  tagline: {
    marginTop: 16,
    fontSize: 16,
    letterSpacing: 0.5,
    color: "#B0AEA6",
  },
  divider: {
    marginVertical: 64,
    height: 1,
    width: 48,
    backgroundColor: "#E8E4DE",
  },
  button: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C8B72",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: "#FAFAF7",
  },
  error: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 14,
    color: "#C4836E",
  },
});
