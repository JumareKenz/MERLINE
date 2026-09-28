export type LinkState = 'open' | 'closed' | 'expired' | 'full';

/** Whether a link accepts new respondents, and if not, why. */
export function linkState(
  link: {
    closedAt: Date | null;
    expiresAt: Date | null;
    maxResponses: number | null;
  },
  completedResponses: number,
  now = Date.now(),
): LinkState {
  if (link.closedAt) return 'closed';
  if (link.expiresAt && link.expiresAt.getTime() <= now) return 'expired';
  if (link.maxResponses !== null && completedResponses >= link.maxResponses)
    return 'full';
  return 'open';
}
