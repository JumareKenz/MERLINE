/**
 * PHASE 0 — QUALITATIVE RESET
 *
 * Contract check for the ACTIVE API surface.
 *
 * The frontend declares every endpoint in `api-client.ts`. Nothing previously
 * verified that those endpoints exist on the server, and the mock adapter hid
 * the gap — which is how `/ai/assist/*`, `/auth/sessions` and `/teams/*` came
 * to be callable in the client with no backend route behind them.
 *
 * This test parses both sides statically (no DB, no bootstrap) and fails when
 * an ACTIVE client endpoint has no registered server route. Endpoints that are
 * already known to be missing are listed in KNOWN_MISSING so the suite is green
 * today but fails on any NEW drift. Shrink that list; never grow it.
 *
 * LEGACY client groups are excluded: their modules are deregistered on purpose.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ACTIVE_MODULE_DIRECTORIES } from './legacy-registry';

const SRC_ROOT = path.resolve(__dirname, '..', '..');
const API_CLIENT = path.resolve(
  SRC_ROOT,
  '..',
  '..',
  'frontend',
  'src',
  'lib',
  'api-client.ts',
);

/** Client groups whose backend modules are deregistered in Phase 0. */
const LEGACY_CLIENT_GROUPS = [
  'studies',
  'indicators',
  'questionnaires',
  'assignments',
  'submissions',
  'sync',
  'reports',
  'dashboard',
];

/**
 * Legacy endpoints nested inside an otherwise-active client group.
 *
 * `API.projects.logframe.*` sits under the active `projects` group but is
 * served by LogframesModule, which is deregistered. Group-level classification
 * alone would misreport these as drift.
 */
const LEGACY_CLIENT_PATH_FRAGMENTS = [
  '/logframe',
  // `API.media.submissionMedia` lives in the active `media` group but targets
  // `/submissions/:id/media`. Submissions are deregistered, and the route was
  // removed from MediaController in Phase 1; recordings replace it in Phase 2.
  '/submissions',
];

/**
 * Endpoints the client declares that the server has never implemented.
 * Each is a real defect, carried forward from before Phase 0 and scheduled in
 * LEGACY.md. This list is a ratchet: removing entries is progress, adding one
 * means new drift was introduced.
 */
const KNOWN_MISSING = [
  // Verified absent from the AI and workspaces controllers, which implement
  // the collection routes but not these item-level ones.
  'DELETE /ai/rag/documents/*',
  'GET /ai/prompts/*',
  'POST /workspaces/*/set-default',
  'GET /auth/sessions',
  'DELETE /auth/sessions/*',
  'GET /organizations/*/teams',
  'POST /organizations/*/teams',
  'GET /teams/*',
  'PUT /teams/*',
  'DELETE /teams/*',
  'POST /teams/*/members',
  'DELETE /teams/*/members/*',
  'POST /ai/assist/improve-wording',
  'POST /ai/assist/suggest-indicators',
  'POST /ai/assist/suggest-questions',
  'POST /ai/assist/generate-summary',
  'POST /ai/assist/detect-anomalies',
  'POST /ai/assist/extract-themes',
];

type Endpoint = { method: string; pattern: string };

/** `/projects/${id}/team` -> `/projects/*​/team` */
function normalise(rawPath: string): string {
  return (
    '/' +
    rawPath
      .replace(/\$\{[^}]*\}/g, '*')
      .replace(/:[A-Za-z0-9_]+/g, '*')
      .split('/')
      .filter(Boolean)
      .join('/')
  );
}

function readClientEndpoints(): {
  active: Endpoint[];
  skippedGroups: string[];
} {
  const source = fs.readFileSync(API_CLIENT, 'utf8');
  const lines = source.split('\n');

  const groupStart = /^ {2}([A-Za-z]+): \{/;
  const call =
    /apiClient\.(get|post|put|delete|patch)(?:<[^>]*>)?\(\s*(['"`])([^'"`]+)\2/;

  const active: Endpoint[] = [];
  const skippedGroups: string[] = [];
  let currentGroup = '';

  for (const line of lines) {
    const g = groupStart.exec(line);
    if (g) {
      currentGroup = g[1];
      if (LEGACY_CLIENT_GROUPS.includes(currentGroup))
        skippedGroups.push(currentGroup);
      continue;
    }
    if (LEGACY_CLIENT_GROUPS.includes(currentGroup)) continue;

    const m = call.exec(line);
    if (m) {
      const pattern = normalise(m[3]);
      if (LEGACY_CLIENT_PATH_FRAGMENTS.some((f) => pattern.includes(f)))
        continue;
      active.push({ method: m[1].toUpperCase(), pattern });
    }
  }

  return { active, skippedGroups };
}

function listControllers(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listControllers(full));
    else if (entry.name.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

function readServerRoutes(): Endpoint[] {
  const routes: Endpoint[] = [];

  for (const moduleDir of ACTIVE_MODULE_DIRECTORIES) {
    for (const file of listControllers(path.join(SRC_ROOT, moduleDir))) {
      const source = fs.readFileSync(file, 'utf8');

      const controller = /@Controller\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/.exec(
        source,
      );
      const prefix = controller?.[1] ?? '';

      const methodPattern =
        /@(Get|Post|Put|Delete|Patch)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
      let m: RegExpExecArray | null;
      while ((m = methodPattern.exec(source)) !== null) {
        const segment = m[2] ?? '';
        routes.push({
          method: m[1].toUpperCase(),
          pattern: normalise(`${prefix}/${segment}`),
        });
      }
    }
  }

  return routes;
}

function key(e: Endpoint): string {
  return `${e.method} ${e.pattern}`;
}

const clientFileExists = fs.existsSync(API_CLIENT);

// The backend is deployable on its own; skip rather than fail if the frontend
// workspace is not checked out alongside it.
const describeIfClient = clientFileExists ? describe : describe.skip;

describeIfClient('active API contract', () => {
  it('finds endpoints on both sides', () => {
    const { active } = readClientEndpoints();
    const server = readServerRoutes();

    expect(active.length).toBeGreaterThan(0);
    expect(server.length).toBeGreaterThan(0);
  });

  it('excludes the legacy client groups from the contract', () => {
    const { skippedGroups } = readClientEndpoints();

    // If a legacy group disappears from api-client.ts it has been deleted,
    // which is fine — but the list here should be updated to match.
    expect(skippedGroups.length).toBeGreaterThan(0);
  });

  it('has a server route for every active client endpoint', () => {
    const { active } = readClientEndpoints();
    const serverKeys = new Set(readServerRoutes().map(key));

    const missing = active
      .map(key)
      .filter((k) => !serverKeys.has(k))
      .filter((k) => !KNOWN_MISSING.includes(k));

    expect(Array.from(new Set(missing)).sort()).toEqual([]);
  });

  it('does not silently keep stale entries in the known-missing ratchet', () => {
    const { active } = readClientEndpoints();
    const serverKeys = new Set(readServerRoutes().map(key));
    const activeKeys = new Set(active.map(key));

    // An entry is stale once the endpoint is implemented, or once the client
    // stops declaring it. Either way the list should shrink.
    const stale = KNOWN_MISSING.filter(
      (k) => serverKeys.has(k) || !activeKeys.has(k),
    );

    expect(stale).toEqual([]);
  });
});
