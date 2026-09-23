/**
 * PHASE 2 — transcription job pipeline, end to end against a real database,
 * real object storage and real ffmpeg, with the Groq provider replaced by a
 * scripted fake. Proves:
 *
 *   - A finished upload queues transcription automatically (consent
 *     permitting), with the interview's language as the hint.
 *   - The job stores text, language, timed segments, model and timings,
 *     and drops text the model decoded over silence.
 *   - A silent recording completes with no segments and no provider call.
 *   - Long recordings are split at pauses and stitched with correct times.
 *   - Rate limits reschedule with backoff (honouring retry-after); running
 *     out of attempts leaves a visible FAILED transcript that can be retried.
 *   - Consent withdrawn after queueing stops the job before the provider.
 *   - Corrections keep the machine text and cannot break quoted evidence.
 *   - Translation needs consent to AI analysis and stores per segment.
 *
 * Needs RUN_DB_TESTS=1, DATABASE_URL, AWS_ENDPOINT (MinIO) and ffmpeg.
 */
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ParticipantsService } from '../../participants/participants.service';
import { ConsentsService } from '../../consents/consents.service';
import { InterviewsService } from '../../interviews/interviews.service';
import { TranscriptsService } from '../../transcripts/transcripts.service';
import {
  TranscriptionProviderService,
  TranscriptionResult,
} from '../../transcripts/transcription-provider.service';
import { TranscriptionPipelineService } from '../../transcripts/transcription-pipeline.service';
import { TranscriptionJobs } from '../../transcripts/transcription-jobs';
import { JobsService } from '../../jobs/jobs.service';
import { RetryableJobError } from '../../jobs/job-errors';
import { MediaService } from '../../media/media.service';
import { StorageService } from '../../storage/storage.service';

function hasFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const shouldRun =
  process.env.RUN_DB_TESTS === '1' &&
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.AWS_ENDPOINT) &&
  hasFfmpeg();

const describeDb = shouldRun ? describe : describe.skip;

/** A scripted stand-in for Groq. Each test sets `next`. */
class FakeProvider extends TranscriptionProviderService {
  calls: { path: string; filename: string; language?: string | null }[] = [];
  next: (callIndex: number) => Promise<TranscriptionResult> = () =>
    Promise.resolve(this.result([]));
  chatReply: (user: string) => string = () => '{}';

  result(segments: Partial<TranscriptionResult['segments'][number]>[]) {
    return {
      provider: 'groq' as const,
      model: this.sttModel,
      language: 'ha',
      segments: segments.map((s) => ({
        startMs: 0,
        endMs: 1000,
        text: 'x',
        confidence: 0.8,
        noSpeechProb: 0.01,
        avgLogprob: -0.2,
        ...s,
      })),
    };
  }

  async transcribe(
    path: string,
    options: { filename: string; mimeType: string; language?: string | null },
  ) {
    this.calls.push({
      path,
      filename: options.filename,
      language: options.language,
    });
    return this.next(this.calls.length - 1);
  }

  chat(params: { system: string; user: string }) {
    return Promise.resolve(this.chatReply(params.user));
  }
}

