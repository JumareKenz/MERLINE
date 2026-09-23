/**
 * A project as the live API returns it (camelCase; `settings` is free-form
 * JSON). The older `Project` type in ./project.ts describes the frozen MERL
 * shape and is kept only for legacy screens.
 */
export type ResearchMethod = 'KII' | 'FGD' | 'IDI' | 'OTHER';

export const RESEARCH_METHODS: { value: ResearchMethod; label: string; hint: string }[] = [
  { value: 'KII', label: 'Key informant interviews', hint: 'One expert or stakeholder at a time' },
  { value: 'FGD', label: 'Focus group discussions', hint: 'A facilitated group conversation' },
  { value: 'IDI', label: 'In-depth interviews', hint: 'Long-form one-to-one interviews' },
  { value: 'OTHER', label: 'Other qualitative method', hint: 'Describe it in the project summary' },
];

export interface ResearchProjectSettings {
  method?: ResearchMethod;
  [key: string]: unknown;
}

export interface ResearchProject {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  settings: ResearchProjectSettings;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count?: { participants: number; interviews: number; findings: number };
}

export interface ResearchProjectPage {
  items: ResearchProject[];
  total: number;
  page: number;
  limit: number;
}

export interface ResearchProjectInput {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  settings?: ResearchProjectSettings;
}

export function methodLabel(method?: string): string | undefined {
  return RESEARCH_METHODS.find((m) => m.value === method)?.label;
}
