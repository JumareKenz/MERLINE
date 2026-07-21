import type { AxiosRequestConfig, AxiosResponse } from 'axios';

const uid = (): string => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const pdate = (daysAgo: number): string => new Date(Date.now() - daysAgo * 86400000).toISOString();
const fdate = (daysAhead: number): string => new Date(Date.now() + daysAhead * 86400000).toISOString();
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const num = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const wrap = <T>(data: T, meta?: Record<string, unknown>): { data: T; meta?: Record<string, unknown> } => {
  const result: { data: T; meta?: Record<string, unknown> } = { data };
  if (meta) result.meta = meta;
  return result;
};

const wrapPaginated = <T>(data: T[], page = 1, perPage = 25, total?: number) => {
  const t = total ?? data.length;
  return {
    data,
    meta: { current_page: page, per_page: perPage, total: t, last_page: Math.ceil(t / perPage), has_more: page * perPage < t },
  };
};

const DEMO_USER = {
  id: 'user-001',
  email: 'admin@merline.org',
  first_name: 'Jane',
  last_name: 'Mwangi',
  avatar_url: '',
  email_verified_at: pdate(30),
  created_at: pdate(90),
};

const DEMO_ORG = {
  id: 'org-001',
  name: 'Merline Demo Organization',
  slug: 'merline-demo',
  type: 'ngo',
  country: 'Kenya',
  settings: { locale: 'en', timezone: 'Africa/Nairobi' },
  created_at: pdate(90),
};

const DEMO_PROJECTS = Array.from({ length: 8 }, (_, i) => ({
  id: `proj-${String(i + 1).padStart(3, '0')}`,
  code: `PRJ-${2024}-${String(i + 1).padStart(3, '0')}`,
  name: pick(['Community Health Assessment', 'Education Access Study', 'Water Quality Monitoring', 'Agricultural Livelihoods Survey', 'Gender Equality Baseline', 'Youth Employment Tracking', 'Nutrition Program Evaluation', 'Climate Resilience Study']),
  description: 'A comprehensive study to assess key indicators and gather actionable insights for program improvement.',
  status: pick(['draft', 'active', 'active', 'active', 'completed', 'completed', 'archived']) as string,
  start_date: pdate(num(30, 180)),
  end_date: fdate(num(30, 365)),
  donor: pick(['USAID', 'DFID', 'World Bank', 'UNICEF', 'Gates Foundation', 'EU', 'Sida']),
  grant_ref: `GR-${num(1000, 9999)}-${num(100, 999)}`,
  budget: num(50000, 2000000),
  currency: 'USD',
  country: pick(['Kenya', 'Uganda', 'Tanzania', 'Ethiopia', 'Rwanda', 'Nigeria', 'Ghana']),
  sector: pick(['Health', 'Education', 'Agriculture', 'Water & Sanitation', 'Livelihoods', 'Gender', 'Environment']),
  tags: [pick(['baseline', 'evaluation', 'monitoring', 'research']), pick(['quantitative', 'qualitative', 'mixed-method'])],
  team_count: num(3, 12),
  study_count: num(1, 5),
  created_by: { id: DEMO_USER.id, name: `${DEMO_USER.first_name} ${DEMO_USER.last_name}` },
  created_at: pdate(num(30, 180)),
  updated_at: pdate(num(1, 10)),
}));

const statuses: string[] = ['draft', 'planned', 'in_design', 'design_review', 'approved', 'pre_test', 'data_collection', 'data_cleaning', 'analysis', 'reporting', 'completed'];
const studyTypes: string[] = ['baseline', 'midline', 'endline', 'kis', 'formative', 'evaluation', 'rapid_assessment', 'needs_assessment'];
const methodologies: string[] = ['quantitative', 'qualitative', 'mixed_method'];
const enumNames: string[] = ['Alice Kamau', 'Brian Otieno', 'Cynthia Wanjiku', 'David Ochieng', 'Esther Nyambura', 'Francis Mwangi'];
const enumLoads = [
  { id: 'enum-001', name: 'Alice Kamau' },
  { id: 'enum-002', name: 'Brian Otieno' },
  { id: 'enum-003', name: 'Cynthia Wanjiku' },
];

const DEMO_STUDIES = DEMO_PROJECTS.flatMap((p) =>
  Array.from({ length: p.study_count }, (_, i) => ({
    id: `study-${uid()}`,
    code: `STD-${p.code.split('-')[1]}-${String(i + 1).padStart(2, '0')}`,
    title: pick(['Baseline Assessment', 'Midline Evaluation', 'Endline Survey', 'KAP Study', 'Needs Assessment', 'Process Evaluation', 'Outcome Evaluation']),
    purpose: 'To measure key indicators and assess program effectiveness.',
    study_type: pick(studyTypes),
    methodology: pick(methodologies),
    status: pick(statuses),
    population: pick(['Households', 'Smallholder farmers', 'School children', 'Women of reproductive age', 'Youth (15-24)', 'Community health workers']),
    sample_size: num(200, 5000),
    location: pick(['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Machakos', 'Kilifi', 'Meru']),
    start_date: pdate(num(10, 90)),
    end_date: fdate(num(10, 180)),
    project_id: p.id,
    project: { id: p.id, name: p.name },
    objectives: ['Assess current status of key indicators', 'Identify gaps and opportunities', 'Provide actionable recommendations'],
    research_questions: ['What is the current status?', 'What factors influence outcomes?', 'What are the key barriers?'],
    ethical_approval_status: pick(['approved', 'pending', 'not_required']),
    created_by: p.created_by,
    created_at: pdate(num(5, 60)),
    updated_at: pdate(num(1, 5)),
  }))
);

const DEMO_INDICATORS = Array.from({ length: 20 }, (_, i) => ({
  id: `ind-${String(i + 1).padStart(3, '0')}`,
  code: `IND-${String(i + 1).padStart(3, '0')}`,
  name: pick([
    'School enrollment rate', 'Maternal mortality rate', 'Access to clean water', 'Child malnutrition prevalence',
    'HIV prevalence rate', 'Agricultural yield per hectare', 'Household income level', 'Gender parity index',
    'Vaccination coverage', 'Literacy rate', 'Employment rate youth', 'Poverty headcount ratio',
    'Forest cover change', 'Carbon emission reduction', 'Access to electricity',
  ]),
  definition: 'This indicator measures the proportion of the target population meeting the defined criteria.',
  indicator_type: pick(['quantitative', 'quantitative', 'qualitative', 'proxy']) as string,
  data_type: pick(['boolean', 'percentage', 'count', 'ratio', 'score']) as string,
  level: pick(['impact', 'outcome', 'output', 'process']) as string,
  direction: pick(['positive', 'positive', 'negative']) as string,
  unit: pick(['%', 'rate per 1000', 'kg/ha', 'USD', 'index', 'count']),
  frequency: pick(['monthly', 'quarterly', 'bi_annual', 'annual']) as string,
  data_source: pick(['Household survey', 'Administrative data', 'Facility records', 'Direct observation', 'Key informant interview']),
  collection_method: pick(['Questionnaire', 'Interview', 'Focus group', 'Direct measurement', 'Document review']),
  baseline_value: num(10, 60),
  baseline_year: 2023,
  target_value: num(60, 95),
  target_year: 2026,
  is_kpi: Math.random() > 0.5,
  status: pick(['draft', 'under_review', 'approved', 'approved']) as string,
  study_id: pick(DEMO_STUDIES)?.id,
  study_name: pick(DEMO_STUDIES)?.title,
  sector: pick(['Health', 'Education', 'Agriculture', 'WASH', 'Livelihoods']),
  created_by: DEMO_USER,
  created_at: pdate(num(10, 60)),
  updated_at: pdate(num(1, 5)),
}));

