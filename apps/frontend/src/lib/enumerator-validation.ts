/**
 * Client-side checks that mirror the server's (CreateEnumeratorDto), so a
 * mistake is shown next to the field before anything is sent. The server
 * remains the authority and repeats every check.
 */
const NAME = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
const PHONE = /^\+?[0-9][0-9 ()-]{6,18}[0-9]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface EnumeratorFormValues {
  fullName: string;
  email: string;
  phone: string;
  state: string;
}

export type EnumeratorFormErrors = Partial<Record<keyof EnumeratorFormValues | 'projects', string>>;

export function validateEnumerator(v: EnumeratorFormValues): EnumeratorFormErrors {
  const errors: EnumeratorFormErrors = {};
  const name = v.fullName.trim();
  if (!name) errors.fullName = 'Enter the enumerator’s full name.';
  else if (!NAME.test(name)) errors.fullName = 'Use letters, spaces, apostrophes and hyphens only.';
  else if (name.length > 120) errors.fullName = 'Keep the name under 120 characters.';

  if (v.email.trim() && !EMAIL.test(v.email.trim())) errors.email = 'Enter a valid email address, or leave it empty.';

  if (!v.phone.trim()) errors.phone = 'Enter a phone number.';
  else if (!PHONE.test(v.phone.trim())) errors.phone = 'Enter a valid phone number, e.g. +234 803 000 0000.';

  if (!v.state.trim()) errors.state = 'Choose or type the state they work in.';
  return errors;
}

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const;

export const CODE_VALIDITY_OPTIONS = [
  { value: '', label: 'No expiry' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '6 months' },
  { value: '365', label: '1 year' },
] as const;
