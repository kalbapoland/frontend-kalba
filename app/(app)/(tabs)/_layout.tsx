import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { FloatingTabBar } from "@/components/FloatingTabBar";

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("workshops") }} />
      <Tabs.Screen name="my-kalba" options={{ title: t("my_kalba.title") }} />
      <Tabs.Screen name="calendar" options={{ title: t("calendar.title") }} />
      <Tabs.Screen name="profile" options={{ title: t("profile") }} />
    </Tabs>
  );
}
