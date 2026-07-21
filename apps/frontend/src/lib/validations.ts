import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters').max(100),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string(),
  organization_name: z.string().min(2, 'Organization name must be at least 2 characters').max(200),
  organization_type: z.string().min(1, 'Please select an organization type'),
  country: z.string().min(1, 'Please select a country'),
  accept_terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms of service' }) }),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
});

export const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(200),
  org_type: z.string().min(1, 'Please select an organization type'),
  country: z.string().min(1, 'Please select a country'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  logo_url: z.string().optional(),
});

export const userSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  first_name: z.string().min(2, 'First name must be at least 2 characters').max(100),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').max(100),
  role_id: z.string().min(1, 'Please select a role'),
  send_invite: z.boolean().optional(),
});

export const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  permission_ids: z.array(z.string()).min(1, 'Select at least one permission'),
});

export const workspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
});

export const projectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(200),
  description: z.string().max(2000).optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  donor: z.string().max(200).optional(),
  grant_ref: z.string().max(100).optional(),
  budget: z.number().positive('Budget must be positive').optional(),
  currency: z.string().length(3).optional(),
  country: z.string().optional(),
  sector: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => !data.start_date || !data.end_date || new Date(data.end_date) > new Date(data.start_date),
  { message: 'End date must be after start date', path: ['end_date'] }
);

export const studySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  study_type: z.string().min(1, 'Please select a study type'),
  methodology: z.string().min(1, 'Please select a methodology'),
  purpose: z.string().max(2000).optional(),
  population: z.string().max(500).optional(),
  sample_size: z.number().positive('Sample size must be positive').optional(),
  location: z.string().max(500).optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
}).refine(
  (data) => !data.start_date || !data.end_date || new Date(data.end_date) > new Date(data.start_date),
  { message: 'End date must be after start date', path: ['end_date'] }
);

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type RoleFormData = z.infer<typeof roleSchema>;
export type WorkspaceFormData = z.infer<typeof workspaceSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export const indicatorSchema = z.object({
  name: z.string().min(2, 'Indicator name must be at least 2 characters').max(500),
  description: z.string().max(2000).optional(),
  indicator_type: z.string().min(1, 'Please select an indicator type'),
  unit: z.string().max(50).optional(),
  aggregation: z.string().optional(),
  sector: z.string().max(200).optional(),
  data_source: z.string().max(500).optional(),
  collection_method: z.string().max(500).optional(),
  formula: z.string().max(500).optional(),
  frequency: z.string().optional(),
  baseline_value: z.number().optional(),
  target_value: z.number().optional(),
  target_year: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const questionnaireSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  description: z.string().max(2000).optional(),
  language: z.string().min(2).max(10).optional(),
  default_language: z.string().min(2).max(10).optional(),
  target_subject_count: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
});

export const reportSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  description: z.string().max(2000).optional(),
  study_id: z.string().min(1, 'Please select a study'),
  template_id: z.string().min(1, 'Please select a template'),
  config: z.record(z.unknown()).optional(),
});

export const reportScheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  day_of_week: z.number().min(0).max(6).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  recipients: z.array(z.string().email()).min(1, 'Add at least one recipient'),
});

export type IndicatorFormData = z.infer<typeof indicatorSchema>;
export type QuestionnaireFormData = z.infer<typeof questionnaireSchema>;
export type StudyFormData = z.infer<typeof studySchema>;
export type ReportFormData = z.infer<typeof reportSchema>;
export type ReportScheduleFormData = z.infer<typeof reportScheduleSchema>;