const DEMO_QUESTIONNAIRES = Array.from({ length: 6 }, (_, i) => ({
  id: `qnr-${String(i + 1).padStart(3, '0')}`,
  title: pick(['Household Survey', 'KAP Questionnaire', 'Satisfaction Survey', 'Health Assessment', 'Livelihoods Questionnaire', 'Education Survey']),
  description: 'A structured questionnaire for data collection in the field.',
  status: pick(['draft', 'draft', 'published', 'published', 'archived']) as string,
  version: `v${num(1, 3)}.${num(0, 2)}`,
  locale: 'en',
  section_count: num(3, 7),
  question_count: num(20, 80),
  study_id: pick(DEMO_STUDIES)?.id,
  project_id: pick(DEMO_PROJECTS)?.id,
  created_by: DEMO_USER,
  created_at: pdate(num(10, 60)),
  updated_at: pdate(num(1, 10)),
}));

const DEMO_SUBMISSIONS = Array.from({ length: 15 }, () => ({
  id: `sub-${uid()}`,
  assignment_id: `assign-${uid()}`,
  questionnaire_id: pick(DEMO_QUESTIONNAIRES).id,
  enumerator_id: pick(enumLoads).id,
  enumerator_name: pick(enumNames),
  respondent_id: `resp-${uid()}`,
  status: pick(['in_progress', 'completed', 'completed', 'completed', 'approved', 'rejected', 'flagged']) as string,
  quality_score: num(60, 100),
  completeness_percentage: num(50, 100),
  started_at: pdate(num(1, 14)),
  completed_at: Math.random() > 0.3 ? pdate(num(0, 5)) : null,
  location: { lat: -1.2921 + Math.random() * 0.1, lng: 36.8219 + Math.random() * 0.1 },
  created_at: pdate(num(1, 14)),
}));

const DEMO_ASSIGNMENTS = Array.from({ length: 10 }, (_, i) => ({
  id: `assign-${String(i + 1).padStart(3, '0')}`,
  questionnaire_id: pick(DEMO_QUESTIONNAIRES).id,
  questionnaire_title: pick(DEMO_QUESTIONNAIRES).title,
  enumerator_id: pick(enumLoads).id,
  enumerator_name: pick(enumNames),
  status: pick(['assigned', 'in_progress', 'in_progress', 'completed', 'completed', 'approved', 'rejected']) as string,
  target_submissions: num(10, 100),
  completed_submissions: num(0, 50),
  due_date: fdate(num(5, 30)),
  created_by: DEMO_USER,
  created_at: pdate(num(1, 14)),
  updated_at: pdate(num(0, 5)),
}));

const DEMO_REPORTS = Array.from({ length: 5 }, (_, i) => ({
  id: `rpt-${String(i + 1).padStart(3, '0')}`,
  title: pick(['Quarterly Progress Report', 'Baseline Findings Report', 'Endline Evaluation Report', 'Indicator Performance Report', 'Annual Monitoring Report']),
  description: 'Comprehensive analysis of collected data and key findings.',
  type: pick(['summary', 'detailed', 'executive', 'technical']) as string,
  format: pick(['pdf', 'xlsx', 'docx']) as string,
  status: pick(['draft', 'generating', 'ready', 'ready', 'ready', 'archived']) as string,
  study_id: pick(DEMO_STUDIES)?.id,
  project_id: pick(DEMO_PROJECTS)?.id,
  config: { sections: ['executive_summary', 'methodology', 'findings', 'conclusions'] },
  created_by: DEMO_USER,
  created_at: pdate(num(5, 30)),
  updated_at: pdate(num(1, 5)),
}));

const DEMO_USERS = Array.from({ length: 10 }, (_, i) => ({
  id: `user-${String(i + 1).padStart(3, '0')}`,
  email: `${['alice', 'brian', 'carol', 'david', 'esther', 'frank', 'grace', 'henry', 'irene', 'james'][i]}@merline.org`,
  first_name: ['Alice', 'Brian', 'Carol', 'David', 'Esther', 'Frank', 'Grace', 'Henry', 'Irene', 'James'][i],
  last_name: ['Kamau', 'Otieno', 'Wanjiku', 'Ochieng', 'Nyambura', 'Mwangi', 'Akinyi', 'Kiprop', 'Wambui', 'Njoroge'][i],
  email_verified_at: pdate(num(1, 60)),
  avatar_url: '',
  created_at: pdate(num(10, 90)),
}));

const DEMO_ROLES = [
  { id: 'role-001', name: 'Administrator', slug: 'admin', description: 'Full system access', guard_name: 'web', created_at: pdate(90) },
  { id: 'role-002', name: 'Project Manager', slug: 'project-manager', description: 'Manage projects and teams', guard_name: 'web', created_at: pdate(90) },
  { id: 'role-003', name: 'Researcher', slug: 'researcher', description: 'Design studies and analyze data', guard_name: 'web', created_at: pdate(90) },
  { id: 'role-004', name: 'Enumerator', slug: 'enumerator', description: 'Collect data in the field', guard_name: 'web', created_at: pdate(90) },
  { id: 'role-005', name: 'Viewer', slug: 'viewer', description: 'Read-only access', guard_name: 'web', created_at: pdate(90) },
];

const DEMO_WORKSPACES = [
  { id: 'ws-001', name: 'Health Programs', slug: 'health-programs', description: 'All health-related studies and projects', owner_id: DEMO_USER.id, member_count: 8, created_at: pdate(60) },
  { id: 'ws-002', name: 'Education Initiatives', slug: 'education-initiatives', description: 'Education sector monitoring and evaluation', owner_id: DEMO_USER.id, member_count: 5, created_at: pdate(45) },
  { id: 'ws-003', name: 'Cross-Cutting', slug: 'cross-cutting', description: 'Shared resources across all programs', owner_id: DEMO_USER.id, member_count: 12, created_at: pdate(30) },
];

