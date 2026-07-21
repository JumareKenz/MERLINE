export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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
  firstName: string;
  lastName: string;
  orgName: string;
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
  firstName?: string;
  lastName?: string;
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
