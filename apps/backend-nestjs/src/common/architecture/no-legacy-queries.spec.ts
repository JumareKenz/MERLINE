/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Active modules must not query legacy tables.
 *
 * Deregistering a module removes its providers and routes, but it does not
 * stop other code from reaching its tables: `schema.prisma` is deliberately
 * untouched, so the whole Prisma client is still generated. That left a class
 * of coupling the import-boundary test cannot see — `projects.getStats`
 * counting studies, `media` serving `/submissions/:id/media`, and the AI
 * agents reading indicator and study counts.
 *
 * Those are now removed. This keeps them removed.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ACTIVE_MODULE_DIRECTORIES } from './legacy-registry';

const SRC_ROOT = path.resolve(__dirname, '..', '..');

/** Prisma delegates owned by deregistered modules. */
const LEGACY_DELEGATES = [
  'study',
  'studyTeam',
  'indicator',
  'indicatorValue',
  'indicatorTarget',
  'questionnaire',
  'section',
  'question',
  'questionOption',
  'skipLogic',
  'questionValidation',
  'questionTranslation',
  'submission',
  'assignment',
  'logframe',
  'logframeRow',
  'logframeRowIndicator',
  'syncLog',
  'syncBatch',
  'report',
  'reportTemplate',
  'reportSchedule',
  'dashboardWidget',
  'dashboardAlert',
  'dashboardAlertLog',
  'userDashboardPreference',
];

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

describe('no legacy table access from active modules', () => {
  it('finds no prisma.<legacyDelegate> call in any active module', () => {
    const violations: string[] = [];

    for (const moduleDir of ACTIVE_MODULE_DIRECTORIES) {
      for (const file of sourceFiles(path.join(SRC_ROOT, moduleDir))) {
        const contents = fs.readFileSync(file, 'utf8');
        for (const delegate of LEGACY_DELEGATES) {
          const pattern = new RegExp(`prisma\.${delegate}\b`);
          if (pattern.test(contents)) {
            violations.push(
              `${path.relative(SRC_ROOT, file).split(path.sep).join('/')} -> prisma.${delegate}`,
            );
          }
        }
      }
    }

    expect(violations.sort()).toEqual([]);
  });
});
