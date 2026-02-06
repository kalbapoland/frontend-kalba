import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";

import { exchangeGoogleToken } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function SignInScreen() {
  const token = useAuthStore((s) => s.token);
  const signIn = useAuthStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
  });

  const handleSignIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === "success" && result.params.id_token) {
        const authResponse = await exchangeGoogleToken(result.params.id_token);
        await signIn(authResponse.access_token);
      } else if (result.type === "error") {
        setError("Google sign-in failed. Please try again.");
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [promptAsync, signIn]);

  if (token) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="mb-2 text-4xl font-bold text-primary">Kalba</Text>
      <Text className="mb-12 text-lg text-gray-500">
        Discover &amp; book workshops
      </Text>

      <Pressable
        onPress={handleSignIn}
        disabled={loading}
        className="w-full flex-row items-center justify-center rounded-xl bg-primary px-6 py-4"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-lg font-semibold text-white">
            Sign in with Google
          </Text>
        )}
      </Pressable>

      {error && (
        <Text className="mt-4 text-center text-red-500">{error}</Text>
      )}
    </View>
  );
}