describeDb('transcription pipeline (database)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);
  const orgId = randomUUID();
  const userId = randomUUID();
  const workDir = mkdtempSync(join(tmpdir(), 'merline-pipeline-spec-'));

  let participants: ParticipantsService;
  let consents: ConsentsService;
  let interviews: InterviewsService;
  let transcripts: TranscriptsService;
  let storage: StorageService;
  let fake: FakeProvider;
  let config: {
    ai: { groqKey: string };
    transcription: Record<string, string | number>;
  };

  /**
   * Builds a job queue whose pipeline reads the current `config`, with a
   * fresh fake provider (script it after calling this).
   */
  function queue() {
    const jobs = new JobsService(prisma as any);
    const cfg = new ConfigService(config);
    fake = new FakeProvider(cfg);
    const pipeline = new TranscriptionPipelineService(
      prisma as any,
      storage,
      fake,
      cfg,
    );
    new TranscriptionJobs(jobs, pipeline).onModuleInit();
    return jobs;
  }

  /** Real audio: tone, a 2 s pause, tone — or pure silence. */
  function makeAudio(
    name: string,
    kind: 'speech' | 'silence',
    seconds: number,
  ) {
    const out = join(workDir, name);
    const args =
      kind === 'silence'
        ? ['-f', 'lavfi', '-i', `anullsrc=r=16000:cl=mono:d=${seconds}`]
        : [
            '-f',
            'lavfi',
            '-i',
            'sine=f=440:d=30:sample_rate=16000',
            '-f',
            'lavfi',
            '-i',
            'anullsrc=r=16000:cl=mono:d=2',
            '-f',
            'lavfi',
            '-i',
            `sine=f=300:d=${seconds - 32}:sample_rate=16000`,
            '-filter_complex',
            '[0][1][2]concat=n=3:v=0:a=1',
          ];
    execFileSync('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      ...args,
      '-ac',
      '1',
      '-c:a',
      'libopus',
      '-b:a',
      '24k',
      out,
    ]);
    const buffer = readFileSync(out);
    return {
      fieldname: 'file',
      originalname: name,
      encoding: '7bit',
      mimetype: 'audio/webm',
      size: buffer.length,
      buffer,
    } as Express.Multer.File;
  }

  async function interviewWithRecording(
    audio: Express.Multer.File,
    consentScopes: Record<string, boolean> = {},
    language?: string,
  ) {
    const participant = await participants.create(
      { displayName: `Pipe ${run}` },
      userId,
      orgId,
    );
    const consent = await consents.create(
      {
        participantId: participant.id,
        version: 'v1',
        method: 'VERBAL',
        allowRecording: true,
        allowTranscription: true,
        ...consentScopes,
      } as any,
      userId,
      orgId,
    );
    const interview = await interviews.create(
      { participantId: participant.id, consentId: consent.id, language },
      userId,
      orgId,
    );
    const media = await interviews.uploadRecording(
      interview.id,
      audio,
      undefined,
      userId,
      orgId,
    );
    const transcript = await prisma.transcript.findFirst({
      where: { mediaId: media.id },
    });
    return { interview, consent, media, transcript };
  }

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({
      data: { id: orgId, name: `Pipeline ${run}`, slug: `pipeline-${run}` },
    });
    await prisma.user.create({
      data: {
        id: userId,
        email: `pipe-${run}@t.test`,
        passwordHash: 'x',
        firstName: 'P',
        lastName: 'U',
        organizationId: orgId,
      },
    });

    storage = new StorageService(
      new ConfigService({
        aws: {
          region: process.env.AWS_REGION ?? 'eu-west-1',
          endpoint: process.env.AWS_ENDPOINT,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          bucket: process.env.AWS_BUCKET ?? 'merline-test',
        },
        storage: { signedUrlTtlSeconds: '900' },
      }),
    );
    participants = new ParticipantsService(prisma as any);
    consents = new ConsentsService(prisma as any);
    interviews = new InterviewsService(
      prisma as any,
      consents,
      new MediaService(prisma as any, storage),
    );
    transcripts = new TranscriptsService(prisma as any, consents);
  }, 60_000);

  beforeEach(() => {
    config = {
      ai: { groqKey: 'unused-by-fake' },
      transcription: {
        sttModel: 'whisper-large-v3',
        translationModel: 'openai/gpt-oss-120b',
        maxDirectBytes: 20 * 1024 * 1024,
        chunkSeconds: 600,
      },
    };
  });

  afterAll(async () => {
    const where = { organizationId: orgId };
    await prisma.job.deleteMany({ where });
    await prisma.quotation.deleteMany({ where });
    await prisma.finding.deleteMany({ where });
    await prisma.transcriptSegment.deleteMany({ where });
    await prisma.transcript.deleteMany({ where });
    await prisma.media.deleteMany({ where });
    await prisma.interview.deleteMany({ where });
    await prisma.consent.deleteMany({ where });
    await prisma.participant.deleteMany({ where });
    await prisma.user.deleteMany({ where });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it('queues on upload and stores text, language, segments, model and timings', async () => {
    const jobs = queue();
    fake.next = () =>
      Promise.resolve(
        fake.result([
          { startMs: 0, endMs: 4000, text: 'Sannu da zuwa.', confidence: 0.82 },
          { startMs: 4000, endMs: 9000, text: 'Muna noma dawa da gero.' },
          // Decoded over silence: must be dropped.
          {
            startMs: 31000,
            endMs: 32000,
            text: 'Thank you for watching!',
            noSpeechProb: 0.93,
            avgLogprob: -1.3,
          },
        ]),
      );

    const { transcript } = await interviewWithRecording(
      makeAudio('speech.webm', 'speech', 40),
      {},
      'ha',
    );
    expect(transcript?.status).toBe('PENDING');
    expect(transcript?.requestedLanguage).toBe('ha');

    await jobs.drain({ organizationId: orgId });

    const done = await prisma.transcript.findUniqueOrThrow({
      where: { id: transcript!.id },
      include: { segments: { orderBy: { index: 'asc' } } },
    });
    expect(done.status).toBe('COMPLETED');
    expect(done.model).toBe('whisper-large-v3');
    expect(done.provider).toBe('groq');
    expect(done.language).toBe('ha');
    expect(done.text).toBe('Sannu da zuwa. Muna noma dawa da gero.');
    expect(done.durationMs).toBeGreaterThan(39_000);
    expect(done.durationMs).toBeLessThan(41_000);
    expect(done.processingMs).toBeGreaterThanOrEqual(0);
    expect(done.segments.map((s) => [s.index, s.startMs, s.text])).toEqual([
      [0, 0, 'Sannu da zuwa.'],
      [1, 4000, 'Muna noma dawa da gero.'],
    ]);
    expect(done.segments[0].confidence).toBeCloseTo(0.82);
    // The interview's language went to the provider as the hint.
    expect(fake.calls[0].language).toBe('ha');
  }, 60_000);

  it('keeps recordings out of the generic /media routes (view.media is not admin-only)', async () => {
    const media = new MediaService(prisma as any, storage);
    const { media: recording } = await interviewWithRecording(
      makeAudio('private.webm', 'speech', 34),
      { allowTranscription: false },
    );
    await expect(media.findById(recording.id, orgId)).rejects.toThrow(
      /not found/i,
    );
    await expect(media.getDownloadUrl(recording.id, orgId)).rejects.toThrow(
      /not found/i,
    );
    expect(
      (await media.listForOrganization(orgId)).map((m) => m.id),
    ).not.toContain(recording.id);
    // The interview route (view.recordings, administrators) still reaches it.
    const signed = await media.getDownloadUrl(recording.id, orgId, {
      includeRecordings: true,
    });
    expect(signed.url).toMatch(/^https?:\/\//);
  }, 30_000);

  it('does not queue when consent excludes transcription', async () => {
    const { transcript } = await interviewWithRecording(
      makeAudio('noconsent.webm', 'speech', 34),
      { allowTranscription: false },
    );
    expect(transcript).toBeNull();
  }, 30_000);

  it('completes a silent recording with no segments, without calling the provider', async () => {
    const jobs = queue();
    const { transcript } = await interviewWithRecording(
      makeAudio('silence.webm', 'silence', 20),
    );
    await jobs.drain({ organizationId: orgId });

    const done = await prisma.transcript.findUniqueOrThrow({
      where: { id: transcript!.id },
      include: { _count: { select: { segments: true } } },
    });
    expect(done.status).toBe('COMPLETED');
    expect(done._count.segments).toBe(0);
    expect(fake.calls).toHaveLength(0);
  }, 30_000);

  it('splits a long recording at pauses and stitches the timestamps', async () => {
    config.transcription.maxDirectBytes = 1000; // force splitting
    config.transcription.chunkSeconds = 30;
    const jobs = queue();
    fake.next = (i) =>
      Promise.resolve(
        fake.result([{ startMs: 500, endMs: 2500, text: `chunk ${i}` }]),
      );

    const { transcript } = await interviewWithRecording(
      makeAudio('long.webm', 'speech', 70),
    );
    await jobs.drain({ organizationId: orgId });

    const done = await prisma.transcript.findUniqueOrThrow({
      where: { id: transcript!.id },
      include: { segments: { orderBy: { index: 'asc' } } },
    });
    expect(done.status).toBe('COMPLETED');
    // 70 s at 30 s targets: cut inside the pause at ~31 s, then at 61 s.
    expect(fake.calls.map((c) => c.filename)).toEqual([
      'chunk-0.ogg',
      'chunk-1.ogg',
      'chunk-2.ogg',
    ]);
    const starts = done.segments.map((s) => s.startMs);
    expect(starts[0]).toBe(500);
    expect(starts[1]).toBeGreaterThan(31_000);
    expect(starts[1]).toBeLessThan(32_000);
    // The second cut is one target length after the first.
    expect(starts[2]).toBeGreaterThan(61_000);
    expect(starts[2]).toBeLessThan(62_000);
    expect(done.segments.map((s) => s.index)).toEqual([0, 1, 2]);
  }, 60_000);

  it('reschedules on a rate limit, fails visibly when attempts run out, and can be retried', async () => {
    const jobs = queue();
    fake.next = () => {
      throw new RetryableJobError(
        'Groq rate limit reached: audio seconds per hour',
        120_000,
      );
    };
    const { transcript } = await interviewWithRecording(
      makeAudio('limited.webm', 'speech', 34),
    );

    const before = Date.now();
    await jobs.drain({ organizationId: orgId });

    let row = await prisma.transcript.findUniqueOrThrow({
      where: { id: transcript!.id },
    });
    expect(row.status).toBe('PENDING');
    expect(row.errorMessage).toMatch(/rate limit.*Retrying automatically/i);
    expect(row.nextAttemptAt!.getTime()).toBeGreaterThanOrEqual(
      before + 120_000,
    );
    const job = await prisma.job.findFirstOrThrow({
      where: { dedupeKey: `transcription:${transcript!.id}` },
    });
    expect(job.status).toBe('QUEUED');
    expect(job.runAt.getTime()).toBeGreaterThanOrEqual(before + 120_000);

    // Last attempt, due now.
    await prisma.job.update({
      where: { id: job.id },
      data: { attempts: job.maxAttempts - 1, runAt: new Date() },
    });
    await jobs.drain({ organizationId: orgId });

    row = await prisma.transcript.findUniqueOrThrow({
      where: { id: transcript!.id },
    });
    expect(row.status).toBe('FAILED');
    expect(row.errorMessage).toMatch(/rate limit/i);
    expect(
      (await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).status,
    ).toBe('FAILED');

    // Retry by hand, this time with an explicit language.
    fake.next = () => Promise.resolve(fake.result([{ text: 'Recovered.' }]));
    const retried = await transcripts.retry(transcript!.id, orgId, 'en');
    expect(retried.status).toBe('PENDING');
    await jobs.drain({ organizationId: orgId });

    row = await prisma.transcript.findUniqueOrThrow({
      where: { id: transcript!.id },
    });
    expect(row.status).toBe('COMPLETED');
    expect(row.requestedLanguage).toBe('en');
    expect(fake.calls.at(-1)!.language).toBe('en');
  }, 60_000);

  it('stops before the provider when consent is withdrawn after queueing', async () => {
    const jobs = queue();
    const { consent, transcript } = await interviewWithRecording(
      makeAudio('withdrawn.webm', 'speech', 34),
    );
    await consents.withdraw(consent.id, userId, orgId);

    await jobs.drain({ organizationId: orgId });

    const row = await prisma.transcript.findUniqueOrThrow({
      where: { id: transcript!.id },
    });
    expect(row.status).toBe('FAILED');
    expect(row.errorMessage).toMatch(/withdrawn/i);
    expect(fake.calls).toHaveLength(0);
  }, 30_000);

  it('refuses a second transcription of a recording that is still being transcribed', async () => {
    const { interview, media } = await interviewWithRecording(
      makeAudio('busy.webm', 'speech', 34),
    );
    await expect(
      transcripts.requestTranscript(interview.id, media.id, userId, orgId),
    ).rejects.toThrow(/already being transcribed/);
  }, 30_000);

  describe('corrections and translation', () => {
    let transcriptId: string;
    let segmentId: string;
    let consentId: string;

    beforeAll(async () => {
      config = {
        ai: { groqKey: 'x' },
        transcription: {
          sttModel: 'whisper-large-v3',
          maxDirectBytes: 20e6,
          chunkSeconds: 600,
        },
      };
      const jobs = queue();
      fake.next = () =>
        Promise.resolve(
          fake.result([
            { startMs: 0, endMs: 3000, text: 'Ruwan sha ya yi mana wuya.' },
            { startMs: 3000, endMs: 6000, text: 'Sai mu yi tafiya mai nisa.' },
          ]),
        );
      const { transcript, consent } = await interviewWithRecording(
        makeAudio('edit.webm', 'speech', 34),
      );
      consentId = consent.id;
      await jobs.drain({ organizationId: orgId });
      transcriptId = transcript!.id;
      segmentId = (
        await prisma.transcriptSegment.findFirstOrThrow({
          where: { transcriptId, index: 0 },
        })
      ).id;
    }, 60_000);

    it('stores a correction beside the machine text, and clears it again', async () => {
      const edited = await transcripts.editSegment(
        transcriptId,
        segmentId,
        '  Ruwan sha ya yi mana wahala.  ',
        userId,
        orgId,
      );
      expect(edited.text).toBe('Ruwan sha ya yi mana wuya.');
      expect(edited.editedText).toBe('Ruwan sha ya yi mana wahala.');
      expect(edited.editedById).toBe(userId);

      // Identical to the machine text counts as no correction.
      const same = await transcripts.editSegment(
        transcriptId,
        segmentId,
        'Ruwan sha ya yi mana wuya.',
        userId,
        orgId,
      );
      expect(same.editedText).toBeNull();
      expect(same.editedAt).toBeNull();
    });

    it('refuses a correction that would remove words a finding quotes', async () => {
      const finding = await prisma.finding.create({
        data: {
          title: 'Water access',
          interpretation: 'Distance to water',
          organizationId: orgId,
          createdById: userId,
        },
      });
      await prisma.quotation.create({
        data: {
          excerpt: 'Ruwan sha',
          organizationId: orgId,
          findingId: finding.id,
          transcriptSegmentId: segmentId,
          createdById: userId,
        },
      });

      await expect(
        transcripts.editSegment(
          transcriptId,
          segmentId,
          'Ruwa ya yi mana wuya.',
          userId,
          orgId,
        ),
      ).rejects.toThrow(/keep those words unchanged/);
      // Keeping the quoted words is fine.
      await expect(
        transcripts.editSegment(
          transcriptId,
          segmentId,
          'Ruwan sha ya yi mana wahala sosai.',
          userId,
          orgId,
        ),
      ).resolves.toMatchObject({
        editedText: 'Ruwan sha ya yi mana wahala sosai.',
      });
    });

    it('refuses translation without consent to AI analysis', async () => {
      await expect(
        transcripts.translate(transcriptId, orgId, 'en'),
      ).rejects.toThrow(/does not permit AI analysis/);
    });

    it('translates per segment from the corrected text when consent allows', async () => {
      await prisma.consent.update({
        where: { id: consentId },
        data: { allowAiAnalysis: true },
      });
      const jobs = queue();
      let sent = '';
      fake.chatReply = (user) => {
        sent = user;
        const input = JSON.parse(user) as { index: number; text: string }[];
        return JSON.stringify({
          segments: input.map((s) => ({
            index: s.index,
            text: `EN: ${s.text}`,
          })),
        });
      };

      const queued = await transcripts.translate(transcriptId, orgId, 'en');
      expect(queued.translationStatus).toBe('PENDING');
      await jobs.drain({ organizationId: orgId });

      const done = await prisma.transcript.findUniqueOrThrow({
        where: { id: transcriptId },
        include: { segments: { orderBy: { index: 'asc' } } },
      });
      expect(done.translationStatus).toBe('COMPLETED');
      expect(done.translationLanguage).toBe('en');
      expect(done.translationModel).toBe('openai/gpt-oss-120b');
      // The correction, not the machine text, is what gets translated.
      expect(sent).toContain('wahala sosai');
      expect(done.segments[0].translatedText).toBe(
        'EN: Ruwan sha ya yi mana wahala sosai.',
      );
      expect(done.segments[0].text).toBe('Ruwan sha ya yi mana wuya.');

      // Changing the wording drops that segment's (now stale) translation.
      const changed = await transcripts.editSegment(
        transcriptId,
        done.segments[0].id,
        'Ruwan sha ya yi mana wahala kwarai.',
        userId,
        orgId,
      );
      expect(changed.translatedText).toBeNull();
    });
  });
});
