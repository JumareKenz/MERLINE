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

  const roles = await call<{ id: string; slug: string }[]>('GET', `/organizations/${orgId}/roles`, admin);
  const fieldRole = roles.find((r) => r.slug === 'field-interviewer');
  if (!fieldRole) throw new Error('field-interviewer role missing — run the seed');

  const stamp = Date.now().toString(36);
  const created = await call<{ user: { id: string } }>('POST', `/organizations/${orgId}/members`, admin, {
    email: `field-${stamp}@e2e.test`,
    firstName: 'Amina',
    lastName: 'Okafor',
    roleId: fieldRole.id,
  });
  const fieldUserId = created.user.id;
  const { code } = await call<{ code: string }>('POST', `/users/${fieldUserId}/field-access-code`, admin);

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
    JSON.stringify({ orgId, adminEmail: email, fieldUserId, code, participantId: participant.id, interviewId: assigned.id, otherInterviewId: other.id }, null, 2),
  );
}
