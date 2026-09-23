import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { API, FIXTURE_PATH } from './global-setup';

interface Fixture {
  orgId: string;
  adminEmail: string;
  fieldUserId: string;
  code: string;
  participantId: string;
  interviewId: string;
  otherInterviewId: string;
}

const fx = (): Fixture => JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
const SHOTS = path.join(__dirname, 'screenshots');
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** Serious and critical WCAG A/AA violations on the current page. */
async function axe(page: Page) {
  await page.addScriptTag({ content: AXE });
  const result = await page.evaluate(async () => {
    // @ts-expect-error injected
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return r.violations
      .filter((v: { impact: string }) => v.impact === 'serious' || v.impact === 'critical')
      .map((v: { id: string; impact: string; nodes: { target: string[] }[] }) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  });
  return result as string[];
}

async function apiLogin(body: object, path = '/auth/login') {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = (await res.json()) as { data: { token: { accessToken: string } } };
  return json.data.token.accessToken;
}

async function apiCall(token: string, method: string, url: string, body?: unknown) {
  return fetch(`${API}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function adminLogin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(fx().adminEmail);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD as string);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/projects');
}

async function fieldLogin(page: Page) {
  const { code } = fx();
  await page.goto('/field-login');
  await page.getByLabel('Access code, first 5 characters').fill(code.replace('-', '').slice(0, 5));
  await page.getByLabel('Access code, last 5 characters').fill(code.replace('-', '').slice(5));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/field');
}

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test.describe('static assets and routing', () => {
  test('brand, PWA and offline assets load unauthenticated, protected pages redirect', async ({ request }) => {
    for (const asset of [
      '/manifest.json',
      '/field.webmanifest',
      '/sw.js',
      '/favicon.ico',
      '/icons/favicon-32.png',
      '/icons/apple-touch-icon.png',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/icon-maskable-192.png',
      '/icons/icon-maskable-512.png',
      '/icons/field-icon-512.png',
      '/splash/launch-1170x2532.png',
      '/brand/mark-64.png',
      '/brand/mark-dark-128.png',
      '/offline.html',
    ]) {
      const res = await request.get(asset, { maxRedirects: 0 });
      expect(res.status(), asset).toBe(200);
    }
    const manifest = await (await request.get('/field.webmanifest')).json();
    expect(manifest.name).toBe('Merline Field');
    for (const protectedPath of ['/projects', '/field', '/field/interview']) {
      const res = await request.get(protectedPath, { maxRedirects: 0 });
      expect(res.status(), protectedPath).toBe(307);
      expect(res.headers().location).toContain('/login');
    }
  });
});

test.describe('admin workspace', () => {
  test('sign-in, focused navigation, logo, accessibility and responsive layout', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login');
    expect(await axe(page), 'admin login a11y').toEqual([]);
    await page.screenshot({ path: `${SHOTS}/admin-login-desktop.png` });
    await page.setViewportSize(VIEWPORTS.phone);
    await page.screenshot({ path: `${SHOTS}/admin-login-phone.png`, fullPage: true });
    await page.setViewportSize(VIEWPORTS.desktop);

    await adminLogin(page);
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('link')).toHaveText(['Projects', 'Assignments', 'Results', 'Transcripts', 'Reports', 'AI Dialogue']);
    await expect(page.getByRole('link', { name: /Guides|Questionnaires|Organizations|Workspaces|Indicators/ })).toHaveCount(0);

    const logo = page.locator('aside img').first();
    await expect(logo).toHaveAttribute('src', /\/brand\/mark-64\.png/);
    expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
    expect(await axe(page), 'projects a11y').toEqual([]);
    await page.screenshot({ path: `${SHOTS}/admin-projects-desktop.png`, fullPage: true });

    await page.goto('/assignments');
    await expect(page.getByRole('heading', { name: 'Assignments', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /^P-/ }).first()).toBeVisible();
    expect(await axe(page), 'assignments a11y').toEqual([]);
    await page.screenshot({ path: `${SHOTS}/admin-assignments-desktop.png`, fullPage: true });

    await page.goto(`/interviews/${fx().interviewId}`);
    await expect(page.getByRole('heading', { name: 'Consent' })).toBeVisible();
    expect(await axe(page), 'interview detail a11y').toEqual([]);
    await page.screenshot({ path: `${SHOTS}/admin-interview-desktop.png`, fullPage: true });

    await page.goto('/admin/settings');
    await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible();
    await expect(page.getByText(/two-factor/i)).toHaveCount(0);

    await page.goto('/ai');
    await expect(page.getByRole('heading', { name: 'AI Dialogue', level: 1 })).toBeVisible();

    for (const [name, size] of [['tablet', VIEWPORTS.tablet], ['phone', VIEWPORTS.phone]] as const) {
      await page.setViewportSize(size);
      await page.goto('/projects');
      await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${name} horizontal overflow`).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${SHOTS}/admin-projects-${name}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Assignments' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/admin-nav-drawer-phone.png` });

    // "Failed to fetch RSC payload" is Next aborting its own link prefetches
    // when this test navigates away mid-flight (verified: left to settle,
    // every prefetch returns 200 and nothing is logged). Anything else fails.
    expect(errors.filter((e) => !/favicon|Failed to load resource.*40[134]|Failed to fetch RSC payload/.test(e))).toEqual([]);
  });
});

