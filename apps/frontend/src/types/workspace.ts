export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organization_id: string;
  is_default: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceDto {
  name: string;
  description?: string;
  is_default?: boolean;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  is_default?: boolean;
}
