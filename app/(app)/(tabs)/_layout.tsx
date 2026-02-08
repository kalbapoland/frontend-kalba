import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function WorkshopsIcon({ color, active }: { color: string; active: boolean }) {
  return (
    <View style={{ width: 22, height: 22, justifyContent: "center" }}>
      {/* Grid of 4 rounded squares */}
      <View style={{ flexDirection: "row", gap: 3 }}>
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 2.5,
            backgroundColor: color,
            opacity: active ? 1 : 0.6,
          }}
        />
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 2.5,
            backgroundColor: color,
            opacity: active ? 1 : 0.6,
          }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 3, marginTop: 3 }}>
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 2.5,
            backgroundColor: color,
            opacity: active ? 1 : 0.6,
          }}
        />
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 2.5,
            backgroundColor: color,
            opacity: active ? 0.4 : 0.3,
          }}
        />
      </View>
    </View>
  );
}

function ProfileIcon({ color, active }: { color: string; active: boolean }) {
  return (
    <View style={{ width: 22, height: 22, alignItems: "center" }}>
      {/* Head */}
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          opacity: active ? 1 : 0.6,
        }}
      />
      {/* Shoulders */}
      <View
        style={{
          width: 18,
          height: 9,
          borderTopLeftRadius: 9,
          borderTopRightRadius: 9,
          backgroundColor: color,
          opacity: active ? 1 : 0.6,
          marginTop: 2,
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#7C8B72",
        tabBarInactiveTintColor: "#C5C3BC",
        tabBarStyle: {
          backgroundColor: "#FAFAF7",
          borderTopColor: "#E8E4DE",
          borderTopWidth: 0.5,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 10),
          height: 56 + Math.max(insets.bottom, 10),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Workshops",
          tabBarIcon: ({ color, focused }) => (
            <WorkshopsIcon color={color} active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <ProfileIcon color={color} active={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
