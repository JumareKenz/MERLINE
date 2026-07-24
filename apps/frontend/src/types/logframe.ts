export type LogframeLevel = 'outcome' | 'output' | 'activity' | 'input';

export interface LogframeRowIndicator {
  id: string;
  indicatorId: string;
  baseline?: number;
  target?: number;
  actual?: number;
  indicator: {
    id: string;
    name: string;
    unit?: string;
    type: string;
  };
}

export interface LogframeRow {
  id: string;
  level: LogframeLevel;
  title: string;
  description?: string;
  meansOfVerification?: string;
  assumptions?: string;
  orderIndex: number;
  parentId?: string;
  children: LogframeRow[];
  indicators: LogframeRowIndicator[];
}

export interface Logframe {
  id: string;
  goal: string;
  goalNarrative?: string;
  projectId: string;
  outcomes: LogframeRow[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertLogframeDto {
  goal: string;
  goalNarrative?: string;
}

export interface CreateLogframeRowDto {
  level: LogframeLevel;
  title: string;
  description?: string;
  meansOfVerification?: string;
  assumptions?: string;
  parentId?: string;
}

export interface UpdateLogframeRowDto {
  title?: string;
  description?: string;
  meansOfVerification?: string;
  assumptions?: string;
}

export interface LinkIndicatorDto {
  indicatorId: string;
  baseline?: number;
  target?: number;
  actual?: number;
}
