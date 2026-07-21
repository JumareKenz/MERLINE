export interface Organization {
  id: string;
  name: string;
  slug: string;
  org_type: string;
  country: string;
  logo_url?: string;
  website?: string;
  settings: Record<string, unknown>;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  org_type?: string;
  country?: string;
  logo_url?: string;
  website?: string;
  settings?: Record<string, unknown>;
}
