import { describe, expect, it } from 'vitest';
import { defaultType, typesForProject, validateTypeMetadata } from './interview-types';

const fgd = {
  key: 'FGD',
  label: 'Focus group discussion',
  description: null,
  fields: [
    { key: 'groupSize', label: 'Group size', kind: 'number' as const, required: true },
    { key: 'groupType', label: 'Group', kind: 'select' as const, options: ['Women', 'Men'], required: true },
    { key: 'venue', label: 'Venue', kind: 'text' as const },
  ],
};

describe('interview types on the phone', () => {
  it('offers the standard types when a cached project has none', () => {
    expect(typesForProject(undefined).map((t) => t.key)).toEqual(['KII', 'FGD', 'IDI', 'HOUSEHOLD', 'OBSERVATION', 'OTHER']);
    expect(typesForProject([fgd]).map((t) => t.key)).toEqual(['FGD']);
  });

  it('preselects the project method or the only type, and nothing otherwise', () => {
    const many = typesForProject(undefined);
    expect(defaultType(many, 'KII')).toBe('KII');
    expect(defaultType(many, 'NOT_A_TYPE')).toBe('');
    expect(defaultType([fgd], null)).toBe('FGD');
  });

  it('requires the fields a type marks required and converts numbers', () => {
    expect(validateTypeMetadata(fgd, {}).errors).toEqual({
      groupSize: 'Group size is required.',
      groupType: 'Group is required.',
    });
    const ok = validateTypeMetadata(fgd, { groupSize: ' 8 ', groupType: 'Women', venue: '' });
    expect(ok.errors).toEqual({});
    expect(ok.values).toEqual({ groupSize: 8, groupType: 'Women' });
  });

  it('rejects a non-number and an option that is not offered', () => {
    const r = validateTypeMetadata(fgd, { groupSize: 'many', groupType: 'Aliens' });
    expect(r.errors.groupSize).toMatch(/must be a number/);
    expect(r.errors.groupType).toMatch(/Choose one of the options/);
  });
});
