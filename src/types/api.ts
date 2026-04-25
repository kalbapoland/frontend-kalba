export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role: "user" | "trainer";
}

export interface Workshop {
  id: string;
  trainer_id: string;
  title: string;
  description: string;
  start_time: string;
  duration_minutes: number;
  timezone: string;  // IANA timezone, e.g. "America/Los_Angeles"
  price: string;
  max_participants: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string | null;
  token_type?: string;
  user_id?: string | null;
}

export interface WorkshopCreatePayload {
  title: string;
  description?: string;
  start_time: string;
  duration_minutes: number;
  timezone?: string;
  price?: string;
  max_participants: number;
}

export interface WorkshopUpdatePayload {
  title?: string;
  description?: string;
  start_time?: string;
  duration_minutes?: number;
  timezone?: string;
  price?: string;
  max_participants?: number;
}

export interface WorkshopRules {
  force_camera_on: boolean;
  force_mic_muted_on_join: boolean;
  allow_unmute_after: number;
  allow_camera_toggle: boolean;
  all_muted: boolean;
  all_cameras_off: boolean;
}

export interface JoinWorkshopResponse {
  token: string;
  room_url: string;
  role: "host" | "participant";
  rules: WorkshopRules;
}

export type HostActionType =
  | "mute_all"
  | "unmute_all"
  | "cameras_off_all"
  | "cameras_on_all";

export interface HostActionResponse {
  status: string;
  action: HostActionType;
  broadcast_sent: boolean;
}

export type PushTokenPlatform = "ios" | "android";

export interface PushTokenRegister {
  token: string;
  platform: PushTokenPlatform;
}

export interface PushTokenUnregister {
  token: string;
}
