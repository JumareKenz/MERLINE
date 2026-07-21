import type { Role } from './role';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
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
  first_name: string;
  last_name: string;
  role_id: string;
  password?: string;
  send_invite?: boolean;
}

export interface UpdateUserDto {
  first_name?: string;
  last_name?: string;
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

export interface Member {
  id: string;
  user_id: string;
  organization_id: string;
  role: Role;
  joined_at: string;
  user: User;
}
