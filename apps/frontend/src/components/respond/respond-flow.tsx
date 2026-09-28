'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, CloudUpload, Loader2, Mic, Pause, Play, RotateCcw, Upload, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/components/interviews/recording-player';
import { useRespondRecorder } from '@/hooks/use-respond-recorder';
import { RespondError, newId, newSecret, respondApi, type AnswerEntry } from '@/lib/respond/api';
import { audioStore, sessionStore, type SavedSession } from '@/lib/respond/local';
import { StreamUploader, type UploadProgress } from '@/lib/respond/uploader';
import { languageLabel } from '@/lib/languages';
import { cn, formatDuration } from '@/lib/utils';
import type { PublicLink, PublicQuestion } from '@/types/respondent-link';
import { QuestionView, isAnswered, localized, type ClosedAnswer } from './question-view';

type Stage =
  | 'loading'
  | 'unavailable'
  | 'welcome'
  | 'about'
  | 'consent'
  | 'mic'
  | 'interview'
  | 'recovered'
  | 'fallback'
  | 'submitting'
  | 'done';

const errMessage = (e: unknown) => (e instanceof RespondError ? e.message : 'Something went wrong.');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retries an idempotent call through lost connections and busy servers. */
async function persist<T>(fn: () => Promise<T>, onWaiting?: (why: string) => void): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof RespondError) || !e.retryable) throw e;
      onWaiting?.(e.status === 0 ? 'Waiting for a connection…' : 'The server is busy; trying again…');
      await wait(Math.min(30_000, 1500 * 2 ** Math.min(attempt, 5)));
    }
  }
}

function Shell({ link, children, wide }: { link?: PublicLink | null; children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-[100dvh] bg-background-surface">
      <header className="border-b border-border-subtle bg-background-elevated">
        <div className={cn('mx-auto flex items-center gap-3 px-4 py-3', wide ? 'max-w-2xl' : 'max-w-xl')}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-[14px] font-bold text-white" aria-hidden>
            {(link?.organizationName ?? 'M').charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">{link?.organizationName ?? 'Merline'}</p>
            {link && <p className="truncate text-[12.5px] text-foreground-tertiary">{link.projectName}</p>}
          </div>
        </div>
      </header>
      <main className={cn('mx-auto px-4 pb-16 pt-6 sm:pt-10', wide ? 'max-w-2xl' : 'max-w-xl')}>{children}</main>
      <footer className="pb-6 text-center text-[12px] text-foreground-tertiary">Secure research interview · Merline</footer>
    </div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl bg-background-elevated p-5 shadow-soft ring-1 ring-border-subtle sm:p-7', className)}>{children}</section>;
}

function Notice({ tone = 'warning', children }: { tone?: 'warning' | 'error' | 'info'; children: ReactNode }) {
  return (
    <div
      role={tone === 'info' ? 'status' : 'alert'}
      className={cn(
        'flex items-start gap-2.5 rounded-xl px-4 py-3 text-[15px] leading-relaxed text-foreground',
        tone === 'error' ? 'bg-error-bg' : tone === 'warning' ? 'bg-warning-bg' : 'bg-primary-50',
      )}
    >
      {tone === 'info' ? <WifiOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

function Level({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {[0.1, 0.25, 0.45, 0.65, 0.85].map((t, i) => (
        <span
          key={i}
          className={cn('w-1.5 rounded-full transition-[height,background-color] duration-100', active && level >= t ? 'bg-lemon' : 'bg-white/25')}
          style={{ height: `${10 + i * 5}px` }}
        />
      ))}
    </div>
  );
}

function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-subtle px-4 py-3 text-[15px] leading-relaxed hover:border-border-strong">
      <input id={id} type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--brand-navy))]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

function MicHelp() {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px]">
      <li>Tap the lock or settings icon beside the address bar, allow the microphone, then reload this page.</li>
      <li>On iPhone: Settings › Safari › Microphone › Allow.</li>
      <li>Opened inside WhatsApp or another app? Open the link in Chrome or Safari instead.</li>
    </ul>
  );
}

