import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#5E6B5A",
        tabBarInactiveTintColor: "#C5C3BC",
        tabBarStyle: {
          backgroundColor: "#FAF9F6",
          borderTopColor: "#EBE7E1",
          borderTopWidth: 0.5,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 10),
          height: 64 + Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Workshops",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={20}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
