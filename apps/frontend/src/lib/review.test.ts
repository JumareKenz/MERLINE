import { describe, expect, it } from 'vitest';
import { STANDARD_CUES, confidenceBand, cuesAreBalanced, formatClock, insertCue, wordDiff } from './review';

describe('inserting a non-verbal cue', () => {
  it('adds spacing around the cue and puts the caret after it', () => {
    const r = insertCue('We cope somehow', 'pause', 2, 2);
    expect(r.text).toBe('We [pause] cope somehow');
    expect(r.text.slice(0, r.caret)).toBe('We [pause]');
  });

  it('works at the start, the end and over a selection', () => {
    expect(insertCue('yes', 'laughs', 0, 0).text).toBe('[laughs] yes');
    expect(insertCue('yes', 'laughs', 3, 3).text).toBe('yes [laughs]');
    expect(insertCue('a XXX b', 'inaudible', 2, 5).text).toBe('a [inaudible] b');
    expect(insertCue('yes.', 'pause', 3, 3).text).toBe('yes [pause].');
  });

  it('offers the standard cues', () => {
    expect([...STANDARD_CUES]).toEqual(['laughs', 'pause', 'crying', 'inaudible', 'background noise', 'overlapping speech']);
  });
});

describe('cue brackets', () => {
  it('accept tidy cues and refuse stray or nested brackets (as the server does)', () => {
    expect(cuesAreBalanced('a [pause] b [ crying ]')).toBe(true);
    for (const bad of ['a [pause', 'pause]', '[a [b]]', '][']) expect(cuesAreBalanced(bad)).toBe(false);
  });
});

describe('confidence', () => {
  it('bands segments so the doubtful ones can be checked first', () => {
    expect(confidenceBand(0.3)).toBe('low');
    expect(confidenceBand(0.6)).toBe('medium');
    expect(confidenceBand(0.9)).toBe('high');
    expect(confidenceBand(null)).toBe('unknown');
  });
});

describe('showing what a reviewer changed', () => {
  it('marks removed and added words and keeps the rest', () => {
    const d = wordDiff('Ruwan sha ya yi mana wuya', 'Ruwan sha ya yi mana wahala [pause]');
    expect(d.filter((x) => x.kind === 'removed').map((x) => x.text)).toEqual(['wuya']);
    expect(d.filter((x) => x.kind === 'added').map((x) => x.text.trim())).toEqual(expect.arrayContaining(['wahala', '[pause]']));
    expect(d.filter((x) => x.kind === 'same').map((x) => x.text).join('')).toContain('Ruwan sha ya yi mana');
  });

  it('is all "same" for identical text', () => {
    expect(wordDiff('a b', 'a b').every((x) => x.kind === 'same')).toBe(true);
  });

  it('reconstructs both versions from the diff', () => {
    const before = 'the borehole is broken';
    const after = 'the second borehole was broken again';
    const d = wordDiff(before, after);
    expect(d.filter((x) => x.kind !== 'added').map((x) => x.text).join('')).toBe(before);
    expect(d.filter((x) => x.kind !== 'removed').map((x) => x.text).join('')).toBe(after);
  });
});

it('formats a clock', () => {
  expect(formatClock(0)).toBe('0:00');
  expect(formatClock(95_000)).toBe('1:35');
  expect(formatClock(3_725_000)).toBe('1:02:05');
});
