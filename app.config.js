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
      buildNumber: "25",
      bundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "com.googleusercontent.apps.188908572041-k6j2i13i3qjcgib927opv0bs8lh0ta4r",
          ],
        },
      ],
      infoPlist: {
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
      package: "com.kalba.app",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./android/app/google-services.json",
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
      apiUrlNative:
        process.env.EXPO_PUBLIC_API_URL_NATIVE ?? "http://localhost:8000/api/v1",
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
