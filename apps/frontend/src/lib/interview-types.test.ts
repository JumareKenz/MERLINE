import { describe, expect, it } from 'vitest';
import { STANDARD_TYPE_LABELS, fieldKey, typeKeyFromLabel, typeLabel, validateTypeDrafts } from './interview-types';

describe('interview type labels and keys', () => {
  it('names the standard types, and makes a readable label from a custom key', () => {
    expect(typeLabel('FGD')).toBe('Focus group discussion');
    expect(typeLabel('HOUSEHOLD')).toBe('Household interview');
    expect(typeLabel('WATER_POINT_VISIT')).toBe('Water point visit');
    expect(typeLabel('WATER_POINT_VISIT', { WATER_POINT_VISIT: 'Water point observation' })).toBe('Water point observation');
    expect(typeLabel(null)).toBe('Not set');
    expect(Object.keys(STANDARD_TYPE_LABELS)).toContain('OBSERVATION');
  });

  it('builds a valid key from a label', () => {
    expect(typeKeyFromLabel('Water point visit')).toBe('WATER_POINT_VISIT');
    expect(typeKeyFromLabel('  Market survey! ')).toBe('MARKET_SURVEY');
    expect(typeKeyFromLabel('2024 census')).toMatch(/^T_/);
    for (const label of ['Water point visit', 'x y z', '9 lives'])
      expect(typeKeyFromLabel(label)).toMatch(/^[A-Z][A-Z0-9_]{1,29}$/);
    expect(fieldKey('Group size')).toBe('groupSize');
    expect(fieldKey('Number of HH members')).toBe('numberOfHhMembers');
  });
});

describe('editing a project’s interview types', () => {
  const t = (over = {}) => ({ key: 'FGD', label: 'Focus group', fields: [], ...over });

  it('accepts a sensible list', () => {
    expect(validateTypeDrafts([t(), t({ key: 'KII', label: 'Key informant' })])).toEqual([]);
  });

  it('needs at least one type, a name for each, and no repeats', () => {
    expect(validateTypeDrafts([])).toContain('A project needs at least one interview type.');
    expect(validateTypeDrafts([t({ label: ' ' })])).toContain('Every type needs a name.');
    expect(validateTypeDrafts([t(), t()]).join(' ')).toMatch(/used twice/);
  });

  it('needs identifiable keys and complete fields', () => {
    expect(validateTypeDrafts([t({ key: '' })]).join(' ')).toMatch(/needs a name with letters/);
    const withField = (f: object) => t({ fields: [f] });
    expect(validateTypeDrafts([withField({ key: 'a', label: '', kind: 'text' })]).join(' ')).toMatch(/no label/);
    expect(validateTypeDrafts([withField({ key: 'a', label: 'Group', kind: 'select', options: [] })]).join(' ')).toMatch(/at least one option/);
    expect(validateTypeDrafts([withField({ key: 'a', label: 'Group', kind: 'select', options: ['Women'] })])).toEqual([]);
  });
});
