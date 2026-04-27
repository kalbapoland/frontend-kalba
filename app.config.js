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
      bundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "com.googleusercontent.apps.294519048023-gss6vgnkonpesvb1clkbsuij2517u4m7",
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
      googleServicesFile: "./android/app/google-services.json",
      permissions: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"],
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "com.googleusercontent.apps.294519048023-qp9dophfvb237gu9fc4i49ofrr1sbp9r",
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
