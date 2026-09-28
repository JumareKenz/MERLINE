import type { Interview } from '@/types/interview';

/**
 * Who conducted an interview, for display: the name typed on the field app
 * (one access code may be shared by a team), "Self-administered" for a
 * respondent who answered through a link, else the account's name.
 * Mirrors interviewerLabel() in the API's report builder.
 */
export function interviewerLabel(iv: Pick<Interview, 'enumeratorName' | 'respondentLinkId' | 'interviewer'>): string {
  if (iv.enumeratorName?.trim()) return iv.enumeratorName.trim();
  if (iv.respondentLinkId) return 'Self-administered';
  return iv.interviewer ? `${iv.interviewer.firstName} ${iv.interviewer.lastName}`.trim() : '';
}
