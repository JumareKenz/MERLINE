/**
 * PHASE 2 — QUALITATIVE INTERVIEW PRODUCT
 *
 * Database-backed proof of the consent invariants:
 *
 *   - An interview cannot be created without a consent record that actually
 *     belongs to the same participant.
 *   - A recording cannot be uploaded unless consent.allowRecording is true,
 *     and is refused once consent is withdrawn even if it was true.
 *   - Transcription is refused when consent.allowTranscription is false,
 *     without ever reaching the transcription provider.
 *   - Tenant isolation holds for participants, consents and interviews.
 *
 * Runs only when RUN_DB_TESTS=1 and DATABASE_URL point at a migrated
 * database. The recording tests additionally need AWS_ENDPOINT (MinIO) —
 * see storage.integration.spec.ts, which established this pattern.
 */
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ParticipantsService } from '../../participants/participants.service';
import { ConsentsService } from '../../consents/consents.service';
import { InterviewsService } from '../../interviews/interviews.service';
import { TranscriptsService } from '../../transcripts/transcripts.service';
import { TranscriptionProviderService } from '../../transcripts/transcription-provider.service';
import { TranscriptionPipelineService } from '../../transcripts/transcription-pipeline.service';
import { TranscriptionJobs } from '../../transcripts/transcription-jobs';
import { JobsService } from '../../jobs/jobs.service';
import { MediaService } from '../../media/media.service';
import { StorageService } from '../../storage/storage.service';

const shouldRun =
  process.env.RUN_DB_TESTS === '1' &&
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.AWS_ENDPOINT);

const describeDb = shouldRun ? describe : describe.skip;