export function RespondFlow({ token }: { token: string }) {
  const [link, setLink] = useState<PublicLink | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Details and consent.
  const [lang, setLang] = useState('en');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [agree, setAgree] = useState(false);
  const [allowAi, setAllowAi] = useState(false);
  const [allowQuote, setAllowQuote] = useState(false);
  const [allowPublish, setAllowPublish] = useState(false);
  // Optional permissions start unticked: consent must be an active choice.

  // The interview.
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerEntry>>({});
  const [progress, setProgress] = useState<UploadProgress>({ phase: 'idle', uploadedBytes: 0, totalBytes: 0 });
  const [submitNote, setSubmitNote] = useState<string | null>(null);
  const [recovered, setRecovered] = useState<{ durationMs: number; bytes: number } | null>(null);
  const [online, setOnline] = useState(true);

  const saved = useRef<SavedSession | null>(null);
  const uploader = useRef<StreamUploader | null>(null);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const stoppedResolve = useRef<((ms: number) => void) | null>(null);

  const questions: PublicQuestion[] = useMemo(() => link?.guide.questions ?? [], [link]);
  const q = questions[index];

  const remember = useCallback(
    (patch: Partial<SavedSession>) => {
      if (!saved.current) return;
      saved.current = { ...saved.current, ...patch };
      sessionStore.save(token, saved.current);
    },
    [token],
  );

  const rec = useRespondRecorder({
    onSlice: (blob, seq) => {
      const s = saved.current;
      if (!s?.recording) return;
      uploader.current?.append(blob);
      const recording = { ...s.recording, slices: seq + 1, bytes: s.recording.bytes + blob.size };
      remember({ recording });
      const id = s.recording.id;
      writes.current = writes.current.then(() => audioStore.put(id, seq, blob)).catch(() => undefined);
    },
    onStopped: ({ durationMs }) => {
      const s = saved.current;
      if (s?.recording) remember({ recording: { ...s.recording, durationMs, stopped: true } });
      stoppedResolve.current?.(durationMs);
      stoppedResolve.current = null;
    },
  });

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Keep the recording's duration in the saved session while recording.
  useEffect(() => {
    const s = saved.current;
    if (rec.phase === 'recording' && s?.recording) remember({ recording: { ...s.recording, durationMs: rec.elapsedMs } });
  }, [rec.elapsedMs, rec.phase, remember]);

  // Leaving mid-interview: warn. What was said so far is saved either way.
  useEffect(() => {
    if (stage !== 'interview' && stage !== 'submitting') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [stage]);

  /* ------------------------------------------------ loading */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let l: PublicLink;
      try {
        l = await respondApi.link(token);
      } catch (e) {
        if (cancelled) return;
        setProblem(
          e instanceof RespondError && e.status === 0
            ? 'This page could not reach the server. Check your internet connection, then reload.'
            : errMessage(e),
        );
        setStage('unavailable');
        return;
      }
      if (cancelled) return;
      setLink(l);
      setLang(l.languages.includes(l.language) ? l.language : 'en');
      if (l.respondentName) setName(l.respondentName);

      const local = sessionStore.load(token);
      if (local) {
        try {
          const state = await respondApi.state(token, local.sessionId, local.secret);
          if (cancelled) return;
          saved.current = local;
          setLang(local.language);
          setName(local.name);
          setAnswers(local.answers ?? {});
          setIndex(Math.min(local.questionIndex ?? 0, l.guide.questions.length - 1));
          if (state.finished) {
            setStage('done');
            return;
          }
          if (local.recording && local.recording.bytes > 0) {
            setRecovered({ durationMs: local.recording.durationMs, bytes: local.recording.bytes });
            setStage('recovered');
            return;
          }
          setStage('mic');
          return;
        } catch (e) {
          if (cancelled) return;
          if (e instanceof RespondError && e.retryable) {
            setProblem('This page could not reach the server. Check your internet connection, then reload. Your answers are saved on this device.');
            setStage('unavailable');
            return;
          }
          // The session is gone (removed by the research team, or invalid): start fresh.
          if (local.recording) void audioStore.remove(local.recording.id);
          sessionStore.clear(token);
        }
      }
      if (l.state !== 'open') {
        setProblem(
          l.state === 'expired'
            ? 'This link has expired. Ask the research team for a new one.'
            : l.state === 'full'
              ? 'This link has already been used. Ask the research team for a new one.'
              : 'This link is closed and no longer accepts answers.',
        );
        setStage('unavailable');
        return;
      }
      setStage('welcome');
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  /* ------------------------------------------------ steps */

  const startSession = async () => {
    if (!link || !agree || busy) return;
    setBusy(true);
    setProblem(null);
    const s: SavedSession = saved.current ?? {
      sessionId: newId(),
      secret: newSecret(),
      language: lang,
      name: name.trim(),
      questionIndex: 0,
      answers: {},
    };
    try {
      // Idempotent: a retry after a dropped response is the same session.
      await respondApi.start(token, {
        sessionId: s.sessionId,
        secret: s.secret,
        respondent: { name: name.trim(), role: role.trim() || undefined, organisation: organisation.trim() || undefined },
        consent: {
          allowRecording: true,
          allowTranscription: true,
          allowAiAnalysis: allowAi,
          allowQuotation: allowQuote,
          allowPublication: allowPublish,
        },
        language: lang,
      });
      saved.current = { ...s, language: lang, name: name.trim() };
      sessionStore.save(token, saved.current);
      setStage('mic');
      void rec.prepare();
    } catch (e) {
      saved.current = s; // keep the ids so a retry is the same session
      setProblem(
        e instanceof RespondError && e.status === 0 ? 'No internet connection. Connect, then press Agree and continue again.' : errMessage(e),
      );
    } finally {
      setBusy(false);
    }
  };

  const markShown = useCallback(
    (qi: number, atMs: number, recordingRef?: string) => {
      const question = questions[qi];
      if (!question) return;
      setAnswers((prev) => {
        if (prev[question.id]) return prev;
        const next = {
          ...prev,
          [question.id]: { questionId: question.id, status: 'ASKED' as const, atMs: Math.round(atMs), recordingRef, markedAt: new Date().toISOString() },
        };
        remember({ answers: next, questionIndex: qi });
        return next;
      });
    },
    [questions, remember],
  );

  const setClosedAnswer = (question: PublicQuestion, a: ClosedAnswer) => {
    setAnswers((prev) => {
      const cur = prev[question.id];
      const next = {
        ...prev,
        [question.id]: {
          questionId: question.id,
          status: 'ASKED' as const,
          atMs: cur?.atMs,
          recordingRef: cur?.recordingRef,
          ...a,
          markedAt: new Date().toISOString(),
        },
      };
      remember({ answers: next });
      return next;
    });
  };

  const syncAnswers = useCallback(() => {
    const s = saved.current;
    if (!s) return;
    const entries = Object.values(s.answers ?? {});
    if (entries.length) respondApi.answers(token, s.sessionId, s.secret, entries).catch(() => undefined);
  }, [token]);

  const beginInterview = async () => {
    const s = saved.current;
    if (!s || busy) return;
    setBusy(true);
    setProblem(null);
    const recordingId = newId();
    // The container actually used (WebM/Opus, or MP4/AAC on Safari).
    const mimeType = await rec.start();
    setBusy(false);
    if (!mimeType) return;
    remember({ recording: { id: recordingId, mimeType, durationMs: 0, bytes: 0, slices: 0, stopped: false }, uploadedParts: [], completedUploadId: undefined });
    uploader.current = new StreamUploader({
      token,
      sessionId: s.sessionId,
      secret: s.secret,
      uploadId: recordingId,
      mimeType,
      onProgress: setProgress,
      onPartsChange: (parts) => remember({ uploadedParts: parts }),
    });
    setIndex(0);
    markShown(0, 0, recordingId);
    setStage('interview');
  };

  const go = (to: number) => {
    const s = saved.current;
    if (to < 0 || to >= questions.length) return;
    setIndex(to);
    remember({ questionIndex: to });
    markShown(to, rec.elapsed(), s?.recording?.id);
    syncAnswers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const skip = () => {
    if (!q) return;
    setAnswers((prev) => {
      const next = { ...prev, [q.id]: { questionId: q.id, status: 'SKIPPED' as const, atMs: prev[q.id]?.atMs, markedAt: new Date().toISOString() } };
      remember({ answers: next });
      return next;
    });
    if (index < questions.length - 1) go(index + 1);
  };

  /** Stop recording (if still going), finish the upload, send answers, finish. */
  const submit = async () => {
    const s = saved.current;
    if (!s?.recording) return;
    setStage('submitting');
    setProblem(null);
    setSubmitNote(null);
    try {
      let durationMs = s.recording.durationMs;
      if (rec.phase === 'recording' || rec.phase === 'paused') {
        durationMs = await new Promise<number>((resolve) => {
          stoppedResolve.current = resolve;
          rec.stop();
        });
      }
      await writes.current;
      const current = saved.current!;
      const recording = current.recording!;

      if (current.completedUploadId !== recording.id) {
        if (!uploader.current || uploader.current.uploadId !== recording.id) {
          // After a reload: rebuild from the audio saved on this device.
          const status = await persist(() => respondApi.uploadStatus(token, current.sessionId, current.secret, recording.id), setSubmitNote);
          if (!status.completed) {
            const slices = await audioStore.read(recording.id, recording.slices);
            if (!slices.length) throw new RespondError('The recording saved on this device could not be read. Please record again.', 400);
            const u = new StreamUploader({
              token,
              sessionId: current.sessionId,
              secret: current.secret,
              uploadId: recording.id,
              mimeType: recording.mimeType,
              uploadedParts: status.receivedParts,
              onProgress: setProgress,
              onPartsChange: (parts) => remember({ uploadedParts: parts }),
            });
            slices.forEach((b) => u.append(b));
            uploader.current = u;
          }
        }
        if (uploader.current) await uploader.current.finish(durationMs);
        remember({ completedUploadId: recording.id });
      }

      setSubmitNote('Saving your answers…');
      const entries = Object.values(saved.current?.answers ?? {});
      if (entries.length) await persist(() => respondApi.answers(token, current.sessionId, current.secret, entries), setSubmitNote);
      await persist(() => respondApi.finish(token, current.sessionId, current.secret), setSubmitNote);

      void audioStore.remove(recording.id);
      sessionStore.clear(token);
      setStage('done');
    } catch (e) {
      setProblem(errMessage(e));
    }
  };

  const startOver = async () => {
    const s = saved.current;
    uploader.current?.cancel();
    uploader.current = null;
    if (s?.recording) await audioStore.remove(s.recording.id).catch(() => undefined);
    remember({ recording: undefined, uploadedParts: [], completedUploadId: undefined, answers: {}, questionIndex: 0 });
    setAnswers({});
    setIndex(0);
    setRecovered(null);
    setProblem(null);
    setStage('mic');
    void rec.prepare();
  };

  /* ------------------------------------------------ file fallback */

  const [file, setFile] = useState<File | null>(null);
  const uploadFile = async () => {
    const s = saved.current;
    if (!s || !file) return;
    const recordingId = newId();
    const mimeType = file.type || 'audio/mpeg';
    // bytes 0: a file is not kept on the device, so a reload offers the
    // upload again rather than "send what I recorded".
    remember({ recording: { id: recordingId, mimeType, durationMs: 0, bytes: 0, slices: 0, stopped: true } });
    const u = new StreamUploader({
      token,
      sessionId: s.sessionId,
      secret: s.secret,
      uploadId: recordingId,
      mimeType,
      onProgress: setProgress,
    });
    u.append(file);
    uploader.current = u;
    await submit();
  };

  /* ------------------------------------------------ render */

  if (stage === 'loading') {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-24 text-foreground-secondary" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading…
        </div>
      </Shell>
    );
  }

  if (stage === 'unavailable' || !link) {
    return (
      <Shell link={link}>
        <Card>
          <AlertTriangle className="h-8 w-8 text-warning" aria-hidden />
          <h1 className="mt-3 font-display text-[22px] font-semibold text-foreground">This interview is not available</h1>
          <p className="mt-2 text-[16px] leading-relaxed text-foreground-secondary">{problem}</p>
          <Button className="mt-5" variant="secondary" onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Reload
          </Button>
        </Card>
      </Shell>
    );
  }

  const openCount = questions.filter((x) => x.type === 'OPEN').length;
  const minutes = Math.max(5, Math.round(openCount * 2 + (questions.length - openCount) * 0.5));

  if (stage === 'welcome') {
    return (
      <Shell link={link}>
        <Card>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">Research interview</p>
          <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight text-foreground sm:text-[30px]">{link.title}</h1>
          {link.intro && <p className="mt-4 whitespace-pre-line text-[16px] leading-relaxed text-foreground-secondary">{link.intro}</p>}
          <ul className="mt-5 space-y-2.5 text-[15px] text-foreground-secondary">
            <li className="flex gap-2.5">
              <Mic className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" aria-hidden /> You answer {questions.length} questions out loud; your voice is recorded.
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" aria-hidden /> About {minutes} minutes. You can pause at any time.
            </li>
            <li className="flex gap-2.5">
              <CloudUpload className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" aria-hidden /> Your answers are saved on this device as you go, so a weak connection is fine.
            </li>
          </ul>
          {link.languages.length > 1 && (
            <div className="mt-6">
              <p className="mb-2 text-[14px] font-medium text-foreground">Show the questions in</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Language">
                {link.languages.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={lang === l}
                    onClick={() => setLang(l)}
                    className={cn(
                      'h-11 rounded-xl border px-4 text-[15px] font-medium',
                      lang === l ? 'border-primary bg-primary-50 text-primary-700 ring-1 ring-primary' : 'border-border-subtle hover:border-border-strong',
                    )}
                  >
                    {languageLabel(l)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button size="xl" className="mt-7 w-full" onClick={() => setStage('about')}>
            Begin <ArrowRight className="h-5 w-5" aria-hidden />
          </Button>
          <p className="mt-3 text-center text-[13px] text-foreground-tertiary">Use a quiet place. Headphones are not needed.</p>
        </Card>
      </Shell>
    );
  }

  if (stage === 'about') {
    return (
      <Shell link={link}>
        <Card>
          <h1 className="font-display text-[22px] font-semibold text-foreground">About you</h1>
          <p className="mt-1 text-[15px] text-foreground-secondary">So the research team knows whose answers these are.</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) setStage('consent');
            }}
          >
            <div>
              <label htmlFor="r-name" className="mb-1.5 block text-[15px] font-medium text-foreground">
                Your name
              </label>
              <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} autoComplete="name" className="h-12 text-[16px]" />
            </div>
            <div>
              <label htmlFor="r-role" className="mb-1.5 block text-[15px] font-medium text-foreground">
                Your role or position <span className="font-normal text-foreground-tertiary">(optional)</span>
              </label>
              <Input id="r-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={200} className="h-12 text-[16px]" placeholder="e.g. Ward head, nurse, teacher" />
            </div>
            <div>
              <label htmlFor="r-org" className="mb-1.5 block text-[15px] font-medium text-foreground">
                Organisation or community <span className="font-normal text-foreground-tertiary">(optional)</span>
              </label>
              <Input id="r-org" value={organisation} onChange={(e) => setOrganisation(e.target.value)} maxLength={200} className="h-12 text-[16px]" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" size="lg" variant="ghost" onClick={() => setStage('welcome')}>
                <ArrowLeft className="h-5 w-5" aria-hidden /> Back
              </Button>
              <Button type="submit" size="lg" className="flex-1" disabled={!name.trim()}>
                Continue <ArrowRight className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          </form>
        </Card>
      </Shell>
    );
  }

  if (stage === 'consent') {
    return (
      <Shell link={link}>
        <Card>
          <h1 className="font-display text-[22px] font-semibold text-foreground">Before you start</h1>
          <div className="mt-4 space-y-3 whitespace-pre-line rounded-xl bg-background-surface px-4 py-4 text-[15px] leading-relaxed text-foreground-secondary">
            {link.consentText}
          </div>
          <div className="mt-5 space-y-2.5">
            <Check id="c-agree" checked={agree} onChange={setAgree}>
              <span className="font-medium text-foreground">I agree to take part, and for my answers to be audio recorded and written down.</span>
            </Check>
            <p className="pt-2 text-[14px] font-medium text-foreground">You may also allow (optional):</p>
            <Check id="c-ai" checked={allowAi} onChange={setAllowAi}>
              Computer-assisted (AI) analysis of my answers by the research team
            </Check>
            <Check id="c-quote" checked={allowQuote} onChange={setAllowQuote}>
              Quoting my words in reports, without my name
            </Check>
            <Check id="c-pub" checked={allowPublish} onChange={setAllowPublish}>
              Publishing findings that include those quotes
            </Check>
          </div>
          {problem && (
            <div className="mt-4">
              <Notice tone="error">{problem}</Notice>
            </div>
          )}
          <div className="mt-6 flex gap-2">
            <Button type="button" size="lg" variant="ghost" onClick={() => setStage('about')} disabled={busy}>
              <ArrowLeft className="h-5 w-5" aria-hidden /> Back
            </Button>
            <Button size="lg" className="flex-1" disabled={!agree} loading={busy} onClick={startSession}>
              Agree and continue
            </Button>
          </div>
          {!agree && <p className="mt-3 text-[13px] text-foreground-tertiary">This interview is answered by voice, so it needs your agreement to record.</p>}
        </Card>
      </Shell>
    );
  }

  if (stage === 'mic') {
    const blocked = rec.phase === 'denied' || rec.phase === 'unsupported';
    return (
      <Shell link={link}>
        <Card>
          <h1 className="font-display text-[22px] font-semibold text-foreground">Check your microphone</h1>
          <p className="mt-1 text-[15px] text-foreground-secondary">Say a few words. The bars below should move while you speak.</p>
          <div className="mt-5 flex flex-col items-center gap-4 rounded-2xl bg-navy px-5 py-7 text-white">
            <Level level={rec.level} active={rec.phase === 'ready'} />
            <p className="text-[15px] text-white/85" role="status">
              {rec.phase === 'ready'
                ? 'Microphone is on. Nothing is being recorded yet.'
                : rec.phase === 'requesting'
                  ? 'Allow the microphone when your browser asks.'
                  : blocked
                    ? 'The microphone is not available.'
                    : 'The microphone is off.'}
            </p>
            {(rec.phase === 'idle' || rec.phase === 'error') && (
              <Button variant="accent" size="lg" onClick={() => void rec.prepare()}>
                <Mic className="h-5 w-5" aria-hidden /> Turn on microphone
              </Button>
            )}
          </div>
          {rec.phase === 'denied' && (
            <div className="mt-4">
              <Notice>
                Microphone access is blocked for this page.
                <MicHelp />
              </Notice>
            </div>
          )}
          {rec.phase === 'unsupported' && (
            <div className="mt-4">
              <Notice>This browser cannot record here. Open the link in Chrome or Safari, or upload a recording instead.</Notice>
            </div>
          )}
          {rec.error && rec.phase === 'error' && (
            <div className="mt-4">
              <Notice tone="error">{rec.error}</Notice>
            </div>
          )}
          <Button size="xl" className="mt-6 w-full" disabled={rec.phase !== 'ready'} loading={busy} onClick={beginInterview}>
            <Mic className="h-5 w-5" aria-hidden /> Start recording and see question 1
          </Button>
          <button type="button" className="mt-4 w-full text-center text-[14px] font-medium text-foreground-link hover:underline" onClick={() => setStage('fallback')}>
            Can’t use the microphone? Upload a recording instead
          </button>
        </Card>
      </Shell>
    );
  }

  if (stage === 'interview' && q) {
    const last = index === questions.length - 1;
    const answer = answers[q.id] as ClosedAnswer | undefined;
    const needsAnswer = q.required && q.type !== 'OPEN' && !isAnswered(q, answer);
    const recording = rec.phase === 'recording';
    return (
      <Shell link={link} wide>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[14px] font-medium text-foreground-secondary">
            Question {index + 1} of {questions.length}
          </p>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border-subtle" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        <Card>
          <QuestionView q={q} lang={lang} answer={answer} onAnswer={(a) => setClosedAnswer(q, a)} />
        </Card>

        <div className={cn('mt-4 flex items-center gap-4 rounded-2xl px-5 py-4 text-white transition-colors', recording ? 'bg-navy-deep' : 'bg-navy')}>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em]" role="status" aria-live="polite">
              {recording && (
                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-recording-halo rounded-full bg-recording" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-recording" />
                </span>
              )}
              {recording ? 'Recording' : 'Paused'}
            </p>
            <p className="mt-0.5 font-display text-[26px] font-semibold tabular-nums leading-none">{formatDuration(rec.elapsedMs)}</p>
            <p className="mt-1 truncate text-[12.5px] text-white/75">
              {online ? `Saved on this device${progress.uploadedBytes ? ` · ${formatBytes(progress.uploadedBytes)} sent` : ''}` : 'Offline · still recording and saving on this device'}
            </p>
          </div>
          <Level level={rec.level} active={recording} />
          <button
            type="button"
            onClick={recording ? rec.pause : rec.resume}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lemon"
            aria-label={recording ? 'Pause recording' : 'Resume recording'}
          >
            {recording ? <Pause className="h-6 w-6" aria-hidden /> : <Play className="h-6 w-6" aria-hidden />}
          </button>
        </div>
        {rec.error && (
          <div className="mt-3">
            <Notice>{rec.error}</Notice>
          </div>
        )}
        {progress.phase === 'error' && (
          <div className="mt-3">
            <Notice tone="error">{progress.message}</Notice>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          <Button size="lg" variant="ghost" disabled={index === 0} onClick={() => go(index - 1)}>
            <ArrowLeft className="h-5 w-5" aria-hidden /> Back
          </Button>
          {!q.required && !last && (
            <Button size="lg" variant="secondary" onClick={skip}>
              Skip
            </Button>
          )}
          {last ? (
            <Button size="lg" className="flex-1" disabled={needsAnswer} onClick={() => void submit()}>
              Finish and send <CheckCircle2 className="h-5 w-5" aria-hidden />
            </Button>
          ) : (
            <Button size="lg" className="flex-1" disabled={needsAnswer} onClick={() => go(index + 1)}>
              Next question <ArrowRight className="h-5 w-5" aria-hidden />
            </Button>
          )}
        </div>
        {needsAnswer && <p className="mt-2 text-[13px] text-foreground-tertiary">Choose an answer to continue.</p>}
        {rec.phase === 'stopped' && (
          <div className="mt-4">
            <Notice>
              Recording stopped. You can send what was recorded now.
              <Button className="mt-2" size="sm" onClick={() => void submit()}>
                Send my answers
              </Button>
            </Notice>
          </div>
        )}
      </Shell>
    );
  }

  if (stage === 'recovered') {
    return (
      <Shell link={link}>
        <Card>
          <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
          <h1 className="mt-3 font-display text-[22px] font-semibold text-foreground">Welcome back, {name.split(' ')[0]}</h1>
          <p className="mt-2 text-[16px] leading-relaxed text-foreground-secondary">
            Your recording was saved on this device
            {recovered ? ` (${formatDuration(recovered.durationMs)}, ${formatBytes(recovered.bytes)})` : ''}. It stopped when the page closed. You can send it as it
            is, or record all your answers again from the start.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button size="lg" onClick={() => void submit()}>
              <CloudUpload className="h-5 w-5" aria-hidden /> Send what I recorded
            </Button>
            <Button size="lg" variant="secondary" onClick={() => void startOver()}>
              <RotateCcw className="h-5 w-5" aria-hidden /> Record again
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  if (stage === 'fallback') {
    return (
      <Shell link={link} wide>
        <Card>
          <h1 className="font-display text-[22px] font-semibold text-foreground">Upload a recording</h1>
          <p className="mt-1 text-[15px] text-foreground-secondary">
            Record your answers to the questions below with your phone’s voice recorder (or any app), then choose the file here.
          </p>
          <ol className="mt-5 space-y-5">
            {questions.map((question, i) => (
              <li key={question.id} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[13px] font-semibold text-primary-700">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <QuestionView
                    compact
                    q={question}
                    lang={lang}
                    answer={answers[question.id] as ClosedAnswer | undefined}
                    onAnswer={(a) => setClosedAnswer(question, a)}
                  />
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 space-y-3 rounded-xl bg-background-surface p-4">
            <input
              type="file"
              accept="audio/*"
              aria-label="Recording file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[15px] text-foreground-secondary file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-[14px] file:font-medium file:text-primary-700"
            />
            <Button size="lg" className="w-full" disabled={!file} onClick={() => void uploadFile()}>
              <Upload className="h-5 w-5" aria-hidden /> Send recording and answers
            </Button>
          </div>
          <button type="button" className="mt-4 w-full text-center text-[14px] font-medium text-foreground-link hover:underline" onClick={() => setStage('mic')}>
            Back to recording here
          </button>
        </Card>
      </Shell>
    );
  }

  if (stage === 'submitting') {
    const pct = progress.totalBytes ? Math.round((progress.uploadedBytes / progress.totalBytes) * 100) : 0;
    return (
      <Shell link={link}>
        <Card>
          {problem ? (
            <>
              <AlertTriangle className="h-8 w-8 text-warning" aria-hidden />
              <h1 className="mt-3 font-display text-[22px] font-semibold text-foreground">Your answers were not sent</h1>
              <p className="mt-2 text-[16px] text-foreground-secondary">{problem}</p>
              <p className="mt-2 text-[14px] text-foreground-tertiary">Your recording is still saved on this device.</p>
              <Button size="lg" className="mt-5 w-full" onClick={() => void submit()}>
                <RotateCcw className="h-5 w-5" aria-hidden /> Try again
              </Button>
            </>
          ) : (
            <>
              <CloudUpload className="h-8 w-8 text-primary-700" aria-hidden />
              <h1 className="mt-3 font-display text-[22px] font-semibold text-foreground">Sending your answers…</h1>
              <p className="mt-2 text-[16px] text-foreground-secondary">Please keep this page open until it says “Thank you”.</p>
              <div className="mt-5">
                <Progress value={progress.phase === 'done' ? 100 : pct} aria-label="Upload progress" />
                <p className="mt-2 text-[14px] tabular-nums text-foreground-secondary" role="status" aria-live="polite">
                  {progress.phase === 'waiting'
                    ? progress.message
                    : progress.phase === 'done'
                      ? (submitNote ?? 'Finishing…')
                      : progress.totalBytes
                        ? `${formatBytes(progress.uploadedBytes)} of ${formatBytes(progress.totalBytes)}`
                        : 'Preparing…'}
                </p>
              </div>
              {!online && (
                <div className="mt-4">
                  <Notice tone="info">You are offline. Sending continues by itself when the connection returns.</Notice>
                </div>
              )}
            </>
          )}
        </Card>
      </Shell>
    );
  }

  // done
  return (
    <Shell link={link}>
      <Card className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
        <h1 className="mt-4 font-display text-[26px] font-semibold text-foreground">Thank you{name ? `, ${name.split(' ')[0]}` : ''}</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-foreground-secondary">
          Your answers have been received by {link.organizationName}. You can close this page.
        </p>
      </Card>
    </Shell>
  );
}
