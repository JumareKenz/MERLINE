export type ReportStatus = 'draft' | 'generating' | 'completed' | 'failed';

export interface Report {
  id: string;
  title: string;
  description?: string;
  status: ReportStatus;
  report_type: string;
  study_id?: string;
  generated_by?: { id: string; name: string };
  generated_at?: string;
  created_at: string;
  data?: {
    summary?: string;
    sections?: Array<{ title: string; content: string }>;
    tables?: Array<{ title: string; headers: string[]; rows: string[][] }>;
    generatedAt?: string;
    generatedBy?: string;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  is_built_in: boolean;
}

export interface CreateReportDto {
  title: string;
  description?: string;
  study_id?: string;
  template_id?: string;
  config?: Record<string, unknown>;
}

export interface UpdateReportDto {
  title?: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface ReportSchedule {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  day_of_week?: number;
  day_of_month?: number;
  recipients: string[];
  next_run_at: string;
  is_active: boolean;
}

export interface CreateReportScheduleDto {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  day_of_week?: number;
  day_of_month?: number;
  recipients: string[];
}

export interface UpdateReportScheduleDto extends Partial<CreateReportScheduleDto> {
  is_active?: boolean;
}
