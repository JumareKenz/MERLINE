/**
 * PHASE 0 — QUALITATIVE RESET
 *
 * Enforces the one-way boundary between the active (qualitative) application
 * and the frozen legacy (MERL) modules.
 *
 * Static analysis only: no database, no Nest bootstrap, no network. It walks
 * the TypeScript import graph from every active module and fails if any path,
 * however indirect, reaches a legacy directory.
 *
 * To verify this guard actually works, temporarily add
 *   import { StudiesService } from '../../studies/studies.service';
 * to any file under an active module and run this suite. It must fail.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  ACTIVE_MODULE_DIRECTORIES,
  LEGACY_MODULE_CLASS_NAMES,
  LEGACY_MODULE_DIRECTORIES,
} from './legacy-registry';

const SRC_ROOT = path.resolve(__dirname, '..', '..');

const IMPORT_PATTERN =
  /(?:import\s[^;]*?from\s*|import\s*\(\s*|require\s*\(\s*|export\s[^;]*?from\s*)['"](\.[^'"]*)['"]/g;

function listSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function extractRelativeImports(source: string): string[] {
  const specifiers: string[] = [];
  let match: RegExpExecArray | null;
  IMPORT_PATTERN.lastIndex = 0;
  while ((match = IMPORT_PATTERN.exec(source)) !== null) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveImport(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [`${base}.ts`, path.join(base, 'index.ts')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/** Top-level directory under `src/` that a file belongs to. */
function topLevelDirectory(file: string): string {
  const relative = path.relative(SRC_ROOT, file);
  return relative.split(path.sep)[0];
}

function isLegacy(file: string): boolean {
  return (LEGACY_MODULE_DIRECTORIES as readonly string[]).includes(
    topLevelDirectory(file),
  );
}

function relativeToSrc(file: string): string {
  return path.relative(SRC_ROOT, file).split(path.sep).join('/');
}

interface Violation {
  chain: string[];
}

/**
 * Breadth-first walk of the import graph starting at every non-spec file in the
 * active module directories. Returns the shortest import chain that reaches
 * legacy code, for each entry point that reaches it.
 */
function findLegacyReachableFrom(
  activeDirectories: readonly string[],
): Violation[] {
  const violations: Violation[] = [];
  const entryFiles = activeDirectories
    .flatMap((dir) => listSourceFiles(path.join(SRC_ROOT, dir)))
    .filter((file) => !file.endsWith('.spec.ts'));

  for (const entry of entryFiles) {
    const visited = new Set<string>([entry]);
    const queue: string[][] = [[entry]];

    while (queue.length > 0) {
      const chain = queue.shift() as string[];
      const current = chain[chain.length - 1];

      let contents: string;
      try {
        contents = fs.readFileSync(current, 'utf8');
      } catch {
        continue;
      }

      for (const specifier of extractRelativeImports(contents)) {
        const resolved = resolveImport(current, specifier);
        if (!resolved || visited.has(resolved)) continue;

        if (isLegacy(resolved)) {
          violations.push({ chain: [...chain, resolved].map(relativeToSrc) });
          queue.length = 0;
          break;
        }

        visited.add(resolved);
        queue.push([...chain, resolved]);
      }
    }
  }

  return violations;
}

describe('legacy boundary', () => {
  it('has a registry that matches the directories on disk', () => {
    for (const dir of [
      ...LEGACY_MODULE_DIRECTORIES,
      ...ACTIVE_MODULE_DIRECTORIES,
    ]) {
      expect({ dir, exists: fs.existsSync(path.join(SRC_ROOT, dir)) }).toEqual({
        dir,
        exists: true,
      });
    }
  });

  it('classifies every module directory as either active, legacy, or shared', () => {
    const known = new Set<string>([
      ...LEGACY_MODULE_DIRECTORIES,
      ...ACTIVE_MODULE_DIRECTORIES,
      'common',
      'config',
      'database',
    ]);

    const onDisk = fs
      .readdirSync(SRC_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const unclassified = onDisk.filter((dir) => !known.has(dir));

    // A new top-level module must be deliberately classified before it ships.
    expect(unclassified).toEqual([]);
  });

  it('does not allow active modules to import legacy modules, directly or transitively', () => {
    const violations = findLegacyReachableFrom(ACTIVE_MODULE_DIRECTORIES);

    const readable = violations.map((v) => v.chain.join('\n    -> '));
    expect(readable).toEqual([]);
  });

  it('does not allow shared foundations to import legacy modules', () => {
    // If `common/` reached legacy code, every active module would inherit the
    // dependency transitively and the boundary would be meaningless.
    const violations = findLegacyReachableFrom([
      'common',
      'config',
      'database',
    ]);

    const readable = violations.map((v) => v.chain.join('\n    -> '));
    expect(readable).toEqual([]);
  });

  it('does not register any legacy module in app.module.ts', () => {
    const appModule = fs.readFileSync(
      path.join(SRC_ROOT, 'app.module.ts'),
      'utf8',
    );

    const registered = LEGACY_MODULE_CLASS_NAMES.filter((name) =>
      new RegExp(`\\b${name}\\b`).test(appModule),
    );

    // Catches an accidental re-registration during a merge.
    expect(registered).toEqual([]);
  });

  it('does not import from a legacy directory in app.module.ts', () => {
    const appModule = fs.readFileSync(
      path.join(SRC_ROOT, 'app.module.ts'),
      'utf8',
    );

    const legacyImports = extractRelativeImports(appModule).filter(
      (specifier) =>
        (LEGACY_MODULE_DIRECTORIES as readonly string[]).some((dir) =>
          specifier.startsWith(`./${dir}/`),
        ),
    );

    expect(legacyImports).toEqual([]);
  });

  it('detects a violation when one is introduced (guard rail self-test)', () => {
    // Proves the walker actually reports violations rather than silently
    // passing. Uses the real graph: legacy modules DO import shared code, so
    // walking from a legacy directory toward legacy code must find something.
    const violations = findLegacyReachableFrom(['studies']);
    expect(violations.length).toBeGreaterThan(0);
  });
});
