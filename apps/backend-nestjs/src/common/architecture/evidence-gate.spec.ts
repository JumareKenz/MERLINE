import * as fs from 'fs';
import * as path from 'path';

/**
 * Only approved transcripts are evidence. Any code that reads transcript
 * text for analysis (reports, findings, dialogue, insights) must go
 * through EVIDENCE_TRANSCRIPT_WHERE or isEvidence(). This test fails when
 * a new analysis path reads transcripts without doing so, so the gate
 * cannot be bypassed by accident.
 */
const SRC = path.resolve(__dirname, '../..');
const ANALYSIS_PATHS = [
  'analysis',
  'findings',
  'ai',
  'transcripts/transcript-dialogue.service.ts',
];
const READS =
  /\b(?:transcript|transcriptSegment)\.(?:findFirst|findMany|findUnique)\b/;
const GATED = /EVIDENCE_TRANSCRIPT_WHERE|isEvidence\(|NOT_EVIDENCE_MESSAGE/;

function files(target: string): string[] {
  const full = path.join(SRC, target);
  if (fs.statSync(full).isFile()) return [full];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(target, e.name))
        : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')
          ? [path.join(full, e.name)]
          : [],
    );
}

describe('evidence gate', () => {
  it('is applied wherever analysis code reads transcripts', () => {
    const ungated = ANALYSIS_PATHS.flatMap(files)
      .filter((f) => READS.test(fs.readFileSync(f, 'utf8')))
      .filter((f) => !GATED.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f));
    expect(ungated).toEqual([]);
  });

  it('is actually in force in the paths that read transcripts today', () => {
    const readers = ANALYSIS_PATHS.flatMap(files)
      .filter((f) => READS.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f))
      .sort();
    expect(readers).toEqual(
      expect.arrayContaining([
        'analysis/analysis-pipeline.service.ts',
        'analysis/analysis-reports.service.ts',
        'findings/findings.service.ts',
        'transcripts/transcript-dialogue.service.ts',
      ]),
    );
  });
});