const DEMO_AI_SESSIONS = Array.from({ length: 5 }, (_, i) => ({
  id: `ais-${uid()}`,
  agent_id: pick(['knowledge', 'research_design', 'indicator', 'reporting', 'survey_design'] as const),
  status: 'active',
  message_count: num(2, 15),
  created_at: pdate(num(0, 7)),
  updated_at: pdate(num(0, 1)),
}));

const DEMO_AI_MESSAGES = Array.from({ length: 6 }, (_, i) => ({
  id: `aim-${uid()}`,
  role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
  content: i % 2 === 0
    ? pick(['How do I design a baseline study?', 'What indicators would you recommend?', 'Analyze this data for me', 'Help me improve this survey question', 'Translate this to Swahili'])
    : pick([
      'Based on best practices, a baseline study should establish pre-intervention measurements...',
      'I recommend focusing on outcome-level indicators that align with your program goals...',
      'The data shows a significant improvement in key metrics over the reporting period...',
      'Here is an improved version with clearer wording and better response options...',
      'Hii ni tafsiri ya Kiswahili ya maandishi yako...',
    ]),
  metadata: i % 2 === 0 ? undefined : { confidence: 0.92 + Math.random() * 0.07 },
  created_at: pdate(num(0, 1)),
}));

const DEMO_AI_INFERENCES = Array.from({ length: 30 }, () => ({
  id: `inf-${uid()}`,
  agent: pick(['knowledge', 'research_design', 'indicator', 'reporting', 'survey_design', 'translation'] as const),
  model: pick(['gpt-4o', 'gpt-4o-mini', 'claude-3-haiku']),
  latency_ms: num(200, 5000),
  cost: parseFloat((Math.random() * 0.05).toFixed(5)),
  tokens: num(100, 4000),
  confidence: parseFloat((0.7 + Math.random() * 0.28).toFixed(3)),
  status: pick(['completed', 'completed', 'completed', 'completed', 'failed']) as string,
  created_at: pdate(num(0, 14)),
}));

const DEMO_DASHBOARD_SUMMARY: Record<string, unknown> = {
  total_studies: DEMO_STUDIES.length,
  active_studies: DEMO_STUDIES.filter((s) => !['completed', 'archived', 'draft'].includes(s.status)).length,
  completion_rate: 67,
  total_submissions: 342,
  indicator_coverage: 78,
  geographic_reach: 12,
  trend_data: Array.from({ length: 12 }, (_, i) => ({
    period: new Date(Date.now() - (11 - i) * 30 * 86400000).toISOString().substring(0, 7),
    submissions: num(15, 45),
    completions: num(10, 35),
  })),
};

const DEMO_ACTIVITIES = Array.from({ length: 20 }, () => ({
  id: `act-${uid()}`,
  log_name: pick(['project', 'study', 'submission', 'user', 'system']),
  description: pick([
    'Created new project', 'Updated study status', 'Submitted questionnaire data',
    'Approved submission', 'Generated report', 'Added team member',
    'Modified indicator targets', 'Published questionnaire',
  ]),
  event: pick(['created', 'updated', 'approved', 'submitted', 'generated']),
  causer: { id: pick(DEMO_USERS).id, name: `${pick(DEMO_USERS).first_name} ${pick(DEMO_USERS).last_name}` },
  created_at: pdate(num(0, 30)),
}));

const DEMO_ALERTS: Record<string, unknown>[] = [
  { id: 'alert-001', title: 'Low Submission Rate', message: 'Study XYZ has only 30% submission rate, 5 days before deadline.', severity: 'warning', type: 'submission_rate', created_at: pdate(1) },
  { id: 'alert-002', title: 'Quality Score Drop', message: 'Average quality score dropped below 70% in the last 48 hours.', severity: 'critical', type: 'quality', created_at: pdate(0.5) },
  { id: 'alert-003', title: 'New Study Approved', message: 'Baseline assessment for Community Health has been approved for data collection.', severity: 'info', type: 'study_status', created_at: pdate(0.2) },
];

const DEMO_METRICS: Record<string, unknown> = {
  total_inferences: 1247,
  total_cost: 12.48,
  avg_latency_ms: 1842,
  total_tokens: 523000,
  agent_breakdown: {
    knowledge: { inferences: 412, cost: 3.85, tokens: 182000, avg_latency_ms: 1200 },
    research_design: { inferences: 215, cost: 2.40, tokens: 98000, avg_latency_ms: 2100 },
    indicator: { inferences: 189, cost: 1.95, tokens: 85000, avg_latency_ms: 1800 },
    reporting: { inferences: 156, cost: 1.80, tokens: 72000, avg_latency_ms: 2200 },
    survey_design: { inferences: 142, cost: 1.28, tokens: 52000, avg_latency_ms: 1900 },
    translation: { inferences: 133, cost: 1.20, tokens: 34000, avg_latency_ms: 1500 },
  },
  daily_usage: Array.from({ length: 30 }, (_, i) => ({
    date: pdate(29 - i).substring(0, 10),
    inferences: num(15, 65),
    cost: parseFloat((Math.random() * 0.5).toFixed(3)),
    tokens: num(15000, 40000),
  })),
};

const DEMO_RAG_DOCUMENTS = Array.from({ length: 4 }, (_, i) => ({
  id: `rag-${uid()}`,
  filename: pick(['baseline_guide.pdf', 'indicator_reference.xlsx', 'sampling_framework.docx', 'data_collection_manual.pdf']),
  file_type: pick(['pdf', 'xlsx', 'docx']),
  file_size: num(100000, 5000000),
  status: pick(['processed', 'processed', 'processing']),
  chunk_count: num(20, 150),
  created_at: pdate(num(1, 20)),
}));

const DEMO_PERMISSIONS = [
  { group: 'Projects', permissions: [{ name: 'view projects', slug: 'view-projects' }, { name: 'create projects', slug: 'create-projects' }, { name: 'edit projects', slug: 'edit-projects' }, { name: 'delete projects', slug: 'delete-projects' }] },
  { group: 'Studies', permissions: [{ name: 'view studies', slug: 'view-studies' }, { name: 'create studies', slug: 'create-studies' }, { name: 'edit studies', slug: 'edit-studies' }, { name: 'delete studies', slug: 'delete-studies' }, { name: 'transition studies', slug: 'transition-studies' }] },
  { group: 'Questionnaires', permissions: [{ name: 'view questionnaires', slug: 'view-questionnaires' }, { name: 'create questionnaires', slug: 'create-questionnaires' }, { name: 'edit questionnaires', slug: 'edit-questionnaires' }, { name: 'publish questionnaires', slug: 'publish-questionnaires' }] },
  { group: 'Data Collection', permissions: [{ name: 'view assignments', slug: 'view-assignments' }, { name: 'manage assignments', slug: 'manage-assignments' }, { name: 'submit data', slug: 'submit-data' }, { name: 'review submissions', slug: 'review-submissions' }] },
  { group: 'Reports', permissions: [{ name: 'view reports', slug: 'view-reports' }, { name: 'create reports', slug: 'create-reports' }, { name: 'export reports', slug: 'export-reports' }] },
  { group: 'Administration', permissions: [{ name: 'manage users', slug: 'manage-users' }, { name: 'manage roles', slug: 'manage-roles' }, { name: 'view audit log', slug: 'view-audit-log' }, { name: 'manage settings', slug: 'manage-settings' }] },
];

