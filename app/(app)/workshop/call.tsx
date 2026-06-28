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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
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
  const { t } = useTranslation();

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
        t("call.err_connection_title"),
        t("call.err_connection_body"),
      );
      router.back();
    },
    [router, t],
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
          t("call.perms_title"),
          t("call.perms_body"),
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

  // Allow the call screen to follow the device orientation (BL-004). The app is
  // portrait-locked everywhere else (see root layout). We use focus (not mount)
  // so portrait is re-locked on every way out — leave / error / back / unmount
  // AND when another screen is pushed on top (e.g. a notification deep-link
  // mid-call), which does not unmount this screen.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "web") return;
      void ScreenOrientation.unlockAsync();
      return () => {
        void ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
      };
    }, []),
  );

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
          Alert.alert(t("errors.title"), t("call.err_action_body")),
      });
    },
    [hostAction, t],
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
        <ActivityIndicator size="large" color="#8A9A7E" />
        <Text style={s.joiningText}>{t("call.connecting")}</Text>
      </View>
    );
  }

  /* ── In-call UI ────────────────────────────────────────── */

  return (
    <View
      style={[
        s.root,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <View style={s.row}>
          <View style={s.liveDot} />
          <Text style={s.timerText}>{formatTime(elapsed)}</Text>
        </View>
        <Text style={s.countText}>
          {t("call.people", { count: totalCount })}
        </Text>
      </View>

      {/* ── Video area ── */}
      <View style={s.videoArea}>
        {remotes.length === 0 && local ? (
          <View style={s.soloTile}>
            <VideoTile participant={local} mirror />
          </View>
        ) : remotes.length === 1 ? (
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
              {allMuted ? t("call.unmute_all") : t("call.mute_all")}
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
              {allCamerasOff ? t("call.cameras_on") : t("call.cameras_off")}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Bottom control bar ── */}
      <View style={[s.controlBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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
  const { t } = useTranslation();
  const vTrack = getVideoTrack(participant);
  const aTrack = participant.local ? null : getAudioTrack(participant);
  const isMuted = participant.tracks?.audio?.state !== "playable";

  const name = participant.local
    ? t("call.you")
    : (participant.user_name ?? t("call.guest"));

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
            color="#C4836E"
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
  root: { flex: 1, backgroundColor: "#1A1A1A" },
  center: { alignItems: "center", justifyContent: "center" },
  flex1: { flex: 1 },

  joiningText: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: "300",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.4)",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#8A9A7E",
  },
  timerText: {
    fontSize: 13,
    fontWeight: "300",
    color: "rgba(255,255,255,0.4)",
    fontVariant: ["tabular-nums"],
  },
  countText: {
    fontSize: 12,
    fontWeight: "300",
    color: "rgba(255,255,255,0.35)",
  },

  // Video area
  videoArea: { flex: 1, padding: 8 },
  soloTile: { flex: 1, borderRadius: 20, overflow: "hidden" },

  // PIP
  pip: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
  },

  // Grid
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCell: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 200,
    borderRadius: 20,
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
    backgroundColor: "#5E6B5A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmall: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { fontSize: 24, fontWeight: "300", color: "#FAF9F6" },
  avatarTextSmall: { fontSize: 16 },

  namePill: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  namePillSmall: {
    bottom: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nameText: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "400" },
  nameTextSmall: { fontSize: 9 },

  // Host controls
  hostRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  hostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  hostBtnText: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.8)" },

  // Bottom control bar
  controlBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    paddingTop: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  ctrlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlOn: { backgroundColor: "rgba(255,255,255,0.10)" },
  ctrlOff: { backgroundColor: "rgba(255,255,255,0.20)" },
  ctrlDanger: { backgroundColor: "#C4836E" },
});