describeDb('consent enforcement (database)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);

  const orgAId = randomUUID();
  const orgBId = randomUUID();
  const userAId = randomUUID();
  const userBId = randomUUID();

  let participants: ParticipantsService;
  let consents: ConsentsService;
  let interviews: InterviewsService;
  let transcripts: TranscriptsService;
  let jobs: JobsService;

  function audioFile(name: string, bytes = 1024): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: name,
      encoding: '7bit',
      mimetype: 'audio/webm',
      size: bytes,
      buffer: Buffer.alloc(bytes, 3),
    } as Express.Multer.File;
  }

  beforeAll(async () => {
    await prisma.$connect();

    await prisma.organization.createMany({
      data: [
        { id: orgAId, name: `Consent A ${run}`, slug: `consent-a-${run}` },
        { id: orgBId, name: `Consent B ${run}`, slug: `consent-b-${run}` },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `ca-${run}@t.test`,
          passwordHash: 'x',
          firstName: 'A',
          lastName: 'U',
          organizationId: orgAId,
        },
        {
          id: userBId,
          email: `cb-${run}@t.test`,
          passwordHash: 'x',
          firstName: 'B',
          lastName: 'U',
          organizationId: orgBId,
        },
      ],
    });

    participants = new ParticipantsService(prisma as any);
    consents = new ConsentsService(prisma as any);

    const storageConfig = new ConfigService({
      aws: {
        region: process.env.AWS_REGION ?? 'eu-west-1',
        endpoint: process.env.AWS_ENDPOINT,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucket: process.env.AWS_BUCKET ?? 'merline-test',
      },
      storage: { signedUrlTtlSeconds: '900' },
    });
    const storageService = new StorageService(storageConfig);
    const mediaService = new MediaService(prisma as any, storageService);
    interviews = new InterviewsService(prisma as any, consents, mediaService);

    transcripts = new TranscriptsService(prisma as any, consents);

    // No GROQ_API_KEY on purpose: proves the job fails visibly, and that
    // the consent gate refuses before the provider could ever be called.
    const aiConfig = new ConfigService({ ai: { groqKey: '' } });
    jobs = new JobsService(prisma as any);
    const pipeline = new TranscriptionPipelineService(
      prisma as any,
      storageService,
      new TranscriptionProviderService(aiConfig),
      aiConfig,
    );
    new TranscriptionJobs(jobs, pipeline).onModuleInit();
  }, 60_000);

  afterAll(async () => {
    await prisma.job.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.transcript.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.media.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.interview.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.consent.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.participant.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.user.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgAId, orgBId] } },
    });
    await prisma.$disconnect();
  });

  describe('interview creation', () => {
    it('refuses to attach a consent record belonging to a different participant', async () => {
      const p1 = await participants.create(
        { displayName: `P1 ${run}` },
        userAId,
        orgAId,
      );
      const p2 = await participants.create(
        { displayName: `P2 ${run}` },
        userAId,
        orgAId,
      );
      const consentForP1 = await consents.create(
        { participantId: p1.id, version: 'v1', method: 'VERBAL' } as any,
        userAId,
        orgAId,
      );

      await expect(
        interviews.create(
          { participantId: p2.id, consentId: consentForP1.id } as any,
          userAId,
          orgAId,
        ),
      ).rejects.toThrow();
    });

    it('refuses a consent record from another organization', async () => {
      const participantA = await participants.create(
        { displayName: `PX ${run}` },
        userAId,
        orgAId,
      );
      const participantB = await participants.create(
        { displayName: `PY ${run}` },
        userBId,
        orgBId,
      );
      const consentB = await consents.create(
        {
          participantId: participantB.id,
          version: 'v1',
          method: 'VERBAL',
        } as any,
        userBId,
        orgBId,
      );

      await expect(
        interviews.create(
          { participantId: participantA.id, consentId: consentB.id } as any,
          userAId,
          orgAId,
        ),
      ).rejects.toThrow();
    });

    it('succeeds when the consent belongs to the same participant and organization', async () => {
      const participant = await participants.create(
        { displayName: `PZ ${run}` },
        userAId,
        orgAId,
      );
      const consent = await consents.create(
        {
          participantId: participant.id,
          version: 'v1',
          method: 'WRITTEN',
          allowRecording: true,
        } as any,
        userAId,
        orgAId,
      );

      const interview = await interviews.create(
        { participantId: participant.id, consentId: consent.id },
        userAId,
        orgAId,
      );

      expect(interview.consentId).toBe(consent.id);
      expect(interview.status).toBe('SCHEDULED');
    });
  });

  describe('recording upload', () => {
    it('refuses to upload a recording when consent.allowRecording is false', async () => {
      const participant = await participants.create(
        { displayName: `RecNo ${run}` },
        userAId,
        orgAId,
      );
      const consent = await consents.create(
        {
          participantId: participant.id,
          version: 'v1',
          method: 'VERBAL',
          allowRecording: false,
        } as any,
        userAId,
        orgAId,
      );
      const interview = await interviews.create(
        { participantId: participant.id, consentId: consent.id },
        userAId,
        orgAId,
      );

      await expect(
        interviews.uploadRecording(
          interview.id,
          audioFile('no-consent.webm'),
          undefined,
          userAId,
          orgAId,
        ),
      ).rejects.toThrow(/does not permit recording/i);
    });

    it('uploads successfully when consent.allowRecording is true, to real object storage', async () => {
      const participant = await participants.create(
        { displayName: `RecYes ${run}` },
        userAId,
        orgAId,
      );
      const consent = await consents.create(
        {
          participantId: participant.id,
          version: 'v1',
          method: 'VERBAL',
          allowRecording: true,
        } as any,
        userAId,
        orgAId,
      );
      const interview = await interviews.create(
        { participantId: participant.id, consentId: consent.id },
        userAId,
        orgAId,
      );

      const media = await interviews.uploadRecording(
        interview.id,
        audioFile('consented.webm', 2048),
        undefined,
        userAId,
        orgAId,
      );

      expect(media.interviewId).toBe(interview.id);
      expect(media.type).toBe('AUDIO');

      const recordings = await interviews.listRecordings(interview.id, orgAId);
      expect(recordings.map((r) => r.id)).toContain(media.id);
    });

    it('refuses further recording once consent has been withdrawn', async () => {
      const participant = await participants.create(
        { displayName: `RecWithdrawn ${run}` },
        userAId,
        orgAId,
      );
      const consent = await consents.create(
        {
          participantId: participant.id,
          version: 'v1',
          method: 'VERBAL',
          allowRecording: true,
        } as any,
        userAId,
        orgAId,
      );
      const interview = await interviews.create(
        { participantId: participant.id, consentId: consent.id },
        userAId,
        orgAId,
      );

      await consents.withdraw(consent.id, userAId, orgAId);

      await expect(
        interviews.uploadRecording(
          interview.id,
          audioFile('post-withdrawal.webm'),
          undefined,
          userAId,
          orgAId,
        ),
      ).rejects.toThrow(/withdrawn/i);
    });
  });

  describe('transcription', () => {
    it('refuses to request a transcript when consent.allowTranscription is false, without calling the provider', async () => {
      const participant = await participants.create(
        { displayName: `TxNo ${run}` },
        userAId,
        orgAId,
      );
      const consent = await consents.create(
        {
          participantId: participant.id,
          version: 'v1',
          method: 'VERBAL',
          allowRecording: true,
          allowTranscription: false,
        } as any,
        userAId,
        orgAId,
      );
      const interview = await interviews.create(
        { participantId: participant.id, consentId: consent.id },
        userAId,
        orgAId,
      );
      const media = await interviews.uploadRecording(
        interview.id,
        audioFile('for-transcript.webm'),
        undefined,
        userAId,
        orgAId,
      );

      await expect(
        transcripts.requestTranscript(interview.id, media.id, userAId, orgAId),
      ).rejects.toThrow(/does not permit transcription/i);

      // No Transcript row should have been created for a request that never
      // passed the consent gate.
      const rows = await prisma.transcript.findMany({
        where: { interviewId: interview.id },
      });
      expect(rows).toHaveLength(0);
    });

    it('queues transcription on upload, then fails visibly when no provider is configured, never fabricating text', async () => {
      const participant = await participants.create(
        { displayName: `TxYes ${run}` },
        userAId,
        orgAId,
      );
      const consent = await consents.create(
        {
          participantId: participant.id,
          version: 'v1',
          method: 'VERBAL',
          allowRecording: true,
          allowTranscription: true,
        } as any,
        userAId,
        orgAId,
      );
      const interview = await interviews.create(
        { participantId: participant.id, consentId: consent.id },
        userAId,
        orgAId,
      );
      await interviews.uploadRecording(
        interview.id,
        audioFile('unconfigured-provider.webm'),
        undefined,
        userAId,
        orgAId,
      );

      // Queued automatically by the upload, not run in the request.
      const queued = await prisma.transcript.findFirst({
        where: { interviewId: interview.id },
      });
      expect(queued?.status).toBe('PENDING');

      await jobs.drain({ organizationId: orgAId });

      const stored = await prisma.transcript.findUniqueOrThrow({
        where: { id: queued!.id },
      });
      expect(stored.status).toBe('FAILED');
      expect(stored.errorMessage).toMatch(/GROQ_API_KEY is not set/);

      const segments = await prisma.transcriptSegment.findMany({
        where: { transcriptId: stored.id },
      });
      expect(segments).toHaveLength(0);
    });
  });

  describe('tenant isolation', () => {
    it('does not return another organization participant by id', async () => {
      const participantB = await participants.create(
        { displayName: `Iso ${run}` },
        userBId,
        orgBId,
      );
      await expect(
        participants.findById(participantB.id, orgAId),
      ).rejects.toThrow();
    });

    it('does not return another organization consent by id', async () => {
      const participantB = await participants.create(
        { displayName: `IsoConsent ${run}` },
        userBId,
        orgBId,
      );
      const consentB = await consents.create(
        {
          participantId: participantB.id,
          version: 'v1',
          method: 'VERBAL',
        } as any,
        userBId,
        orgBId,
      );
      await expect(consents.findById(consentB.id, orgAId)).rejects.toThrow();
    });

    it('does not return another organization interview by id', async () => {
      const participantB = await participants.create(
        { displayName: `IsoInterview ${run}` },
        userBId,
        orgBId,
      );
      const consentB = await consents.create(
        {
          participantId: participantB.id,
          version: 'v1',
          method: 'VERBAL',
        } as any,
        userBId,
        orgBId,
      );
      const interviewB = await interviews.create(
        { participantId: participantB.id, consentId: consentB.id },
        userBId,
        orgBId,
      );
      await expect(
        interviews.findById(interviewB.id, orgAId),
      ).rejects.toThrow();
    });
  });
});
