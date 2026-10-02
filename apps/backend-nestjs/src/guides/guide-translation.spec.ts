import { parseTranslation, questionsNeedingHausa } from './guide-translation';

const q = (id: string, en: string, ha?: string, probes = '') => ({
  id,
  text: (ha ? { en, ha } : { en }) as Record<string, string>,
  probes: (probes ? { en: probes } : {}) as Record<string, string>,
});

describe('guide translation helpers', () => {
  it('asks only for questions that have English and no Hausa yet', () => {
    const asked = questionsNeedingHausa([
      q('a', 'Tell us about care.', undefined, 'Where?'),
      q('b', 'Done already.', 'An riga an yi.'),
      { id: 'c', text: {}, probes: {} },
    ]);
    expect(asked).toEqual([
      { key: 'a', text: 'Tell us about care.', probes: 'Where?' },
    ]);
    expect(
      questionsNeedingHausa([q('b', 'Done already.', 'An riga an yi.')], true),
    ).toHaveLength(1);
  });

  it('accepts only the keys asked for and drops empty translations', () => {
    const asked = [
      { key: 'a', text: 'x', probes: '' },
      { key: 'b', text: 'y', probes: '' },
    ];
    const reply =
      '```json\n' +
      JSON.stringify({
        items: [
          { key: 'a', text: ' Ka gaya mana ', probes: 'Ina?' },
          { key: 'b', text: '   ', probes: '' },
          { key: 'zzz', text: 'invented', probes: '' },
          { key: 7, text: 'bad' },
        ],
      }) +
      '\n```';
    const out = parseTranslation(reply, asked);
    expect([...out.keys()]).toEqual(['a']);
    expect(out.get('a')).toEqual({ text: 'Ka gaya mana', probes: 'Ina?' });
  });

  it('rejects a reply that is not JSON', () => {
    expect(() => parseTranslation('sorry, no', [])).toThrow();
  });
});
