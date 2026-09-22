/**
 * PHASE 2 — shape corrected to match what the backend actually returns from
 * /auth/login, /auth/field-login, /auth/register and /auth/refresh
 * (auth.service.ts's generateToken()-based responses): camelCase, and
 * `roles` is an array of role name strings there. `/auth/me` (getProfile)
 * returns a richer, differently-shaped profile (phone, avatarUrl, locale,
 * roles as {id,name,slug} objects, etc.) — a real inconsistency in the
 * backend itself, not reconciled here; nothing in this frontend currently
 * reads the extended fields, so it wasn't in scope to fix.
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: string[];
  /** Only present on the richer `/auth/me` response, not the login/register/field-login token responses. */
  organization?: { id: string; name: string; slug: string };
}

export interface AuthResponse {
  user: AuthUser;
  token: { accessToken: string; expiresIn: number };
}

export interface RegisterResponse {
  user: AuthUser;
  token: { accessToken: string; expiresIn: number };
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
