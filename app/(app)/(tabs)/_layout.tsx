import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#7C8B72",
        tabBarInactiveTintColor: "#B0AEA6",
        tabBarStyle: {
          backgroundColor: "#FAFAF7",
          borderTopColor: "#E8E4DE",
          borderTopWidth: 0.5,
          paddingTop: 6,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          letterSpacing: 0.3,
          fontWeight: "500",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Workshops",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>&#9702;</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>&#9675;</Text>
          ),
        }}
      />
    </Tabs>
  );
}
