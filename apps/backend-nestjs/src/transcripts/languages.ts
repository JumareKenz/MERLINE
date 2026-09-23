/**
 * Languages offered as a transcription hint, by ISO 639-1 code (what the
 * provider takes). Whisper does not reliably detect Hausa unaided, so an
 * interview in Hausa should always carry the hint.
 */
export const TRANSCRIPTION_LANGUAGES: Record<string, string> = {
  en: 'English',
  ha: 'Hausa',
};

export const TRANSCRIPTION_LANGUAGE_CODES = Object.keys(
  TRANSCRIPTION_LANGUAGES,
);