test.describe('field app', () => {
  test.use({ viewport: VIEWPORTS.phone, hasTouch: true, isMobile: true });

  test('own sign-in and shell, no admin navigation, only assigned work', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/field-login');
    await expect(page.getByRole('heading', { name: /Record today/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Projects|Reports|Settings/ })).toHaveCount(0);
    expect(await axe(page), 'field login a11y').toEqual([]);
    await page.screenshot({ path: `${SHOTS}/field-login-phone.png`, fullPage: true });

    await fieldLogin(page);
    const { interviewId, otherInterviewId } = fx();
    await expect(page.getByRole('navigation', { name: 'Field app' }).getByRole('link')).toHaveText(['Today', 'People', 'Uploads']);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Projects|Assignments|Transcripts|AI Dialogue|Settings/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Prepare interview' })).toHaveAttribute('href', `/field/interview?id=${interviewId}`);
    await expect(page.getByText('Not for the field worker')).toHaveCount(0);
    expect(await axe(page), 'field today a11y').toEqual([]);
    await page.screenshot({ path: `${SHOTS}/field-today-phone.png`, fullPage: true });

    // The admin workspace is not for this user: the UI sends them back.
    await page.goto('/projects');
    await page.waitForURL('**/field');

    await page.goto(`/field/interview?id=${interviewId}`);
    await expect(page.getByText('Recording is consented')).toBeVisible();
    expect(await axe(page), 'field interview a11y').toEqual([]);
    await page.screenshot({ path: `${SHOTS}/field-interview-phone.png`, fullPage: true });

    await page.goto(`/field/interview?id=${otherInterviewId}`);
    await expect(page.getByRole('heading', { name: 'Interview not available' })).toBeVisible();

    await page.goto('/field/participants');
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/field-people-phone.png`, fullPage: true });

    // Same prefetch-abort exclusion as the admin test (see there).
    expect(errors.filter((e) => !/Failed to load resource.*40[134]|Failed to fetch RSC payload/.test(e))).toEqual([]);
  });

  test('the API, not the UI, confines a field interviewer', async () => {
    const { code, orgId, interviewId, otherInterviewId } = fx();
    const token = await apiLogin({ code }, '/auth/field-login');

    const list = (await (await apiCall(token, 'GET', '/interviews')).json()) as { data: { id: string }[] };
    const ids = list.data.map((i) => i.id);
    expect(ids).toContain(interviewId);
    expect(ids).not.toContain(otherInterviewId);
    expect((await apiCall(token, 'GET', `/interviews/${otherInterviewId}`)).status).toBe(404);

    expect((await apiCall(token, 'GET', `/organizations/${orgId}/members`)).status).toBe(403);
    expect((await apiCall(token, 'GET', '/organizations')).status).toBe(200);
    const orgs = (await (await apiCall(token, 'GET', '/organizations')).json()) as { data: unknown[] };
    expect(orgs.data).toHaveLength(1);
    expect((await apiCall(token, 'PUT', `/organizations/${orgId}`, { name: 'x' })).status).toBe(403);
    expect((await apiCall(token, 'POST', '/roles', { name: 'Mine', slug: 'mine' })).status).toBe(403);
    const roles = await apiCall(token, 'GET', `/organizations/${orgId}/roles`);
    expect(roles.status).toBe(403);
    expect((await apiCall(token, 'GET', '/transcripts')).status).toBe(403);
    expect((await apiCall(token, 'GET', '/findings')).status).toBe(403);
  });

  test('records offline, keeps audio on the device, uploads in small parts when back online', async ({ page, context }) => {
    const { interviewId } = fx();
    await context.grantPermissions(['microphone']);
    await fieldLogin(page);
    const parts: number[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/recordings/uploads/') && req.url().includes('/parts/')) parts.push(req.postDataBuffer()?.length ?? 0);
    });

    await page.goto(`/field/interview?id=${interviewId}`);
    await page.getByRole('button', { name: 'Start recording' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Recording' }).first()).toBeVisible();
    await page.waitForTimeout(6_000);

    await context.setOffline(true);
    await expect(page.getByRole('link', { name: /Sync status: Offline/ })).toBeVisible();
    await page.waitForTimeout(5_000);
    await page.screenshot({ path: `${SHOTS}/field-recording-offline-phone.png`, fullPage: true });
    await page.getByRole('button', { name: 'Stop and save recording' }).click();
    await expect(page.getByText('Saved on this phone')).toBeVisible();
    await expect(page.getByRole('link', { name: /Sync status: Offline · 1 saved on this device/ })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/field-saved-offline-phone.png`, fullPage: true });

    await context.setOffline(false);
    await expect(page.getByRole('link', { name: /Sync status: All recordings uploaded/ })).toBeVisible({ timeout: 45_000 });
    expect(parts.length).toBeGreaterThanOrEqual(1);

    const admin = await apiLogin({ email: fx().adminEmail, password: process.env.E2E_ADMIN_PASSWORD });
    const recs = (await (await apiCall(admin, 'GET', `/interviews/${interviewId}/recordings`)).json()) as {
      data: { size: number; mimeType: string; checksum: string; metadata: { source?: string; durationMs?: number } }[];
    };
    const rec = recs.data.find((r) => r.metadata?.source === 'field-recorder');
    expect(rec, 'server has the field recording').toBeTruthy();
    expect(rec!.mimeType).toMatch(/^audio\//);
    expect(rec!.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(rec!.metadata.durationMs).toBeGreaterThan(9_000);
    // ~11 s at 24 kbps is ~35 KB; browser defaults would be several times that.
    expect(rec!.size).toBeLessThan(120 * 1024);
    console.log(`uploaded ${rec!.size} bytes for ${rec!.metadata.durationMs} ms in ${parts.length} part(s)`);

    await page.goto('/field/uploads');
    await expect(page.getByText(/Uploaded /).first()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/field-uploads-phone.png`, fullPage: true });
  });

  test('opens an assigned interview with no connection (service worker + device snapshot)', async ({ page, context }) => {
    const { interviewId } = fx();
    await fieldLogin(page);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    // Wait for the warm-up to have cached the interview screen and its code.
    await expect
      .poll(() => page.evaluate(() => caches.match('/field/interview').then((r) => !!r)), { timeout: 30_000 })
      .toBe(true);
    await page.reload(); // now controlled by the service worker
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);
    await page.goto(`/field/interview?id=${interviewId}`);
    await expect(page.getByText('Recording is consented')).toBeVisible();
    await expect(page.getByText(/Offline\. Details are from your last connection/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start recording' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/field-interview-offline-reload-phone.png`, fullPage: true });
    await context.setOffline(false);
  });
});

test.describe('service worker boundaries', () => {
  test('never intercepts cross-origin API requests', async () => {
    const sw = readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
    expect(sw).toContain("if (url.origin !== self.location.origin) return;");
    expect(sw).toContain("if (request.method !== 'GET') return;");
  });
});

