import { BadRequestException } from '@nestjs/common';

/** Cues the review screens offer as one-tap inserts. Free-form cues are allowed too. */
export const STANDARD_CUES = [
  'laughs',
  'pause',
  'crying',
  'inaudible',
  'background noise',
  'overlapping speech',
] as const;

const CUE = /\[\s*([^[\]]{1,60}?)\s*\]/g;

/**
 * Cues are bracketed words inside the segment text: "[pause]". Spacing
 * inside the brackets is tidied ("[ crying ]" → "[crying]"). Unbalanced
 * or nested brackets are refused so cues stay machine-readable — analysis
 * treats them as annotations, never as things the participant said.
 */
export function normalizeCues(text: string): string {
  const tidied = text.replace(CUE, (_m, inner: string) => `[${inner.trim()}]`);
  const stripped = tidied.replace(/\[[^[\]]{1,60}\]/g, '');
  if (/[[\]]/.test(stripped)) {
    throw new BadRequestException(
      'Square brackets mark non-verbal cues such as [pause] or [inaudible]. Close every bracket, and do not nest them.',
    );
  }
  return tidied;
}

export function extractCues(text: string): string[] {
  return [...text.matchAll(CUE)].map((m) => m[1].trim());
}

/** The words spoken, with cues removed: what a quotation may quote. */
export function spokenText(text: string): string {
  return text.replace(CUE, ' ').replace(/\s+/g, ' ').trim();
}
