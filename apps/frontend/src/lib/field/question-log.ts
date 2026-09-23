import { API } from '@/lib/api-client';
import { idbQuestionLog, isIndexedDbAvailable } from './idb';
import type { QuestionMark } from './types';

/**
 * Guide question marks (asked / skipped, and when in the recording). Saved
 * on the phone first, so marking works offline; sent whenever there is a
 * connection. Sending is idempotent and the server keeps the latest mark
 * per question, so resending after a dropped response is harmless.
 */
export async function markQuestion(interviewId: string, mark: QuestionMark): Promise<QuestionMark[]> {
  if (!isIndexedDbAvailable()) return [mark];
  const existing = await idbQuestionLog.get(interviewId);
  const marks = [...(existing?.marks ?? []).filter((m) => m.questionId !== mark.questionId), mark];
  await idbQuestionLog.put({ interviewId, marks, synced: false });
  void syncQuestionLog(interviewId);
  return marks;
}

export async function loadMarks(interviewId: string): Promise<QuestionMark[]> {
  if (!isIndexedDbAvailable()) return [];
  return (await idbQuestionLog.get(interviewId))?.marks ?? [];
}

const inFlight = new Map<string, Promise<boolean>>();

/** Sends one interview's marks. Returns true once the server has them. */
export function syncQuestionLog(interviewId: string): Promise<boolean> {
  const running = inFlight.get(interviewId);
  if (running) return running;
  const attempt = sendMarks(interviewId).finally(() => {
    // Only this attempt's own entry: a newer one may already be registered.
    if (inFlight.get(interviewId) === attempt) inFlight.delete(interviewId);
  });
  inFlight.set(interviewId, attempt);
  return attempt;
}

async function sendMarks(interviewId: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  const record = await idbQuestionLog.get(interviewId);
  if (!record || record.synced || record.marks.length === 0) return true;
  try {
    await API.interviews.saveQuestionLog(interviewId, record.marks);
  } catch {
    // Offline, or the interview is not on the server yet: try again later.
    return false;
  }
  // Only flag synced if nothing was marked while we were sending.
  const latest = await idbQuestionLog.get(interviewId);
  if (
    latest &&
    latest.marks.length === record.marks.length &&
    latest.marks.every((m, i) => m.markedAt === record.marks[i].markedAt)
  ) {
    await idbQuestionLog.put({ ...latest, synced: true });
  }
  return true;
}

/** Sends every interview's unsent marks (called when the outbox runs). */
export async function syncAllQuestionLogs(): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  const all = await idbQuestionLog.list();
  for (const r of all) if (!r.synced) await syncQuestionLog(r.interviewId);
}
