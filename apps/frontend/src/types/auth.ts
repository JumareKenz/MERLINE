export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  email_verified_at?: string;
  created_at: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expires_at: string;
}

export interface RegisterResponse {
  user: AuthUser;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  token: string;
}

export interface LoginDto {
  email: string;
  password: string;
  device_name?: string;
  remember?: boolean;
}

export interface RegisterDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  organization_type: string;
  country: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface UpdateProfileDto {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
}

export interface AuthSession {
  id: string;
  device_name: string;
  ip_address: string;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}