type MockHandler = (config: AxiosRequestConfig) => { data: unknown; meta?: Record<string, unknown> };

interface RoutePattern {
  method: string;
  pattern: RegExp;
  params: string[];
  handler: (config: AxiosRequestConfig, params: Record<string, string>) => { data: unknown; meta?: Record<string, unknown> };
}

const routes: RoutePattern[] = [];

const r = (method: string, path: string, handler: (config: AxiosRequestConfig, params: Record<string, string>) => { data: unknown; meta?: Record<string, unknown> }) => {
  const paramNames: string[] = [];
  const patternStr = path.replace(/:(\w+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; });
  routes.push({ method: method.toUpperCase(), pattern: new RegExp(`^${patternStr}$`), params: paramNames, handler });
};

const matchRoute = (method: string, url: string): { handler: MockHandler; params: Record<string, string> } | null => {
  for (const route of routes) {
    if (route.method !== method.toUpperCase()) continue;
    const match = url.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      route.params.forEach((name, i) => { params[name] = match[i + 1]; });
      return { handler: (cfg) => route.handler(cfg, params), params };
    }
  }
  return null;
};

// Auth
r('POST', '/auth/login', () => wrap({ user: DEMO_USER, token: 'mock-token-' + uid(), expires_at: fdate(7) }));
r('POST', '/auth/register', () => wrap({ user: DEMO_USER, organization: { id: DEMO_ORG.id, name: DEMO_ORG.name, slug: DEMO_ORG.slug }, token: 'mock-token-' + uid() }));
r('POST', '/auth/logout', () => wrap({ message: 'Logged out' }));
r('POST', '/auth/refresh', () => wrap({ token: 'mock-token-' + uid() }));
r('GET', '/auth/me', () => wrap(DEMO_USER));
r('PUT', '/auth/me', (cfg) => wrap({ ...DEMO_USER, ...cfg.data }));
r('POST', '/auth/forgot-password', () => wrap({ message: 'Password reset link sent' }));
r('POST', '/auth/reset-password', () => wrap({ message: 'Password reset successfully' }));
r('GET', '/auth/sessions', () => wrap([{ id: 'sess-01', device_name: 'Chrome on Windows', ip_address: '192.168.1.1', last_active_at: pdate(0), created_at: pdate(30), is_current: true }]));
r('DELETE', '/auth/sessions/:id', () => wrap({ message: 'Session deleted' }));

// Organization
r('GET', '/organizations', () => wrap(DEMO_ORG));
r('PUT', '/organizations/:id', (cfg, p) => wrap({ ...DEMO_ORG, ...cfg.data }));
r('GET', '/organizations/:id/members', () => wrapPaginated(DEMO_USERS));
r('POST', '/organizations/:id/members', () => wrap({ ...DEMO_USERS[0] }));
r('PUT', '/organizations/:id/members/:userId/role', () => wrap({ message: 'Role updated' }));
r('DELETE', '/organizations/:id/members/:userId', () => wrap({ message: 'Member removed' }));

// Teams
r('GET', '/organizations/:id/teams', () => wrap(DEMO_USERS.slice(0, 4)));
r('POST', '/organizations/:id/teams', (cfg) => wrap({ id: uid(), ...cfg.data }));
r('GET', '/teams/:id', () => wrap({ id: 'team-001', name: 'Field Team Alpha' }));
r('PUT', '/teams/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/teams/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/teams/:id/members', () => wrap({ message: 'Member added' }));
r('DELETE', '/teams/:id/members/:userId', () => wrap({ message: 'Member removed' }));

// Roles
r('GET', '/roles', () => wrap(DEMO_ROLES));
r('GET', '/roles/:id', (cfg, p) => wrap(DEMO_ROLES.find((r) => r.id === p.id) || DEMO_ROLES[0]));
r('POST', '/roles', (cfg) => wrap({ id: uid(), ...cfg.data }));
r('PUT', '/roles/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/roles/:id', () => wrap({ message: 'Deleted' }));
r('GET', '/roles/permissions', () => wrap(DEMO_PERMISSIONS));

// Workspaces
r('GET', '/workspaces', () => wrap(DEMO_WORKSPACES));
r('GET', '/workspaces/:id', (cfg, p) => wrap(DEMO_WORKSPACES.find((w) => w.id === p.id) || DEMO_WORKSPACES[0]));
r('POST', '/workspaces', (cfg) => wrap({ id: uid(), ...cfg.data }));
r('PUT', '/workspaces/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/workspaces/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/workspaces/:id/set-default', () => wrap({ message: 'Default set' }));

// Projects
r('GET', '/projects', (cfg) => {
  const page = cfg.params?.page ? parseInt(cfg.params.page as string) : 1;
  return wrapPaginated(DEMO_PROJECTS, page);
});
r('GET', '/projects/:id', (cfg, p) => wrap(DEMO_PROJECTS.find((pr) => pr.id === p.id) || DEMO_PROJECTS[0]));
r('POST', '/projects', (cfg) => wrap({ ...DEMO_PROJECTS[0], id: 'proj-new', code: 'PRJ-2024-NEW', ...cfg.data }));
r('PUT', '/projects/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/projects/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/projects/:id/archive', () => wrap({ message: 'Archived' }));
r('POST', '/projects/:id/restore', () => wrap({ message: 'Restored' }));
r('POST', '/projects/:id/clone', () => wrap(DEMO_PROJECTS[0]));
r('GET', '/projects/:id/timeline', () => wrap(DEMO_ACTIVITIES.slice(0, 10)));
r('GET', '/projects/:id/stats', () => wrap({
  total_studies: num(2, 8), total_indicators: num(5, 20), total_questionnaires: num(2, 6),
  team_members: num(3, 12), active_studies: num(1, 4), completion_percentage: num(20, 90),
}));
r('GET', '/projects/:id/team', () => wrap(DEMO_USERS.map((u) => ({ id: `pt-${uid()}`, project_id: 'proj-001', user_id: u.id, role: pick(['manager', 'contributor', 'viewer']), user: u }))));
r('POST', '/projects/:id/team', () => wrap({ id: uid(), project_id: 'proj-001', role: 'contributor' }));
r('PUT', '/projects/:id/team/:memberId', () => wrap({ message: 'Updated' }));
r('DELETE', '/projects/:id/team/:memberId', () => wrap({ message: 'Removed' }));

