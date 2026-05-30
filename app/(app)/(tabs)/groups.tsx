import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useGroups, useMyGroups, useSubscribeGroup } from "@/hooks/useGroups";
import { useAuthStore } from "@/store/auth";
import { GroupCard } from "@/components/GroupCard";
import type { Group } from "@/types/api";
import { colors } from "@/theme/tokens";

function SectionLabel({ children }: { children: string }) {
  return (
    <View style={s.sectionLabelRow}>
      <Text style={s.sectionLabel}>{children}</Text>
      <View style={s.sectionAccent} />
    </View>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <Text style={s.emptyHint}>{text}</Text>;
}

export default function GroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const isTrainer = user?.role === "trainer";

  const mine = useMyGroups();
  const all = useGroups();
  const subscribe = useSubscribeGroup();

  const discover = useMemo<Group[]>(
    () => (all.data ?? []).filter((g) => !g.is_member && !g.is_owner),
    [all.data],
  );

  const isLoading = mine.isLoading || all.isLoading;
  const isRefetching = mine.isRefetching || all.isRefetching;
  const refetch = () => {
    void mine.refetch();
    void all.refetch();
  };

  const handleSubscribe = (group: Group) => {
    subscribe.mutate(group.id, {
      onError: () => {
        const msg = "Could not subscribe. Please try again.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (mine.error || all.error) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-12">
        <Ionicons name="cloud-offline-outline" size={48} color={colors.line} />
        <Text style={s.emptyTitle}>Unable to load</Text>
        <Text style={s.emptySubtitle}>Check your connection and try again</Text>
        <Pressable
          onPress={refetch}
          accessibilityRole="button"
          accessibilityLabel="Retry loading groups"
          className="mt-7 rounded-full border border-primary px-8 py-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text className="text-sm font-medium tracking-wide text-primary">
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  const myGroups = mine.data ?? [];

  return (
    <View className="flex-1 bg-canvas">
      <LinearGradient
        colors={[colors.canvas, colors.canvasDeep]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 32,
          paddingBottom: 140,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={s.pageTitle}>Groups</Text>

        {/* Section A: My Groups */}
        <SectionLabel>My Groups</SectionLabel>
        {myGroups.length === 0 ? (
          <EmptyHint text="You haven't joined any groups yet. Discover one below." />
        ) : (
          myGroups.map((g) => <GroupCard key={g.id} group={g} />)
        )}

        {/* Section B: Discover */}
        <View style={{ marginTop: 28 }}>
          <SectionLabel>Discover Groups</SectionLabel>
        </View>
        {discover.length === 0 ? (
          <EmptyHint text="No other groups available right now." />
        ) : (
          discover.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onSubscribe={() => handleSubscribe(g)}
              subscribing={subscribe.isPending && subscribe.variables === g.id}
            />
          ))
        )}
      </ScrollView>

      {isTrainer && (
        <Pressable
          onPress={() => router.push("/(app)/create-group")}
          accessibilityRole="button"
          accessibilityLabel="Create new group"
          style={[s.fab, { bottom: insets.bottom + 80 }]}
        >
          <Ionicons name="add" size={26} color={colors.surface} />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pageTitle: {
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: 0.5,
    color: "#2E2E2B",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionLabelRow: {
    marginTop: 24,
    marginBottom: 16,
    gap: 8,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 2,
    color: "#8C8A82",
    textTransform: "uppercase",
  },
  sectionAccent: {
    width: 24,
    height: 1.5,
    backgroundColor: "#566B52",
    borderRadius: 1,
    marginTop: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: "#8C8A82",
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "300",
    letterSpacing: 0.3,
    color: "#57564F",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: "#8C8A82",
    marginTop: 8,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#566B52",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2E2E2B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
});
