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
  price: string;
  max_participants: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
}

export interface WorkshopCreatePayload {
  title: string;
  description?: string;
  start_time: string;
  duration_minutes: number;
  price?: string;
  max_participants: number;
}

export interface WorkshopRules {
  force_camera_on: boolean;
  force_mic_muted_on_join: boolean;
  allow_unmute_after: number;
  allow_camera_toggle: boolean;
}

export interface JoinWorkshopResponse {
  token: string;
  room_url: string;
  role: "host" | "participant";
  rules: WorkshopRules;
}
