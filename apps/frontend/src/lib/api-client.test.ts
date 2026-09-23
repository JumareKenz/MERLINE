import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard. Next's SWC compiler reads `api.get<import('@/types/x').T>(url)`
 * as a comparison involving a dynamic import rather than a generic call, and
 * compiles it into an expression that never sends the request — silently:
 * tsc is happy and the build succeeds. That shipped once and broke every
 * data screen except sign-in. Type arguments must use imported type names.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

describe('generic call type arguments', () => {
  it('never use inline import() types', () => {
    const offenders = sourceFiles(path.join(__dirname, '..'))
      .map((file) => {
        const code = readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');
        return /\w<\s*import\(/.test(code) ? path.relative(process.cwd(), file) : null;
      })
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });
});
