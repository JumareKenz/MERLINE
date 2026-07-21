export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  start_date: string;
  end_date: string;
  donor?: string;
  grant_ref?: string;
  budget?: number;
  currency?: string;
  country?: string;
  sector?: string;
  tags?: string[];
  settings?: Record<string, unknown>;
  team_count?: number;
  study_count: number;
  created_by: { id: string; name: string };
  created_at: string;
  updated_at: string;
}

export interface ProjectTeam {
  id: string;
  project_id: string;
  user_id: string;
  role: 'manager' | 'contributor' | 'viewer';
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar_url?: string;
  };
  created_at: string;
}

export interface ProjectActivity {
  id: string;
  description: string;
  causer_type?: string;
  causer_id?: string;
  created_at: string;
}

export interface ProjectStats {
  total_studies: number;
  total_indicators: number;
  total_questionnaires: number;
  team_members: number;
  active_studies: number;
  completion_percentage: number;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  donor?: string;
  grant_ref?: string;
  budget?: number;
  currency?: string;
  country?: string;
  sector?: string;
  tags?: string[];
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  status?: 'draft' | 'active' | 'completed' | 'archived';
}

export interface CloneProjectDto {
  name: string;
  code?: string;
  include_studies?: boolean;
  include_indicators?: boolean;
}

export interface ProjectFilterParams {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  status?: string | string[];
  date_from?: string;
  date_to?: string;
}
