import { useEffect, useRef, useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { HostActionType, WorkshopRules } from "@/types/api";
import { useHostAction } from "@/hooks/useHostAction";

export default function WebCallScreen() {
  const params = useLocalSearchParams<{
    workshopId: string;
    token: string;
    roomUrl: string;
    role: string;
    rules: string;
  }>();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const roomUrl = params.roomUrl;
  const token = params.token;
  const isHost = params.role === "host";
  const rules: WorkshopRules = JSON.parse(params.rules ?? "{}");

  const [allMuted, setAllMuted] = useState(rules.all_muted ?? false);
  const [allCamerasOff, setAllCamerasOff] = useState(
    rules.all_cameras_off ?? false,
  );

  const hostAction = useHostAction(params.workshopId!);

  // Daily prebuilt embed URL with token
  const embedUrl = `${roomUrl}?t=${token}`;

  const leaveCall = useCallback(() => {
    router.back();
  }, [router]);

  const performHostAction = useCallback(
    (action: HostActionType) => {
      hostAction.mutate(action, {
        onSuccess: (data) => {
          if (data.action === "mute_all") setAllMuted(true);
          else if (data.action === "unmute_all") setAllMuted(false);
          else if (data.action === "cameras_off_all") setAllCamerasOff(true);
          else if (data.action === "cameras_on_all") setAllCamerasOff(false);
        },
      });
    },
    [hostAction],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Daily prebuilt sends postMessage events when leaving
      if (event.data?.action === "left-meeting") {
        router.back();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#3D3D3D" }}>
      {/* Header bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: "#2D2D2D",
        }}
      >
        <Text style={{ color: "#FAFAF7", fontSize: 14, fontWeight: "500" }}>
          {isHost ? "Host" : "Participant"} — Workshop Call
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isHost && (
            <>
              <HostWebButton
                label={allMuted ? "Unmute All" : "Mute All"}
                onPress={() =>
                  performHostAction(allMuted ? "unmute_all" : "mute_all")
                }
                loading={hostAction.isPending}
              />
              <HostWebButton
                label={allCamerasOff ? "Cameras On All" : "Cameras Off All"}
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
            style={{
              backgroundColor: "#D9534F",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text
              style={{ color: "#FAFAF7", fontWeight: "600", fontSize: 14 }}
            >
              Leave
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Daily prebuilt iframe */}
      <View style={{ flex: 1 }}>
        <iframe
          ref={iframeRef}
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
        backgroundColor: "#4A5A40",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        opacity: pressed ? 0.7 : loading ? 0.5 : 1,
      })}
    >
      <Text style={{ color: "#FAFAF7", fontWeight: "600", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}
