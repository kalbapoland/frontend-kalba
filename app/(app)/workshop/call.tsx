import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Daily, { DailyMediaView } from "@daily-co/react-native-daily-js";
import type {
  DailyCall,
  DailyParticipant,
  DailyEventObjectParticipant,
  DailyEventObjectParticipantLeft,
  DailyEventObjectAppMessage,
} from "@daily-co/react-native-daily-js";

import type { HostActionType, WorkshopRules } from "@/types/api";
import { useHostAction } from "@/hooks/useHostAction";

async function requestMediaPermissions(): Promise<{
  camera: boolean;
  mic: boolean;
}> {
  if (Platform.OS !== "android") {
    // iOS prompts automatically via WebRTC
    return { camera: true, mic: true };
  }

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);

  return {
    camera: result["android.permission.CAMERA"] === "granted",
    mic: result["android.permission.RECORD_AUDIO"] === "granted",
  };
}

type CallState = "joining" | "joined" | "left";

export default function NativeCallScreen() {
  const params = useLocalSearchParams<{
    workshopId: string;
    token: string;
    roomUrl: string;
    role: string;
    rules: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const rules: WorkshopRules = JSON.parse(params.rules ?? "{}");
  const isHost = params.role === "host";

  const callRef = useRef<DailyCall | null>(null);
  const [participants, setParticipants] = useState<
    Record<string, DailyParticipant>
  >({});
  const [isMicOn, setIsMicOn] = useState(!rules.force_mic_muted_on_join);
  const [isCameraOn, setIsCameraOn] = useState(rules.force_camera_on);
  const [callState, setCallState] = useState<CallState>("joining");
  const [allMuted, setAllMuted] = useState(rules.all_muted ?? false);
  const [allCamerasOff, setAllCamerasOff] = useState(
    rules.all_cameras_off ?? false,
  );

  const hostAction = useHostAction(params.workshopId!);

  const updateParticipants = useCallback(() => {
    if (!callRef.current) return;
    setParticipants({ ...callRef.current.participants() });
  }, []);

  const handleJoined = useCallback(() => {
    setCallState("joined");
    updateParticipants();
  }, [updateParticipants]);

  const handleParticipantUpdate = useCallback(
    (_event: DailyEventObjectParticipant) => {
      updateParticipants();
    },
    [updateParticipants],
  );

  const handleParticipantLeft = useCallback(
    (_event: DailyEventObjectParticipantLeft) => {
      updateParticipants();
    },
    [updateParticipants],
  );

  const handleLeft = useCallback(() => {
    setCallState("left");
    router.back();
  }, [router]);

  const handleError = useCallback(
    (event: unknown) => {
      console.error("Daily call error:", event);
      Alert.alert(
        "Connection Error",
        "Could not connect to the video call. Please try again.",
      );
      router.back();
    },
    [router],
  );

  const handleAppMessage = useCallback(
    (event: DailyEventObjectAppMessage) => {
      const msg = event.data;
      if (msg?.type !== "host_control") return;

      const action = msg.action as HostActionType;

      if (isHost) {
        // Host only updates UI state — does not mute themselves
        if (action === "mute_all") setAllMuted(true);
        else if (action === "unmute_all") setAllMuted(false);
        else if (action === "cameras_off_all") setAllCamerasOff(true);
        else if (action === "cameras_on_all") setAllCamerasOff(false);
        return;
      }

      // Participant: enforce the control locally
      if (action === "mute_all") {
        callRef.current?.setLocalAudio(false);
        setIsMicOn(false);
        setAllMuted(true);
      } else if (action === "unmute_all") {
        setAllMuted(false);
      } else if (action === "cameras_off_all") {
        callRef.current?.setLocalVideo(false);
        setIsCameraOn(false);
        setAllCamerasOff(true);
      } else if (action === "cameras_on_all") {
        setAllCamerasOff(false);
      }
    },
    [isHost],
  );

  useEffect(() => {
    let call: DailyCall | null = null;

    (async () => {
      const perms = await requestMediaPermissions();
      if (!perms.camera && !perms.mic) {
        Alert.alert(
          "Permissions Required",
          "Camera and microphone access are needed for video workshops. Please enable them in Settings.",
        );
        router.back();
        return;
      }

      call = Daily.createCallObject();
      callRef.current = call;

      call.on("joined-meeting", handleJoined);
      call.on("participant-joined", handleParticipantUpdate);
      call.on("participant-updated", handleParticipantUpdate);
      call.on("participant-left", handleParticipantLeft);
      call.on("left-meeting", handleLeft);
      call.on("error", handleError);
      call.on("app-message", handleAppMessage);

      call.join({
        url: params.roomUrl!,
        token: params.token!,
      });
    })();

    return () => {
      if (call) {
        call.leave().catch(() => {});
        call.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = useCallback(() => {
    if (!callRef.current) return;
    const newState = !isMicOn;
    callRef.current.setLocalAudio(newState);
    setIsMicOn(newState);
  }, [isMicOn]);

  const toggleCamera = useCallback(() => {
    if (!callRef.current) return;
    // Host can always toggle; participants need allow_camera_toggle
    if (!isHost && !rules.allow_camera_toggle) return;
    const newState = !isCameraOn;
    callRef.current.setLocalVideo(newState);
    setIsCameraOn(newState);
  }, [isCameraOn, isHost, rules.allow_camera_toggle]);

  const leaveCall = useCallback(() => {
    callRef.current?.leave();
  }, []);

  const performHostAction = useCallback(
    (action: HostActionType) => {
      hostAction.mutate(action, {
        onError: () => {
          Alert.alert("Error", "Could not perform action. Please try again.");
        },
      });
    },
    [hostAction],
  );

  // Separate local from remote participants
  const participantList = Object.values(participants);
  const localParticipant = participantList.find((p) => p.local);
  const remoteParticipants = participantList.filter((p) => !p.local);

  if (callState === "joining") {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <Text className="text-lg text-surface">Joining workshop...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-sm font-medium text-surface/70">
          {isHost ? "Host" : "Participant"} ·{" "}
          {remoteParticipants.length + 1} in call
        </Text>
      </View>

      {/* Video Grid */}
      <View className="flex-1 px-2 pb-2">
        {remoteParticipants.length === 0 ? (
          /* Single participant — full screen self-view */
          <View className="flex-1 overflow-hidden rounded-2xl">
            {localParticipant && (
              <ParticipantTile
                participant={localParticipant}
                mirror
                style="flex-1"
              />
            )}
          </View>
        ) : remoteParticipants.length === 1 ? (
          /* 1-on-1: remote large, local small overlay */
          <View className="flex-1">
            <View className="flex-1 overflow-hidden rounded-2xl">
              <ParticipantTile
                participant={remoteParticipants[0]}
                style="flex-1"
              />
            </View>
            {/* Local mini view */}
            {localParticipant && (
              <View className="absolute bottom-3 right-3 h-36 w-24 overflow-hidden rounded-xl border-2 border-surface/20">
                <ParticipantTile
                  participant={localParticipant}
                  mirror
                  style="flex-1"
                />
              </View>
            )}
          </View>
        ) : (
          /* Grid layout for multiple participants */
          <View className="flex-1 flex-row flex-wrap gap-2">
            {participantList.map((p) => (
              <View
                key={p.session_id}
                className="min-h-[160px] overflow-hidden rounded-2xl"
                style={{ flexBasis: "48%", flexGrow: 1 }}
              >
                <ParticipantTile
                  participant={p}
                  mirror={p.local}
                  style="flex-1"
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Host Controls */}
      {isHost && (
        <View className="border-t border-surface/10 px-4 py-3">
          <Text className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-surface/50">
            Host Controls
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              justifyContent: "center",
              flexGrow: 1,
            }}
          >
            <HostControlButton
              label={allMuted ? "Unmute All" : "Mute All"}
              icon={allMuted ? "🔊" : "🔇"}
              onPress={() =>
                performHostAction(allMuted ? "unmute_all" : "mute_all")
              }
              loading={hostAction.isPending}
            />
            <HostControlButton
              label={allCamerasOff ? "Cameras On All" : "Cameras Off All"}
              icon={allCamerasOff ? "📹" : "📷"}
              onPress={() =>
                performHostAction(
                  allCamerasOff ? "cameras_on_all" : "cameras_off_all",
                )
              }
              loading={hostAction.isPending}
            />
          </ScrollView>
        </View>
      )}

      {/* Controls */}
      <View
        className="flex-row items-center justify-center gap-5 border-t border-surface/10 px-6 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <ControlButton
          icon={isMicOn ? "🎙" : "🔇"}
          label={isMicOn ? "Mute" : "Unmute"}
          active={isMicOn}
          onPress={toggleMic}
        />
        <ControlButton
          icon={isCameraOn ? "📷" : "📷"}
          label={isCameraOn ? "Camera Off" : "Camera On"}
          active={isCameraOn}
          onPress={toggleCamera}
          disabled={!rules.allow_camera_toggle && !isHost}
        />
        <ControlButton
          icon="📞"
          label="Leave"
          variant="danger"
          onPress={leaveCall}
        />
      </View>
    </View>
  );
}

function ParticipantTile({
  participant,
  mirror = false,
  style = "",
}: {
  participant: DailyParticipant;
  mirror?: boolean;
  style?: string;
}) {
  const videoTrack = participant.tracks?.video;
  const isVideoPlayable = videoTrack?.state === "playable";

  return (
    <View className={`bg-ink/80 ${style}`}>
      {isVideoPlayable && videoTrack?.persistentTrack ? (
        <DailyMediaView
          videoTrack={videoTrack.persistentTrack}
          audioTrack={
            participant.local
              ? null
              : (participant.tracks?.audio?.persistentTrack ?? null)
          }
          mirror={mirror}
          objectFit="cover"
          style={{ flex: 1 }}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Text className="text-2xl font-bold text-surface">
              {(participant.user_name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      )}
      <View className="absolute bottom-2 left-2 flex-row items-center gap-1.5 rounded-lg bg-ink/60 px-2 py-1">
        <Text className="text-xs text-surface">
          {participant.local ? "You" : (participant.user_name ?? "Guest")}
        </Text>
        {participant.tracks?.audio?.state !== "playable" && (
          <Text style={{ fontSize: 10 }}>🔇</Text>
        )}
        {!isVideoPlayable && (
          <Text style={{ fontSize: 10 }}>📷</Text>
        )}
      </View>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  active = true,
  variant,
  disabled = false,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  variant?: "danger";
  disabled?: boolean;
  onPress: () => void;
}) {
  const bgColor =
    variant === "danger"
      ? "bg-danger"
      : active
        ? "bg-surface/20"
        : "bg-surface/10";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center rounded-full p-4 ${bgColor} ${disabled ? "opacity-40" : ""}`}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.7 : disabled ? 0.4 : 1 })}
    >
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <Text className="mt-1 text-[10px] text-surface/70">{label}</Text>
    </Pressable>
  );
}

function HostControlButton({
  label,
  icon,
  onPress,
  loading = false,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="flex-row items-center gap-2 rounded-xl bg-surface/15 px-4 py-2"
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : loading ? 0.5 : 1,
      })}
    >
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Text className="text-xs font-semibold text-surface">{label}</Text>
    </Pressable>
  );
}
