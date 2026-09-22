import type { Role } from './role';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'suspended';
  email_verified_at?: string;
  last_login_at?: string;
  roles: Role[];
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role_id: string;
  password?: string;
  send_invite?: boolean;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  role_id?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UserFilterParams {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  role?: string;
  status?: string;
}

/**
 * PHASE 2 — real bug fixed here: this type described a membership-wrapper
 * shape ({user_id, organization_id, role, joined_at, user: {...}}) that
 * nothing in the schema produces — there is no separate membership table,
 * role and organization live directly on `User`. `GET
 * /organizations/:orgId/members` actually returns a flat array of users
 * with a `roles` array, confirmed against a live server. This is that shape.
 */
export interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  fieldAccessCodeIssuedAt?: string | null;
  createdAt: string;
  roles: Array<{ role: Role }>;
}
