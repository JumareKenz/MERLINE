import { writeFileSync } from 'fs';
import path from 'path';

export const API = process.env.E2E_API_URL ?? 'http://localhost:4100/api/v1';
export const FIXTURE_PATH = path.join(__dirname, '.fixture.json');

async function call<T>(method: string, url: string, token?: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${JSON.stringify(json)}`);
  return json.data as T;
}

export default async function globalSetup() {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@merline.org';
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!password) throw new Error('Set E2E_ADMIN_PASSWORD for the seeded administrator');

  const login = await call<{ token: { accessToken: string } }>('POST', '/auth/login', undefined, { email, password });
  const admin = login.token.accessToken;
  const me = await call<{ id: string; organization: { id: string } }>('GET', '/auth/me', admin);
  const orgId = me.organization.id;

  // The project the field worker is assigned to (seeded demo project).
  const projects = await call<{ items: { id: string; name: string }[] }>('GET', '/projects?limit=100', admin);
  const project = projects.items[0];
  if (!project) throw new Error('No project to assign — run the seed');

  // An approved interview guide for this project's interview type, so the
  // field app shows questions (KII unless the project already has a method).
  const full = await call<{ settings?: { method?: string } }>('GET', `/projects/${project.id}`, admin);
  const method = full.settings?.method ?? 'KII';
  if (!full.settings?.method) {
    await call('PUT', `/projects/${project.id}`, admin, { settings: { ...(full.settings ?? {}), method } });
  }
  // Reuse the test guide across runs rather than approving a new one each time.
  const existing = (await call<{ id: string; title: string; status: string; projectId: string | null }[]>('GET', `/guides?projectId=${project.id}`, admin)).find(
    (g) => g.title === 'E2E field guide' && g.status === 'APPROVED' && g.projectId === project.id,
  );
  const guide = existing ?? await call<{ id: string }>('POST', '/guides', admin, {
    title: 'E2E field guide',
    interviewType: method,
    languages: ['en', 'ha'],
    projectId: project.id,
    questions: [
      { text: { en: 'What is your role in the community?', ha: 'Mene ne matsayinka a cikin al\u2019umma?' }, type: 'OPEN', probes: { en: 'Ask how long.' }, required: true },
      { text: { en: 'Main source of drinking water?' }, type: 'SINGLE', options: [{ en: 'Borehole' }, { en: 'River' }] },
    ],
  });
  if (!existing) await call('POST', `/guides/${guide.id}/approve`, admin);

  const stamp = Date.now().toString(36);
  // How an admin adds a field worker now: one step, projects + code.
  const worker = await call<{ id: string; code: string }>('POST', '/field-team', admin, {
    firstName: 'Amina',
    lastName: 'Okafor',
    phone: '+234 800 000 0000',
    projectIds: [project.id],
  });
  const fieldUserId = worker.id;
  const code = worker.code;

  const participant = await call<{ id: string }>('POST', '/participants', admin, { displayName: `P-${stamp.toUpperCase()}` });
  const consent = await call<{ id: string }>('POST', '/consents', admin, {
    participantId: participant.id,
    version: 'v2.1-en',
    method: 'VERBAL',
    allowRecording: true,
    allowTranscription: true,
    allowAiAnalysis: false,
    allowQuotation: true,
    allowPublication: false,
  });
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  tomorrow.setHours(10, 0, 0, 0);
  const assigned = await call<{ id: string }>('POST', '/interviews', admin, {
    participantId: participant.id,
    consentId: consent.id,
    interviewerId: fieldUserId,
    location: 'Ward 4 health post',
    scheduledAt: tomorrow.toISOString(),
    notes: 'Focus on travel time to the clinic and waiting times.',
  });
  // An interview for someone else: the field worker must never see it.
  const other = await call<{ id: string }>('POST', '/interviews', admin, {
    participantId: participant.id,
    consentId: consent.id,
    location: 'Not for the field worker',
  });

  writeFileSync(
    FIXTURE_PATH,
    JSON.stringify(
      { orgId, adminEmail: email, fieldUserId, code, projectId: project.id, projectName: project.name, participantId: participant.id, interviewId: assigned.id, otherInterviewId: other.id },
      null,
      2,
    ),
  );
}