// Studies (under projects)
r('GET', '/projects/:id/studies', (cfg, p) => {
  const projectStudies = DEMO_STUDIES.filter((s) => s.project_id === p.id);
  return wrapPaginated(projectStudies.length ? projectStudies : DEMO_STUDIES.slice(0, 3));
});
r('POST', '/projects/:id/studies', (cfg) => wrap({ ...DEMO_STUDIES[0], id: 'study-new', ...cfg.data }));

// Studies (standalone)
r('GET', '/studies', () => wrapPaginated(DEMO_STUDIES));
r('GET', '/studies/:id', (cfg, p) => wrap(DEMO_STUDIES.find((s) => s.id === p.id) || DEMO_STUDIES[0]));
r('PUT', '/studies/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/studies/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/studies/:id/archive', () => wrap({ message: 'Archived' }));
r('POST', '/studies/:id/restore', () => wrap({ message: 'Restored' }));
r('POST', '/studies/:id/clone', () => wrap(DEMO_STUDIES[0]));
r('POST', '/studies/:id/transitions', () => wrap({ ...DEMO_STUDIES[0], status: pick(statuses) }));
r('GET', '/studies/:id/lifecycle', () => wrap(
  Array.from({ length: 5 }, (_, i) => ({
    id: `lc-${uid()}`, from_status: statuses[i], to_status: statuses[i + 1],
    transition: 'approved', user: { id: DEMO_USER.id, name: `${DEMO_USER.first_name} ${DEMO_USER.last_name}` },
    created_at: pdate(num(i * 5, (i + 1) * 5)),
  }))
));
r('GET', '/studies/:id/timeline', () => wrap(DEMO_ACTIVITIES.slice(0, 8)));

// Study indicators
r('GET', '/studies/:id/indicators', () => wrap(DEMO_INDICATORS.slice(0, 6).map((ind) => ({ id: ind.id, indicator_id: ind.id, indicator: ind, study_id: 'study-001' }))));
r('POST', '/studies/:id/indicators', () => wrap({ message: 'Linked' }));
r('DELETE', '/studies/:id/indicators/:indicatorId', () => wrap({ message: 'Unlinked' }));

// Indicators
r('GET', '/indicators/library', (cfg) => {
  const page = cfg.params?.page ? parseInt(cfg.params.page as string) : 1;
  return wrapPaginated(DEMO_INDICATORS, page, 25, 20);
});
r('GET', '/indicators/:id', (cfg, p) => wrap(DEMO_INDICATORS.find((ind) => ind.id === p.id) || DEMO_INDICATORS[0]));
r('POST', '/indicators', (cfg) => wrap({ ...DEMO_INDICATORS[0], id: 'ind-new', ...cfg.data }));
r('PUT', '/indicators/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/indicators/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/indicators/:id/approve', () => wrap({ message: 'Approved' }));
r('POST', '/indicators/:id/supersede', () => wrap({ message: 'Superseded' }));
r('GET', '/indicators/:id/values', () => wrap(
  Array.from({ length: 8 }, (_, i) => ({
    id: `iv-${uid()}`, indicator_id: 'ind-001', value: Math.random() * 100, period: pdate(i * 30).substring(0, 7),
    source: pick(['survey', 'admin_data', 'facility_records']), submitted_by: DEMO_USER.id, created_at: pdate(i * 30),
  }))
));
r('POST', '/indicators/:id/values', (cfg) => wrap({ id: `iv-${uid()}`, ...cfg.data }));
r('GET', '/indicators/:id/targets', () => wrap(
  Array.from({ length: 4 }, (_, i) => ({
    id: `it-${uid()}`, indicator_id: 'ind-001', value: num(50, 95), year: 2024 + i,
    created_at: pdate(60),
  }))
));
r('POST', '/indicators/:id/targets', () => wrap({ id: `it-${uid()}`, value: 80, year: 2026 }));
r('GET', '/indicators/:id/trends', () => wrap({
  values: Array.from({ length: 12 }, (_, i) => ({
    period: new Date(Date.now() - (11 - i) * 30 * 86400000).toISOString().substring(0, 7),
    value: parseFloat((Math.random() * 100).toFixed(1)),
  })),
  target: 80,
  rag_status: pick(['on_track', 'at_risk', 'off_track']),
}));

// Questionnaires
r('GET', '/questionnaires', (cfg) => {
  const page = cfg.params?.page ? parseInt(cfg.params.page as string) : 1;
  return wrapPaginated(DEMO_QUESTIONNAIRES, page);
});
r('GET', '/questionnaires/:id', (cfg, p) => wrap(DEMO_QUESTIONNAIRES.find((q) => q.id === p.id) || DEMO_QUESTIONNAIRES[0]));
r('POST', '/questionnaires', (cfg) => wrap({ ...DEMO_QUESTIONNAIRES[0], id: 'qnr-new', ...cfg.data }));
r('PUT', '/questionnaires/:id', (cfg) => wrap({ message: 'Updated' }));
r('DELETE', '/questionnaires/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/questionnaires/:id/clone', () => wrap(DEMO_QUESTIONNAIRES[0]));
r('POST', '/questionnaires/:id/publish', () => wrap({ message: 'Published' }));
r('POST', '/questionnaires/:id/archive', () => wrap({ message: 'Archived' }));

// Questionnaire sections
r('GET', '/questionnaires/:id/sections', () => wrap(
  Array.from({ length: num(3, 6) }, (_, i) => ({
    id: `sec-${uid()}`, questionnaire_id: 'qnr-001', title: pick(['Demographics', 'Household Characteristics', 'Health Status', 'Economic Indicators', 'Education Access', 'Water & Sanitation']),
    description: 'Section description', order: i + 1, question_count: num(5, 15),
    created_at: pdate(30), updated_at: pdate(5),
  }))
));
r('POST', '/questionnaires/:id/sections', (cfg) => wrap({ id: `sec-${uid()}`, ...cfg.data }));
r('PUT', '/sections/:id', () => wrap({ id: `sec-${uid()}` }));
r('DELETE', '/sections/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/questionnaires/:id/sections/reorder', () => wrap({ message: 'Reordered' }));

// Questions
r('GET', '/sections/:id/questions', () => wrap(
  Array.from({ length: num(5, 10) }, (_, i) => ({
    id: `q-${uid()}`, section_id: 'sec-001',
    question_type: pick(['text', 'number', 'select_one', 'select_multiple', 'date', 'geopoint', 'rating', 'boolean']) as string,
    label: pick([
      'What is your age?', 'Gender', 'Highest level of education completed',
      'What is your primary source of income?', 'Do you have access to clean drinking water?',
      'How many children under 5 live in your household?', 'Rate your satisfaction with services',
      'What is your main concern?', 'Location (GPS)',
    ]),
    hint: '', required: Math.random() > 0.2, order: i + 1,
    validation: null, metadata: null,
    created_at: pdate(30), updated_at: pdate(5),
  }))
));
r('POST', '/sections/:id/questions', (cfg) => wrap({ id: `q-${uid()}`, ...cfg.data }));
r('PUT', '/questions/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/questions/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/sections/:id/questions/reorder', () => wrap({ message: 'Reordered' }));

