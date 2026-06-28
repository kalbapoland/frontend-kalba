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
  group_id: string;
  title: string;
  description: string;
  start_time: string;
  duration_minutes: number;
  timezone: string;  // IANA timezone, e.g. "America/Los_Angeles"
  price: string;
  max_participants: number;
  tags?: string[];
  // Caller-context fields populated by authenticated endpoints.
  is_owner?: boolean;
  is_enrolled?: boolean;
  enrolled_count?: number;
}

export interface Group {
  id: string;
  trainer_id: string;
  title: string;
  description: string;
  created_at: string;
  // Caller-context fields populated by the groups endpoints.
  member_count?: number;
  is_owner?: boolean;
  is_member?: boolean;
}

export interface GroupMember {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
}

export interface GroupCreatePayload {
  title: string;
  description?: string;
}

export interface GroupUpdatePayload {
  title?: string;
  description?: string;
}

export type MyWorkshopsRole = "trainer" | "enrolled" | "all";

export interface MyWorkshopsQuery {
  role?: MyWorkshopsRole;
  from?: string;
  to?: string;
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
  group_id: string;
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

export type MyKalbaNotificationType =
  | "workshop_rescheduled"
  | "workshop_reminder"
  | "workshop_cancelled";

export interface MyKalbaGoal {
  user_id: string;
  monthly_target: number;
  updated_at: string;
}

export interface MyKalbaStats {
  completed_this_week: number;
  completed_this_month: number;
  monthly_target: number;
  monthly_progress_percent: number;
}

export interface MyKalbaDashboard {
  goal: MyKalbaGoal;
  stats: MyKalbaStats;
  unread_notifications: number;
}

export interface MyKalbaNotification {
  id: string;
  type: MyKalbaNotificationType;
  title: string;
  body: string;
  payload: Record<string, string>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
