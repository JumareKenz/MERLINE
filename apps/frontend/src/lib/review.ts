/** Non-verbal cues offered as one-tap inserts while reviewing a transcript. */
export const STANDARD_CUES = ['laughs', 'pause', 'crying', 'inaudible', 'background noise', 'overlapping speech'] as const;

/** Inserts "[cue]" at the caret (or replaces the selection), with sensible spacing. */
export function insertCue(text: string, cue: string, start: number, end: number): { text: string; caret: number } {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = before && !/\s$/.test(before) ? ' ' : '';
  const trail = after && !/^[\s.,;:!?]/.test(after) ? ' ' : '';
  const mark = `${lead}[${cue}]${trail}`;
  return { text: before + mark + after, caret: before.length + mark.length - trail.length };
}

/** Square brackets must pair up and not nest: the same rule the server enforces. */
export function cuesAreBalanced(text: string): boolean {
  const stripped = text.replace(/\[\s*[^[\]]{1,60}?\s*\]/g, '');
  return !/[[\]]/.test(stripped);
}

/** Confidence bands used to prioritise passages for a listen. */
export function confidenceBand(c: number | null | undefined): 'low' | 'medium' | 'high' | 'unknown' {
  if (c == null) return 'unknown';
  if (c < 0.5) return 'low';
  if (c < 0.75) return 'medium';
  return 'high';
}

/** Word-level difference between two texts, for showing what a reviewer changed. */
export function wordDiff(before: string, after: string): { text: string; kind: 'same' | 'removed' | 'added' }[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { text: string; kind: 'same' | 'removed' | 'added' }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ text: a[i], kind: 'same' });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ text: a[i++], kind: 'removed' });
    else out.push({ text: b[j++], kind: 'added' });
  }
  while (i < a.length) out.push({ text: a[i++], kind: 'removed' });
  while (j < b.length) out.push({ text: b[j++], kind: 'added' });
  return out;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