// Options
r('GET', '/questions/:id/options', () => wrap(
  Array.from({ length: num(2, 6) }, (_, i) => ({
    id: `opt-${uid()}`, question_id: 'q-001', label: pick(['Yes', 'No', 'Male', 'Female', 'Other', 'Primary', 'Secondary', 'Tertiary', 'None']),
    value: String.fromCharCode(97 + i), order: i + 1, created_at: pdate(30),
  }))
));
r('POST', '/questions/:id/options', (cfg) => wrap({ id: `opt-${uid()}`, ...cfg.data }));
r('PUT', '/options/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/options/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/questions/:id/options/reorder', () => wrap({ message: 'Reordered' }));

// Skip Logic
r('GET', '/questionnaires/:id/skip-logic', () => wrap([]));
r('POST', '/questionnaires/:id/skip-logic', () => wrap({ id: `sl-${uid()}` }));
r('PUT', '/skip-logic/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/skip-logic/:id', () => wrap({ message: 'Deleted' }));

// Translations
r('GET', '/questionnaires/:id/translations', () => wrap([]));
r('POST', '/questionnaires/:id/translations', () => wrap({ id: `tl-${uid()}` }));
r('PUT', '/translations/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/translations/:id', () => wrap({ message: 'Deleted' }));

// Validation Rules
r('GET', '/questions/:id/validation-rules', () => wrap([]));
r('POST', '/questions/:id/validation-rules', () => wrap({ id: `vr-${uid()}` }));
r('DELETE', '/validation-rules/:id', () => wrap({ message: 'Deleted' }));

// Assignments
r('GET', '/assignments', (cfg) => {
  const page = cfg.params?.page ? parseInt(cfg.params.page as string) : 1;
  return wrapPaginated(DEMO_ASSIGNMENTS, page);
});
r('GET', '/assignments/:id', (cfg, p) => wrap(DEMO_ASSIGNMENTS.find((a) => a.id === p.id) || DEMO_ASSIGNMENTS[0]));
r('POST', '/assignments', (cfg) => wrap({ ...DEMO_ASSIGNMENTS[0], id: `assign-new-${uid()}`, ...cfg.data }));
r('PUT', '/assignments/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/assignments/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/assignments/batch', () => wrap(DEMO_ASSIGNMENTS.slice(0, 3)));
r('POST', '/assignments/:id/approve', () => wrap({ message: 'Approved' }));
r('POST', '/assignments/:id/reject', () => wrap({ message: 'Rejected' }));
r('GET', '/assignments/:id/progress', (cfg, p) => wrap(DEMO_ASSIGNMENTS.find((a) => a.id === p.id) || DEMO_ASSIGNMENTS[0]));
r('GET', '/enumerator/:id/assignments', () => wrap(DEMO_ASSIGNMENTS.slice(0, 4)));
r('GET', '/enumerator/:id/load', () => wrap({ total: 15, in_progress: 6, completed: 9 }));

// Submissions
r('GET', '/submissions', (cfg) => {
  const page = cfg.params?.page ? parseInt(cfg.params.page as string) : 1;
  return wrapPaginated(DEMO_SUBMISSIONS, page);
});
r('GET', '/submissions/:id', (cfg, p) => wrap({
  ...DEMO_SUBMISSIONS.find((s) => s.id === p.id) || DEMO_SUBMISSIONS[0],
  answers: Array.from({ length: num(5, 12) }, (_, i) => ({
    question_id: `q-${uid()}`, question_label: `Question ${i + 1}`, question_type: 'text',
    value: pick(['Sample answer', '42', 'Yes', 'No', '3 years', 'Primary']),
  })),
  flagged_answers: [],
  audit: Array.from({ length: 3 }, () => ({
    action: pick(['created', 'updated', 'completed', 'approved']),
    user: `${pick(DEMO_USERS).first_name} ${pick(DEMO_USERS).last_name}`,
    created_at: pdate(num(0, 5)),
  })),
}));
r('POST', '/submissions', () => wrap({ id: `sub-new-${uid()}`, status: 'in_progress' }));
r('PUT', '/submissions/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/submissions/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/submissions/:id/answers', () => wrap({ message: 'Saved' }));
r('POST', '/submissions/:id/complete', () => wrap({ message: 'Completed' }));
r('POST', '/submissions/:id/approve', () => wrap({ message: 'Approved' }));
r('POST', '/submissions/:id/reject', () => wrap({ message: 'Rejected' }));
r('POST', '/submissions/:id/flag/:questionId', () => wrap({ message: 'Flagged' }));
r('GET', '/submissions/:id/quality', () => wrap({
  overall_score: num(65, 98), completeness: num(70, 100),
  consistency: num(60, 100), timeliness: num(80, 100),
  flags: [],
}));
r('GET', '/studies/:id/submissions/export', () => wrap({ message: 'Export queued' }));
r('GET', '/enumerator/:id/submissions', () => wrap(DEMO_SUBMISSIONS.slice(0, 5)));
r('GET', '/enumerator/:id/stats', () => wrap({
  total: 47, completed: 35, approval_rate: 0.85, avg_quality: 82, active_days: 12,
}));

// Media
r('POST', '/media/upload', () => wrap({ id: `media-${uid()}`, filename: 'photo.jpg', file_size: 1024000, mime_type: 'image/jpeg', url: '/media/photo.jpg', created_at: pdate(0) }));
r('GET', '/media/:id', () => wrap({ id: `media-${uid()}`, filename: 'photo.jpg', file_size: 1024000, mime_type: 'image/jpeg', url: '/media/photo.jpg', created_at: pdate(0) }));
r('DELETE', '/media/:id', () => wrap({ message: 'Deleted' }));
r('GET', '/submissions/:id/media', () => wrap([{ id: `media-${uid()}`, filename: 'photo.jpg', file_size: 1024000, mime_type: 'image/jpeg', url: '/media/photo.jpg', created_at: pdate(0) }]));

// Sync
r('POST', '/sync/pull', () => wrap({ assignments: DEMO_ASSIGNMENTS.slice(0, 3), submissions: [] }));
r('POST', '/sync/push', () => wrap({ accepted: 3, rejected: 0, conflicts: [] }));
r('GET', '/sync/status', () => wrap(DEMO_SUBMISSIONS.slice(0, 3).map((s) => ({ submission_id: s.id, status: s.status, last_synced_at: pdate(0) }))));
r('GET', '/sync/log', () => wrap(
  Array.from({ length: 8 }, () => ({
    id: `sync-${uid()}`, type: pick(['pull', 'push', 'full']),
    status: pick(['success', 'success', 'success', 'partial', 'failed']),
    records_processed: num(5, 50), records_failed: num(0, 3),
    started_at: pdate(num(0, 3)), completed_at: pdate(num(0, 1)),
  }))
));
r('POST', '/sync/full', () => wrap({ message: 'Full sync initiated' }));

