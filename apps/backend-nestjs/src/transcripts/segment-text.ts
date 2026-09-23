/**
 * The text of a segment as the research team should read and quote it: the
 * human correction when there is one, otherwise the machine transcript.
 * The machine text is never overwritten, so the original stays available.
 */
export function segmentText(segment: {
  text: string;
  editedText?: string | null;
}): string {
  return segment.editedText ?? segment.text;
}

/**
 * Finds `excerpt` in `text` and returns the matching slice *of `text`*, or
 * null. Exact first; failing that, ignoring case, punctuation and spacing
 * (models often re-case or re-punctuate a quote). Either way the returned
 * string is copied from the transcript, so what is stored is verbatim.
 */
export function locateExcerpt(text: string, excerpt: string): string | null {
  if (!excerpt) return null;
  if (text.includes(excerpt)) return excerpt;

  // Normalised copy of `text`, remembering where each kept char came from.
  const kept: number[] = [];
  let norm = '';
  let lastSpace = true;
  for (let i = 0; i < text.length; i++) {
    const c = text[i].toLowerCase();
    if (/[\p{L}\p{N}]/u.test(c)) {
      norm += c;
      kept.push(i);
      lastSpace = false;
    } else if (!lastSpace) {
      norm += ' ';
      kept.push(i);
      lastSpace = true;
    }
  }
  const needle = excerpt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (needle.length < 3) return null;
  const at = norm.indexOf(needle);
  if (at < 0) return null;
  return text.slice(kept[at], kept[at + needle.length - 1] + 1);
}
