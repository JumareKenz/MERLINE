/**
 * Interview languages offered as a transcription hint (ISO 639-1, as the
 * API takes them). Whisper does not reliably recognise Hausa unaided, so a
 * Hausa interview should always be marked as Hausa.
 */
export const INTERVIEW_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ha', label: 'Hausa' },
] as const;

export type InterviewLanguage = (typeof INTERVIEW_LANGUAGES)[number]['code'];

export function languageLabel(code?: string | null): string | null {
  if (!code) return null;
  return INTERVIEW_LANGUAGES.find((l) => l.code === code)?.label ?? code.charAt(0).toUpperCase() + code.slice(1);
}