// Dashboard
r('GET', '/dashboard/executive', () => wrap(DEMO_DASHBOARD_SUMMARY));
r('GET', '/dashboard/studies/:id', (cfg, p) => wrap({
  kpis: { total_submissions: 342, pending_review: 28, approved: 290, rejected: 24, enumerators_active: 6, completion_percentage: 67, quality_score: 82 },
  submission_trend: Array.from({ length: 14 }, (_, i) => ({ date: pdate(13 - i).substring(0, 10), count: num(10, 40) })),
  enumerator_progress: enumLoads.map((e) => ({ id: e.id, name: e.name, submissions: num(10, 50), approval_rate: parseFloat((0.7 + Math.random() * 0.25).toFixed(2)), quality_score: num(65, 95) })),
  indicator_achievement: DEMO_INDICATORS.slice(0, 5).map((ind) => ({ id: ind.id, name: ind.name, target: ind.target_value || 80, current: num(20, 90), percentage: num(25, 100), rag: pick(['on_track', 'at_risk', 'off_track', 'no_data']) })),
}));
r('GET', '/dashboard/indicators/:id', () => wrap(
  Array.from({ length: 12 }, (_, i) => ({ period: pdate(i * 30).substring(0, 7), value: parseFloat((Math.random() * 100).toFixed(1)), target: 80 }))
));
r('GET', '/dashboard/alerts', () => wrap(DEMO_ALERTS));
r('POST', '/dashboard/alerts/evaluate', () => wrap({ message: 'Alerts evaluated', new_alerts: 3 }));
r('POST', '/dashboard/widgets', () => wrap({ message: 'Layout saved' }));

// Reports
r('GET', '/reports', (cfg) => {
  const page = cfg.params?.page ? parseInt(cfg.params.page as string) : 1;
  return wrapPaginated(DEMO_REPORTS, page);
});
r('GET', '/reports/:id', (cfg, p) => wrap(DEMO_REPORTS.find((r) => r.id === p.id) || DEMO_REPORTS[0]));
r('POST', '/reports', (cfg) => wrap({ ...DEMO_REPORTS[0], id: 'rpt-new', ...cfg.data }));
r('PUT', '/reports/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/reports/:id', () => wrap({ message: 'Deleted' }));
r('POST', '/reports/:id/generate', () => wrap({ message: 'Report generation started' }));
r('POST', '/reports/:id/clone', () => wrap(DEMO_REPORTS[0]));

// Report Templates
r('GET', '/report-templates', () => wrap([
  { id: 'tmpl-001', name: 'Standard Report', description: 'Standard report template with summary, methodology, findings.', category: 'standard', created_at: pdate(60) },
  { id: 'tmpl-002', name: 'Executive Summary', description: 'Brief executive-level summary of key findings.', category: 'executive', created_at: pdate(50) },
  { id: 'tmpl-003', name: 'Technical Report', description: 'Detailed technical report with full methodology.', category: 'technical', created_at: pdate(40) },
]));
r('GET', '/report-templates/:id', (cfg, p) => wrap({ id: p.id, name: 'Standard Report', description: 'Standard report template', category: 'standard', config: {}, created_at: pdate(60) }));

// Report Schedule
r('POST', '/reports/:id/schedule', () => wrap({ id: `sched-${uid()}`, frequency: 'weekly', next_run_at: fdate(7) }));
r('PUT', '/reports/:id/schedule', () => wrap({ message: 'Updated' }));
r('DELETE', '/reports/:id/schedule', () => wrap({ message: 'Deleted' }));

// Audit Log
r('GET', '/audit-log', (cfg) => {
  const page = cfg.params?.page ? parseInt(cfg.params.page as string) : 1;
  return wrapPaginated(DEMO_ACTIVITIES, page, 25, 50);
});

// AI - Chat
r('POST', '/ai/chat', (cfg) => {
  const body = cfg.data as Record<string, unknown>;
  const sessionId = (body?.session_id as string) || `ais-${uid()}`;
  return wrap({
    session_id: sessionId,
    message: {
      id: `aim-${uid()}`,
      role: 'assistant',
      content: pick([
        'Based on the available data, I can help you analyze your study results. Key findings indicate a 23% improvement in the primary outcome since baseline.',
        'To design an effective survey, start with clear research questions. Consider using a mixed-methods approach combining quantitative questionnaires with qualitative interviews.',
        'For indicator selection, I recommend using SMART criteria: Specific, Measurable, Achievable, Relevant, and Time-bound. Your current framework covers most key areas.',
        'The data quality assessment shows 94.5% completeness with only minor inconsistencies in date fields. Overall quality score: 87/100.',
        'Here is an analysis of your submissions: 342 total, 290 approved (84.8%), 24 rejected (7.0%), 28 pending review. Average quality score: 82%.',
      ]),
      metadata: { confidence: parseFloat((0.85 + Math.random() * 0.14).toFixed(3)) },
      created_at: new Date().toISOString(),
    },
  });
});

// AI - Sessions
r('GET', '/ai/sessions', () => wrap(DEMO_AI_SESSIONS));
r('GET', '/ai/sessions/:id', (cfg, p) => wrap({
  ...DEMO_AI_SESSIONS[0],
  id: p.id,
  messages: DEMO_AI_MESSAGES,
}));
r('DELETE', '/ai/sessions/:id', () => wrap({ message: 'Deleted' }));

// AI - Agents
r('POST', '/ai/agents/research-design', () => wrap({ suggestion: 'Consider a cross-sectional design with mixed methods. Use stratified random sampling across geographic zones. Target sample: 1,200 households.', confidence: 0.91, explanation: 'Based on your study objectives and context.' }));
r('POST', '/ai/agents/survey-design', () => wrap({ suggestion: 'Use a structured questionnaire with skip logic. Include demographic section, core indicators module, and open-ended feedback.', confidence: 0.88, explanation: 'Standard approach for this study type.' }));
r('POST', '/ai/agents/indicator', () => wrap({ suggestion: 'Recommended indicators:\n1. Literacy rate (percentage)\n2. School enrollment ratio\n3. Grade completion rate\n4. Teacher-student ratio\n5. Learning outcome score', confidence: 0.85, explanation: 'Aligned with SDG 4 targets.' }));
r('POST', '/ai/agents/reporting', () => wrap({ suggestion: 'Structure your report with: Executive Summary, Methodology, Key Findings (with visualizations), Discussion, Conclusions, and Recommendations.', confidence: 0.93, explanation: 'Standard MERL reporting framework.' }));
r('POST', '/ai/agents/data-quality', () => wrap({ suggestion: 'Quality check results: Completeness 96%, Consistency 89%, Timeliness 92%. Flagged 3 outliers for review.', confidence: 0.90, explanation: 'Automated data quality assessment.' }));
r('POST', '/ai/agents/qualitative', () => wrap({ suggestion: 'Key themes identified: (1) Access barriers, (2) Quality of services, (3) Community participation, (4) Sustainability concerns.', confidence: 0.87, explanation: 'Thematic analysis of interview transcripts.' }));
r('POST', '/ai/agents/executive', () => wrap({ suggestion: 'Executive summary: The program has reached 78% of its target population with a 23% improvement in key outcomes. Recommend scaling the intervention to additional regions.', confidence: 0.92, explanation: 'Based on aggregate program data.' }));
r('POST', '/ai/agents/knowledge', () => wrap({ suggestion: 'Based on the knowledge base, similar programs in East Africa achieved an average 31% improvement in health outcomes over 24 months. Key success factors include community engagement and strong local partnerships.', confidence: 0.89, explanation: 'Retrieved from 3 relevant documents.' }));
r('POST', '/ai/agents/translation', () => wrap({ suggestion: 'Tafsiri ya Kiswahili: "Tafiti za awali zinaonyesha maboresho makubwa katika matokeo ya afya kwa jamii zinazoshiriki kikamilifu katika mpango."', confidence: 0.94, explanation: 'Direct translation with contextual accuracy.' }));

