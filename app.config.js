const fs = require("fs");

const nativeApiUrl =
  process.env.EXPO_PUBLIC_API_URL_NATIVE ?? "http://localhost:8000/api/v1";
const appEnv = (process.env.APP_ENV ?? "local").toLowerCase();
const allowAndroidCleartextFlag =
  (process.env.EXPO_PUBLIC_ALLOW_ANDROID_CLEARTEXT ?? "false").toLowerCase() === "true";

function isPrivateIpv4(hostname) {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
}

function shouldAllowAndroidCleartext(apiUrl) {
  const explicitAllow = appEnv === "local" || allowAndroidCleartextFlag;
  if (!explicitAllow) {
    return false;
  }

  try {
    const parsed = new URL(apiUrl);
    const hostname = parsed.hostname;

    if (parsed.protocol !== "http:") {
      return false;
    }

    return (
      hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "0.0.0.0"
      || hostname === "10.0.2.2"
      || hostname === "10.0.3.2"
      || isPrivateIpv4(hostname)
    );
  } catch {
    return false;
  }
}

function resolveGoogleServicesFile() {
  const envFile = process.env.GOOGLE_SERVICES_JSON;

  if (envFile) {
    return envFile;
  }

  const localFile = "./android/app/google-services.json";

  if (fs.existsSync(localFile)) {
    return localFile;
  }

  return undefined;
}

const googleServicesFile = resolveGoogleServicesFile();

module.exports = {
  expo: {
    name: "Kalba",
    slug: "kalba",
    owner: "kalba",
    version: "1.0.0",
    scheme: "kalba",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.kalba.app",
      // buildNumber is managed by EAS via `appVersionSource: "remote"` in
      // eas.json — see PR #49. Setting it here would surface in the manifest
      // via expo-constants and confuse readers about the source of truth.
      infoPlist: {
        // Kalba does not implement any custom cryptography — only the
        // standard HTTPS / iOS Keychain provided by the OS. Declaring
        // this here keeps new TestFlight uploads out of the "Missing
        // Compliance" state, where they sit invisible to testers until
        // someone manually declares it in App Store Connect.
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.googleusercontent.apps.188908572041-k6j2i13i3qjcgib927opv0bs8lh0ta4r",
            ],
          },
        ],
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
        },
        NSCameraUsageDescription:
          "Kalba needs camera access for video workshops",
        NSMicrophoneUsageDescription:
          "Kalba needs microphone access for video workshops",
        UIBackgroundModes: ["voip", "audio", "remote-notification"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      usesCleartextTraffic: shouldAllowAndroidCleartext(nativeApiUrl),
      package: "com.kalba.app",
      ...(googleServicesFile ? { googleServicesFile } : {}),
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.POST_NOTIFICATIONS",
      ],
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "com.googleusercontent.apps.188908572041-phljppsp6q9tc35jgb928ka9oa8g3ahm",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      "expo-web-browser",
      "expo-secure-store",
      "expo-font",
      "expo-localization",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#ffffff",
          defaultChannel: "default",
        },
      ],
    ],
    extra: {
      apiUrlWeb:
        process.env.EXPO_PUBLIC_API_URL_WEB ?? "http://localhost:8000/api/v1",
      apiUrlNative: nativeApiUrl,
      easProjectId:
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
        "349675a2-5bd0-4464-9464-b3d4499a10e3",
      eas: {
        projectId:
          process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
          "349675a2-5bd0-4464-9464-b3d4499a10e3",
      },
    },
  },
};
