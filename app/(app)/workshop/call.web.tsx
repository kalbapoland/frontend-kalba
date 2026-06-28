import { useEffect, useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import type { HostActionType, WorkshopRules } from "@/types/api";
import { useHostAction } from "@/hooks/useHostAction";

export default function WebCallScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    workshopId: string;
    token: string;
    roomUrl: string;
    role: string;
    rules: string;
  }>();
  const router = useRouter();

  const roomUrl = params.roomUrl;
  const token = params.token;
  const isHost = params.role === "host";
  const rules: WorkshopRules = JSON.parse(params.rules ?? "{}");

  const [allMuted, setAllMuted] = useState(rules.all_muted ?? false);
  const [allCamerasOff, setAllCamerasOff] = useState(
    rules.all_cameras_off ?? false,
  );
  const [elapsed, setElapsed] = useState(0);

  const hostAction = useHostAction(params.workshopId!);

  const embedUrl = `${roomUrl}?t=${token}`;

  const leaveCall = useCallback(() => {
    router.back();
  }, [router]);

  const performHostAction = useCallback(
    (action: HostActionType) => {
      hostAction.mutate(
        { action },
        {
          onSuccess: (data) => {
            if (data.action === "mute_all") setAllMuted(true);
            else if (data.action === "unmute_all") setAllMuted(false);
            else if (data.action === "cameras_off_all") setAllCamerasOff(true);
            else if (data.action === "cameras_on_all") setAllCamerasOff(false);
          },
        },
      );
    },
    [hostAction],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === "left-meeting") {
        router.back();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      {/* Header bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: "#222",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Live indicator */}
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#22c55e",
            }}
          />
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "500" }}>
            {formatTime(elapsed)}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            {isHost ? t("call.host") : t("call.participant")}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isHost && (
            <>
              <HostWebButton
                label={allMuted ? t("call.unmute_all") : t("call.mute_all")}
                onPress={() =>
                  performHostAction(allMuted ? "unmute_all" : "mute_all")
                }
                loading={hostAction.isPending}
              />
              <HostWebButton
                label={allCamerasOff ? t("call.cameras_on") : t("call.cameras_off")}
                onPress={() =>
                  performHostAction(
                    allCamerasOff ? "cameras_on_all" : "cameras_off_all",
                  )
                }
                loading={hostAction.isPending}
              />
            </>
          )}
          <Pressable
            onPress={leaveCall}
            style={({ pressed }) => ({
              backgroundColor: "#ef4444",
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderRadius: 20,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}
            >
              {t("call.leave")}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Daily prebuilt iframe */}
      <View style={{ flex: 1 }}>
        <iframe
          src={embedUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </View>
    </View>
  );
}

function HostWebButton({
  label,
  onPress,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        backgroundColor: "rgba(255,255,255,0.1)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        opacity: pressed ? 0.7 : loading ? 0.5 : 1,
      })}
    >
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}
