import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEnumeratorDto } from './dto/enumerator.dto';
import { normalizePhone, splitName } from './enumerators.service';

async function errors(input: Record<string, unknown>) {
  const dto = plainToInstance(CreateEnumeratorDto, input);
  const res = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return res.map((e) => e.property).sort();
}
const valid = { fullName: 'Amina Yusuf', phone: '+234 803 000 0000', state: 'Kano' };

describe('enumerator input', () => {
  it('accepts a complete, well-formed enumerator, with or without email', async () => {
    expect(await errors(valid)).toEqual([]);
    expect(await errors({ ...valid, email: 'amina@example.org' })).toEqual([]);
  });

  it.each([
    ['name with digits', { fullName: 'Amina 3' }, 'fullName'],
    ['name only symbols', { fullName: '###' }, 'fullName'],
    ['empty name', { fullName: '   ' }, 'fullName'],
    ['bad email', { email: 'amina@' }, 'email'],
    ['letters in phone', { phone: '0803-abc-0000' }, 'phone'],
    ['short phone', { phone: '12345' }, 'phone'],
    ['blank state', { state: '  ' }, 'state'],
    ['too many days', { codeValidDays: 4000 }, 'codeValidDays'],
    ['non-uuid project', { projectIds: ['x'] }, 'projectIds'],
    ['unknown field', { organizationId: 'x' }, 'organizationId'],
  ])('rejects %s', async (_label, over, field) => {
    expect(await errors({ ...valid, ...over })).toContain(field);
  });

  it('accepts names from other scripts, apostrophes and hyphens', async () => {
    for (const fullName of ["Nkechi O'Brien-Eze", 'Ibrahim Ɗanjuma', 'أمينة يوسف'])
      expect(await errors({ ...valid, fullName })).toEqual([]);
  });

  it('normalises phone numbers so duplicates cannot hide behind spacing', () => {
    expect(normalizePhone('+234 (803) 000-0000')).toBe('+2348030000000');
    expect(normalizePhone('0803 000 0000')).toBe('08030000000');
  });

  it('splits a full name into first and last', () => {
    expect(splitName('  Amina   Yusuf  Bello ')).toEqual(['Amina', 'Yusuf Bello']);
    expect(splitName('Madonna')).toEqual(['Madonna', '']);
  });
});
