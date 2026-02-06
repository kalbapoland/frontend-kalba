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
