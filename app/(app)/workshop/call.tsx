import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  StyleSheet,
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
import Ionicons from "@expo/vector-icons/Ionicons";

import type { HostActionType, WorkshopRules } from "@/types/api";
import { useHostAction } from "@/hooks/useHostAction";

/* ─── Helpers ────────────────────────────────────────────────── */

async function requestMediaPermissions(): Promise<{
  camera: boolean;
  mic: boolean;
}> {
  if (Platform.OS !== "android") {
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

function getVideoTrack(p: DailyParticipant) {
  const t = p.tracks?.video;
  if (t?.state !== "playable") return null;
  // Prefer guaranteed-playable `track`, fall back to `persistentTrack`
  return t.track ?? t.persistentTrack ?? null;
}

function getAudioTrack(p: DailyParticipant) {
  const t = p.tracks?.audio;
  if (t?.state !== "playable") return null;
  return t.track ?? t.persistentTrack ?? null;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ─── Main Screen ────────────────────────────────────────────── */

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
  const [elapsed, setElapsed] = useState(0);

  const hostAction = useHostAction(params.workshopId!);

  /* ── Daily event handlers ─────────────────────────────── */

  const updateParticipants = useCallback(() => {
    if (!callRef.current) return;
    setParticipants({ ...callRef.current.participants() });
  }, []);

  const handleJoined = useCallback(() => {
    setCallState("joined");

    // Explicitly enable camera/mic after join to guarantee they start
    const shouldEnableCamera =
      rules.force_camera_on && !rules.all_cameras_off;
    const shouldEnableMic =
      !rules.force_mic_muted_on_join && !rules.all_muted;

    if (shouldEnableCamera) {
      callRef.current?.setLocalVideo(true);
      setIsCameraOn(true);
    }
    if (shouldEnableMic) {
      callRef.current?.setLocalAudio(true);
      setIsMicOn(true);
    }

    updateParticipants();
  }, [updateParticipants, rules]);

  const handleParticipantUpdate = useCallback(
    (_e: DailyEventObjectParticipant) => updateParticipants(),
    [updateParticipants],
  );

  const handleParticipantLeft = useCallback(
    (_e: DailyEventObjectParticipantLeft) => updateParticipants(),
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
        if (action === "mute_all") setAllMuted(true);
        else if (action === "unmute_all") setAllMuted(false);
        else if (action === "cameras_off_all") setAllCamerasOff(true);
        else if (action === "cameras_on_all") setAllCamerasOff(false);
        return;
      }

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

  /* ── Lifecycle ─────────────────────────────────────────── */

  useEffect(() => {
    let call: DailyCall | null = null;

    (async () => {
      const perms = await requestMediaPermissions();
      if (!perms.camera && !perms.mic) {
        Alert.alert(
          "Permissions Required",
          "Camera and microphone access are needed for video workshops.",
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

      call.join({ url: params.roomUrl!, token: params.token! });
    })();

    return () => {
      if (call) {
        call.leave().catch(() => {});
        call.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (callState !== "joined") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callState]);

  /* ── Actions ───────────────────────────────────────────── */

  const toggleMic = useCallback(() => {
    if (!callRef.current) return;
    const next = !isMicOn;
    callRef.current.setLocalAudio(next);
    setIsMicOn(next);
  }, [isMicOn]);

  const toggleCamera = useCallback(() => {
    if (!callRef.current) return;
    if (!isHost && !rules.allow_camera_toggle) return;
    const next = !isCameraOn;
    callRef.current.setLocalVideo(next);
    setIsCameraOn(next);
  }, [isCameraOn, isHost, rules.allow_camera_toggle]);

  const flipCamera = useCallback(() => {
    callRef.current?.cycleCamera();
  }, []);

  const leaveCall = useCallback(() => {
    callRef.current?.leave();
  }, []);

  const doHostAction = useCallback(
    (action: HostActionType) => {
      hostAction.mutate(action, {
        onError: () =>
          Alert.alert("Error", "Could not perform action. Try again."),
      });
    },
    [hostAction],
  );

  /* ── Derived data ──────────────────────────────────────── */

  const participantList = Object.values(participants);
  const local = participantList.find((p) => p.local);
  const remotes = participantList.filter((p) => !p.local);
  const totalCount = participantList.length;

  /* ── Joining screen ────────────────────────────────────── */

  if (callState === "joining") {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color="#7C8B72" />
        <Text style={s.joiningText}>Connecting...</Text>
      </View>
    );
  }

  /* ── In-call UI ────────────────────────────────────────── */

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <View style={s.row}>
          <View style={s.liveDot} />
          <Text style={s.timerText}>{formatTime(elapsed)}</Text>
        </View>
        <Text style={s.countText}>
          {totalCount} {totalCount === 1 ? "person" : "people"}
        </Text>
      </View>

      {/* ── Video area ── */}
      <View style={s.videoArea}>
        {remotes.length === 0 && local ? (
          // Solo: full-screen self-view
          <View style={s.soloTile}>
            <VideoTile participant={local} mirror />
          </View>
        ) : remotes.length === 1 ? (
          // 1-on-1
          <View style={s.flex1}>
            <View style={s.soloTile}>
              <VideoTile participant={remotes[0]} />
            </View>
            {local && (
              <View style={s.pip}>
                <VideoTile participant={local} mirror small />
              </View>
            )}
          </View>
        ) : (
          // Grid
          <View style={s.grid}>
            {participantList.map((p) => (
              <View key={p.session_id} style={s.gridCell}>
                <VideoTile participant={p} mirror={p.local} />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Host controls (only for host) ── */}
      {isHost && (
        <View style={s.hostRow}>
          <Pressable
            onPress={() =>
              doHostAction(allMuted ? "unmute_all" : "mute_all")
            }
            disabled={hostAction.isPending}
            style={({ pressed }) => [
              s.hostBtn,
              { opacity: pressed ? 0.6 : hostAction.isPending ? 0.4 : 1 },
            ]}
          >
            <Ionicons
              name={allMuted ? "volume-high" : "volume-mute"}
              size={14}
              color="#fff"
            />
            <Text style={s.hostBtnText}>
              {allMuted ? "Unmute All" : "Mute All"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              doHostAction(
                allCamerasOff ? "cameras_on_all" : "cameras_off_all",
              )
            }
            disabled={hostAction.isPending}
            style={({ pressed }) => [
              s.hostBtn,
              { opacity: pressed ? 0.6 : hostAction.isPending ? 0.4 : 1 },
            ]}
          >
            <Ionicons
              name={allCamerasOff ? "videocam" : "videocam-off"}
              size={14}
              color="#fff"
            />
            <Text style={s.hostBtnText}>
              {allCamerasOff ? "Cameras On" : "Cameras Off"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Bottom control bar ── */}
      <View style={[s.controlBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <ControlBtn
          icon={isMicOn ? "mic" : "mic-off"}
          on={isMicOn}
          onPress={toggleMic}
        />
        <ControlBtn
          icon={isCameraOn ? "videocam" : "videocam-off"}
          on={isCameraOn}
          onPress={toggleCamera}
          disabled={!rules.allow_camera_toggle && !isHost}
        />
        <ControlBtn icon="camera-reverse" on onPress={flipCamera} />
        <ControlBtn icon="call" on={false} danger onPress={leaveCall} />
      </View>
    </View>
  );
}

/* ─── Video Tile ─────────────────────────────────────────────── */

function VideoTile({
  participant,
  mirror = false,
  small = false,
}: {
  participant: DailyParticipant;
  mirror?: boolean;
  small?: boolean;
}) {
  const vTrack = getVideoTrack(participant);
  const aTrack = participant.local ? null : getAudioTrack(participant);
  const isMuted = participant.tracks?.audio?.state !== "playable";

  const name = participant.local
    ? "You"
    : (participant.user_name ?? "Guest");

  const initials = (participant.user_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={s.tile}>
      {vTrack ? (
        <DailyMediaView
          videoTrack={vTrack}
          audioTrack={aTrack}
          mirror={mirror}
          objectFit="cover"
          zOrder={small ? 1 : 0}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : (
        <View style={s.avatarWrap}>
          <View style={[s.avatar, small && s.avatarSmall]}>
            <Text style={[s.avatarText, small && s.avatarTextSmall]}>
              {initials}
            </Text>
          </View>
        </View>
      )}

      {/* Name pill */}
      <View style={[s.namePill, small && s.namePillSmall]}>
        {isMuted && (
          <Ionicons
            name="mic-off"
            size={small ? 9 : 11}
            color="#ff6b6b"
          />
        )}
        <Text style={[s.nameText, small && s.nameTextSmall]}>{name}</Text>
      </View>
    </View>
  );
}

/* ─── Control Button ─────────────────────────────────────────── */

function ControlBtn({
  icon,
  on,
  danger,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  on: boolean;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.ctrlBtn,
        danger ? s.ctrlDanger : on ? s.ctrlOn : s.ctrlOff,
        { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
        icon === "call" && { transform: [{ rotate: "135deg" }] },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={danger || !on ? "#fff" : "#fff"}
      />
    </Pressable>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111" },
  center: { alignItems: "center", justifyContent: "center" },
  flex1: { flex: 1 },

  joiningText: {
    marginTop: 16,
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  timerText: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontVariant: ["tabular-nums"] },
  countText: { fontSize: 12, color: "rgba(255,255,255,0.4)" },

  // Video area
  videoArea: { flex: 1, padding: 6 },
  soloTile: { flex: 1, borderRadius: 16, overflow: "hidden" },

  // PIP (picture-in-picture self-view)
  pip: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 100,
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },

  // Grid
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  gridCell: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 200,
    borderRadius: 16,
    overflow: "hidden",
  },

  // Tile
  tile: {
    flex: 1,
    backgroundColor: "#222",
  },
  avatarWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#7C8B72",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmall: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#fff" },
  avatarTextSmall: { fontSize: 16 },

  namePill: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  namePillSmall: { bottom: 4, left: 4, paddingHorizontal: 5, paddingVertical: 2 },
  nameText: { fontSize: 11, color: "#fff", fontWeight: "500" },
  nameTextSmall: { fontSize: 9 },

  // Host controls
  hostRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hostBtnText: { fontSize: 11, fontWeight: "600", color: "#fff" },

  // Bottom control bar
  controlBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingTop: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlOn: { backgroundColor: "rgba(255,255,255,0.12)" },
  ctrlOff: { backgroundColor: "rgba(255,255,255,0.25)" },
  ctrlDanger: { backgroundColor: "#ef4444" },
});