// AI - Assist
r('POST', '/ai/assist/improve-wording', () => wrap({ suggestion: 'Improved version: "What is the highest level of education you have completed?" This is clearer and more direct than the original wording.', confidence: 0.92, explanation: 'Simplified language for better comprehension.' }));
r('POST', '/ai/assist/suggest-indicators', () => wrap({ suggestion: '1. Access to improved water source (%)\n2. Water quality compliance rate (%)\n3. Average collection time (minutes)\n4. Household water treatment adoption (%)\n5. Seasonal water availability (months)', confidence: 0.87, explanation: 'Comprehensive WASH indicator set.' }));
r('POST', '/ai/assist/suggest-questions', () => wrap({ suggestion: '1. What is your primary source of drinking water?\n2. How long does it take to collect water (round trip)?\n3. Do you treat your drinking water?\n4. How much water does your household use per day?\n5. Have you experienced water shortages in the past month?', confidence: 0.85, explanation: 'Standard WASH survey questions.' }));
r('POST', '/ai/assist/generate-summary', () => wrap({ suggestion: 'Data summary: 342 submissions collected across 5 districts. 85% approval rate. Average completion time: 22 minutes. Key findings indicate improved access to services (74% positive response).', confidence: 0.95, explanation: 'Generated from submission aggregate data.' }));
r('POST', '/ai/assist/detect-anomalies', () => wrap({ suggestion: 'Anomalies detected: 1. Submission SUB-042 has unusually high values (Z-score 3.2). 2. Enumerator E007 submission time averages 3 min (too fast). 3. GPS coordinates for 5 submissions are outside study area.', confidence: 0.88, explanation: 'Statistical outlier detection + rule-based validation.' }));
r('POST', '/ai/assist/extract-themes', () => wrap({ suggestion: 'Emerging themes from qualitative data: Theme 1: "Community ownership" (mentioned 47 times). Theme 2: "Resource constraints" (mentioned 35 times). Theme 3: "Partnership value" (mentioned 28 times).', confidence: 0.83, explanation: 'NLP-based thematic extraction from open-ended responses.' }));

// AI - RAG
r('POST', '/ai/rag/search', () => wrap(
  Array.from({ length: 3 }, (_, i) => ({
    chunk_id: `chunk-${uid()}`,
    text: pick([
      'Baseline studies should establish pre-intervention measurements for all key indicators.',
      'Sampling strategies must account for population distribution and accessibility.',
      'Data quality assurance protocols include field checks, validation rules, and supervisor review.',
    ]),
    source: pick(['baseline_guide.pdf', 'sampling_framework.docx', 'data_quality_manual.pdf']),
    score: parseFloat((0.7 + Math.random() * 0.25).toFixed(3)),
    metadata: { page: num(5, 50) },
  }))
));
r('POST', '/ai/rag/ingest', () => wrap({ document_id: `rag-${uid()}`, status: 'processing' }));
r('GET', '/ai/rag/documents', () => wrap(DEMO_RAG_DOCUMENTS));
r('DELETE', '/ai/rag/documents/:id', () => wrap({ message: 'Deleted' }));

// AI - Prompts
r('GET', '/ai/prompts', () => wrap(
  Array.from({ length: 9 }, (_, i) => ({
    id: `prompt-${uid()}`,
    agent_id: ['knowledge', 'research_design', 'survey_design', 'indicator', 'reporting', 'data_quality', 'qualitative', 'executive', 'translation'][i],
    version: `1.${i}`,
    content: `You are an expert ${['knowledge', 'research design', 'survey design', 'indicator', 'reporting', 'data quality', 'qualitative analysis', 'executive', 'translation'][i]} specialist...`,
    model: pick(['gpt-4o', 'gpt-4o-mini']),
    is_active: i < 5,
    created_at: pdate(30),
    updated_at: pdate(5),
  }))
));
r('GET', '/ai/prompts/:id', (cfg, p) => wrap({
  id: p.id, agent_id: 'knowledge', version: '1.0',
  content: 'You are a knowledgeable MERL assistant...',
  model: 'gpt-4o', is_active: true,
  created_at: pdate(30), updated_at: pdate(5),
}));

// AI - Metrics
r('GET', '/ai/inferences', (cfg) => {
  const page = cfg.params?.page ? parseInt(cfg.params.page as string) : 1;
  return wrapPaginated(DEMO_AI_INFERENCES, page, 25, 30);
});
r('GET', '/ai/metrics', () => wrap(DEMO_METRICS));

// Admin / Users
r('GET', '/users', () => wrapPaginated(DEMO_USERS));
r('POST', '/users', (cfg) => wrap({ id: `user-${uid()}`, ...cfg.data }));
r('PUT', '/users/:id', () => wrap({ message: 'Updated' }));
r('DELETE', '/users/:id', () => wrap({ message: 'Deleted' }));

// Activity Log (under admin)
r('GET', '/activity-log', (cfg) => {
  const page = cfg.params?.page ? parseInt(cfg.params.page as string) : 1;
  return wrapPaginated(DEMO_ACTIVITIES, page, 25, 50);
});

export function mockAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  const method = (config.method || 'get').toUpperCase();
  let url = config.url || '';
  const base = config.baseURL || '';
  if (url.startsWith(base)) url = url.substring(base.length);
  if (!url.startsWith('/')) url = '/' + url;

  const matched = matchRoute(method, url);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (matched) {
        const result = matched.handler(config);
        resolve({
          data: result,
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          config,
        } as AxiosResponse);
      } else {
        reject({
          response: {
            data: { message: `Mock: No handler for ${method} ${url}`, status: 404 },
            status: 404,
          },
        });
      }
    }, 150 + Math.random() * 200);
  });
}
