export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: Permission[];
  user_count: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  slug: string;
  module: string;
  description?: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permission_ids: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permission_ids?: string[];
}

export interface PermissionGroup {
  module: string;
  label: string;
  permissions: Permission[];
}
