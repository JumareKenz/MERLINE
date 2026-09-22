/**
 * PHASE 2 — field workflow invariants (database + object storage).
 *
 *   - Resumable recording upload: parts may arrive out of order and be
 *     re-sent; completion is idempotent; a checksum mismatch discards the
 *     upload; an incomplete upload cannot complete; and consent is enforced
 *     on every step, including a withdrawal between two parts.
 *   - Field scoping: a user whose only role is field-interviewer sees only
 *     their own interviews, and participants/consents tied to their work,
 *     and cannot assign interviews to someone else.
 *   - Tenancy: interviewerId / projectId in a request body must belong to the
 *     caller's organization.
 *   - AI Dialogue: refused without AI-analysis consent; an answer citing
 *     text that is not verbatim in the transcript, or citing nothing, is
 *     discarded rather than returned.
 *
 * Runs only with RUN_DB_TESTS=1, DATABASE_URL and AWS_ENDPOINT (MinIO).
 */
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { ParticipantsService } from '../../participants/participants.service';
import { ConsentsService } from '../../consents/consents.service';
import { InterviewsService } from '../../interviews/interviews.service';
import { MediaService } from '../../media/media.service';
import { StorageService } from '../../storage/storage.service';
import { TranscriptDialogueService } from '../../transcripts/transcript-dialogue.service';
import { OrganizationsService } from '../../organizations/organizations.service';
import { AuthService } from '../../auth/auth.service';

const shouldRun =
  process.env.RUN_DB_TESTS === '1' &&
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.AWS_ENDPOINT);

const describeDb = shouldRun ? describe : describe.skip;

describeDb('field workflow (database)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);

  const orgAId = randomUUID();
  const orgBId = randomUUID();
  const leadId = randomUUID(); // research-lead in A
  const fieldId = randomUUID(); // field-interviewer in A
  const field2Id = randomUUID(); // another field-interviewer in A
  const userBId = randomUUID(); // org B

  let participants: ParticipantsService;
  let consents: ConsentsService;
  let interviews: InterviewsService;
  let media: MediaService;

  const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

  async function interviewWith(
    allow: Partial<Record<'allowRecording' | 'allowAiAnalysis', boolean>>,
    interviewerId = leadId,
  ) {
    const participant = await participants.create(
      { displayName: `P ${randomUUID().slice(0, 6)}` },
      leadId,
      orgAId,
    );
    const consent = await consents.create(
      {
        participantId: participant.id,
        version: 'v1',
        method: 'VERBAL',
        allowRecording: false,
        ...allow,
      } as any,
      leadId,
      orgAId,
    );
    const interview = await interviews.create(
      { participantId: participant.id, consentId: consent.id, interviewerId },
      leadId,
      orgAId,
    );
    return { participant, consent, interview };
  }

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: orgAId, name: `Field A ${run}`, slug: `field-a-${run}` },
        { id: orgBId, name: `Field B ${run}`, slug: `field-b-${run}` },
      ],
    });
    const user = (id: string, org: string, tag: string) => ({
      id,
      email: `${tag}-${run}@t.test`,
      passwordHash: 'x',
      firstName: tag,
      lastName: 'U',
      organizationId: org,
    });
    await prisma.user.createMany({
      data: [
        user(leadId, orgAId, 'lead'),
        user(fieldId, orgAId, 'field'),
        user(field2Id, orgAId, 'field2'),
        user(userBId, orgBId, 'b'),
      ],
    });
    const leadRole = await prisma.role.create({
      data: {
        name: 'Research Lead',
        slug: 'research-lead',
        organizationId: orgAId,
      },
    });
    const fieldRole = await prisma.role.create({
      data: {
        name: 'Field Interviewer',
        slug: 'field-interviewer',
        organizationId: orgAId,
      },
    });
    await prisma.roleUser.createMany({
      data: [
        { userId: leadId, roleId: leadRole.id },
        { userId: fieldId, roleId: fieldRole.id },
        { userId: field2Id, roleId: fieldRole.id },
      ],
    });

    participants = new ParticipantsService(prisma as any);
    consents = new ConsentsService(prisma as any);
    const storage = new StorageService(
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
    media = new MediaService(prisma as any, storage);
    interviews = new InterviewsService(prisma as any, consents, media);
  }, 60_000);

  afterAll(async () => {
    const orgs = { organizationId: { in: [orgAId, orgBId] } };
    await prisma.transcriptSegment.deleteMany({ where: orgs });
    await prisma.transcript.deleteMany({ where: orgs });
    await prisma.mediaChunk.deleteMany({
      where: { uploadedById: { in: [leadId, fieldId, field2Id, userBId] } },
    });
    await prisma.media.deleteMany({ where: orgs });
    await prisma.interview.deleteMany({ where: orgs });
    await prisma.consent.deleteMany({ where: orgs });
    await prisma.participant.deleteMany({ where: orgs });
    await prisma.roleUser.deleteMany({
      where: { userId: { in: [leadId, fieldId, field2Id] } },
    });
    await prisma.permissionRole.deleteMany({ where: { role: orgs } });
    await prisma.permission.deleteMany({ where: orgs });
    await prisma.role.deleteMany({ where: orgs });
    await prisma.project.deleteMany({ where: orgs });
    await prisma.user.deleteMany({ where: orgs });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgAId, orgBId] } },
    });
    await prisma.$disconnect();
  });

  describe('resumable recording upload', () => {
    it('assembles out-of-order, re-sent parts and completes idempotently', async () => {
      const { interview } = await interviewWith(
        { allowRecording: true },
        fieldId,
      );
      const uploadId = randomUUID();
      const parts = [
        Buffer.alloc(700, 1),
        Buffer.alloc(700, 2),
        Buffer.alloc(123, 3),
      ];
      const whole = Buffer.concat(parts);

      await interviews.putRecordingPart(
        interview.id,
        uploadId,
        2,
        parts[2],
        fieldId,
        orgAId,
      );
      await interviews.putRecordingPart(
        interview.id,
        uploadId,
        0,
        parts[0],
        fieldId,
        orgAId,
      );
      // A retry of part 0 after a dropped response must not duplicate it.
      await interviews.putRecordingPart(
        interview.id,
        uploadId,
        0,
        parts[0],
        fieldId,
        orgAId,
      );

      const partial = await interviews.getRecordingUploadStatus(
        interview.id,
        uploadId,
        fieldId,
        orgAId,
      );
      expect(partial.receivedParts).toEqual([0, 2]);

      await interviews.putRecordingPart(
        interview.id,
        uploadId,
        1,
        parts[1],
        fieldId,
        orgAId,
      );

      const options = {
        totalParts: 3,
        mimeType: 'audio/webm;codecs=opus',
        originalName: 'field.webm',
        checksum: sha256(whole),
        durationMs: 4200,
      };
      const first = await interviews.completeRecordingUpload(
        interview.id,
        uploadId,
        options,
        fieldId,
        orgAId,
      );
      expect(first.interviewId).toBe(interview.id);
      expect(first.size).toBe(whole.length);
      expect(first.checksum).toBe(sha256(whole));
      expect(first.type).toBe('AUDIO');

      const again = await interviews.completeRecordingUpload(
        interview.id,
        uploadId,
        options,
        fieldId,
        orgAId,
      );
      expect(again.id).toBe(first.id);

      const status = await interviews.getRecordingUploadStatus(
        interview.id,
        uploadId,
        fieldId,
        orgAId,
      );
      expect(status.completed?.id).toBe(first.id);
      expect(
        await prisma.media.count({ where: { interviewId: interview.id } }),
      ).toBe(1);
    });

    it('refuses to complete while a part is missing', async () => {
      const { interview } = await interviewWith({ allowRecording: true });
      const uploadId = randomUUID();
      await interviews.putRecordingPart(
        interview.id,
        uploadId,
        0,
        Buffer.alloc(10, 1),
        leadId,
        orgAId,
      );

      await expect(
        interviews.completeRecordingUpload(
          interview.id,
          uploadId,
          { totalParts: 2, mimeType: 'audio/webm', originalName: 'a.webm' },
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/missing part/i);
    });

    it('discards the upload on a checksum mismatch', async () => {
      const { interview } = await interviewWith({ allowRecording: true });
      const uploadId = randomUUID();
      await interviews.putRecordingPart(
        interview.id,
        uploadId,
        0,
        Buffer.alloc(64, 9),
        leadId,
        orgAId,
      );

      await expect(
        interviews.completeRecordingUpload(
          interview.id,
          uploadId,
          {
            totalParts: 1,
            mimeType: 'audio/webm',
            originalName: 'a.webm',
            checksum: 'a'.repeat(64),
          },
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/checksum mismatch/i);

      const status = await interviews.getRecordingUploadStatus(
        interview.id,
        uploadId,
        leadId,
        orgAId,
      );
      expect(status.receivedParts).toEqual([]);
      expect(status.completed).toBeNull();
    });

    it('refuses a non-audio type on completion', async () => {
      const { interview } = await interviewWith({ allowRecording: true });
      const uploadId = randomUUID();
      await interviews.putRecordingPart(
        interview.id,
        uploadId,
        0,
        Buffer.alloc(8, 1),
        leadId,
        orgAId,
      );
      await expect(
        interviews.completeRecordingUpload(
          interview.id,
          uploadId,
          { totalParts: 1, mimeType: 'application/pdf', originalName: 'a.pdf' },
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/not an accepted audio format/i);
    });

    it('stores no bytes when consent does not permit recording', async () => {
      const { interview } = await interviewWith({ allowRecording: false });
      const uploadId = randomUUID();

      await expect(
        interviews.getRecordingUploadStatus(
          interview.id,
          uploadId,
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/does not permit recording/i);
      await expect(
        interviews.putRecordingPart(
          interview.id,
          uploadId,
          0,
          Buffer.alloc(8, 1),
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/does not permit recording/i);
      expect(await media.listRecordingParts(uploadId, leadId)).toEqual([]);
    });

    it('stops at the next part when consent is withdrawn mid-upload', async () => {
      const { interview, consent } = await interviewWith({
        allowRecording: true,
      });
      const uploadId = randomUUID();
      await interviews.putRecordingPart(
        interview.id,
        uploadId,
        0,
        Buffer.alloc(8, 1),
        leadId,
        orgAId,
      );

      await consents.withdraw(consent.id, leadId, orgAId);

      await expect(
        interviews.putRecordingPart(
          interview.id,
          uploadId,
          1,
          Buffer.alloc(8, 1),
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/withdrawn/i);
      await expect(
        interviews.completeRecordingUpload(
          interview.id,
          uploadId,
          { totalParts: 1, mimeType: 'audio/webm', originalName: 'a.webm' },
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/withdrawn/i);
    });

    it("does not let one user see or complete another user's parts", async () => {
      const { interview } = await interviewWith({ allowRecording: true });
      const uploadId = randomUUID();
      await interviews.putRecordingPart(
        interview.id,
        uploadId,
        0,
        Buffer.alloc(8, 1),
        leadId,
        orgAId,
      );

      expect(await media.listRecordingParts(uploadId, field2Id)).toEqual([]);
    });
  });

  describe('field scoping', () => {
    it('lists only interviews assigned to the field interviewer', async () => {
      const mine = await interviewWith({ allowRecording: true }, fieldId);
      const theirs = await interviewWith({ allowRecording: true }, field2Id);

      const visible = await interviews.findAll(orgAId, {}, fieldId);
      const ids = visible.map((i) => i.id);
      expect(ids).toContain(mine.interview.id);
      expect(ids).not.toContain(theirs.interview.id);

      // A filter cannot widen the scope.
      const widened = await interviews.findAll(
        orgAId,
        { interviewerId: field2Id },
        fieldId,
      );
      expect(widened.map((i) => i.id)).not.toContain(theirs.interview.id);

      // A research lead still sees both.
      const all = (await interviews.findAll(orgAId, {}, leadId)).map(
        (i) => i.id,
      );
      expect(all).toEqual(
        expect.arrayContaining([mine.interview.id, theirs.interview.id]),
      );
    });

    it("hides another field worker's interview, participant, consent and recording upload", async () => {
      const theirs = await interviewWith({ allowRecording: true }, field2Id);

      await expect(
        interviews.findById(theirs.interview.id, orgAId, fieldId),
      ).rejects.toThrow(/not found/i);
      await expect(
        participants.findById(theirs.participant.id, orgAId, fieldId),
      ).rejects.toThrow(/not found/i);
      await expect(
        consents.findById(theirs.consent.id, orgAId, fieldId),
      ).rejects.toThrow(/not found/i);
      await expect(
        interviews.putRecordingPart(
          theirs.interview.id,
          randomUUID(),
          0,
          Buffer.alloc(4, 1),
          fieldId,
          orgAId,
        ),
      ).rejects.toThrow(/not found/i);
      await expect(
        consents.create(
          {
            participantId: theirs.participant.id,
            version: 'v2',
            method: 'VERBAL',
          } as any,
          fieldId,
          orgAId,
        ),
      ).rejects.toThrow(/not found/i);

      const listed = (
        await participants.findAll(orgAId, undefined, fieldId)
      ).map((p) => p.id);
      expect(listed).not.toContain(theirs.participant.id);
    });

    it('sees participants they registered, and their consents', async () => {
      const own = await participants.create(
        { displayName: `Own ${run}` },
        fieldId,
        orgAId,
      );
      const consent = await consents.create(
        { participantId: own.id, version: 'v1', method: 'VERBAL' } as any,
        fieldId,
        orgAId,
      );
      expect((await participants.findById(own.id, orgAId, fieldId)).id).toBe(
        own.id,
      );
      expect((await consents.findById(consent.id, orgAId, fieldId)).id).toBe(
        consent.id,
      );
    });

    it('cannot assign an interview to someone else', async () => {
      const own = await participants.create(
        { displayName: `Own2 ${run}` },
        fieldId,
        orgAId,
      );
      const consent = await consents.create(
        { participantId: own.id, version: 'v1', method: 'VERBAL' } as any,
        fieldId,
        orgAId,
      );
      await expect(
        interviews.create(
          {
            participantId: own.id,
            consentId: consent.id,
            interviewerId: field2Id,
          },
          fieldId,
          orgAId,
        ),
      ).rejects.toThrow(/assigned to themselves/i);

      const created = await interviews.create(
        { participantId: own.id, consentId: consent.id },
        fieldId,
        orgAId,
      );
      expect(created.interviewerId).toBe(fieldId);
    });
  });

  describe('request-body tenancy', () => {
    it('rejects an interviewer from another organization', async () => {
      const p = await participants.create(
        { displayName: `T1 ${run}` },
        leadId,
        orgAId,
      );
      const c = await consents.create(
        { participantId: p.id, version: 'v1', method: 'VERBAL' } as any,
        leadId,
        orgAId,
      );
      await expect(
        interviews.create(
          { participantId: p.id, consentId: c.id, interviewerId: userBId },
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/interviewer not found/i);
    });

    it('rejects a project from another organization', async () => {
      const foreign = await prisma.project.create({
        data: {
          name: `B ${run}`,
          organizationId: orgBId,
          createdById: userBId,
        },
      });
      const p = await participants.create(
        { displayName: `T2 ${run}` },
        leadId,
        orgAId,
      );
      const c = await consents.create(
        { participantId: p.id, version: 'v1', method: 'VERBAL' } as any,
        leadId,
        orgAId,
      );
      await expect(
        interviews.create(
          { participantId: p.id, consentId: c.id, projectId: foreign.id },
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/project not found/i);
      await expect(
        participants.create(
          { displayName: 'x', projectId: foreign.id },
          leadId,
          orgAId,
        ),
      ).rejects.toThrow(/project not found/i);
    });
  });

  describe('assignment and membership', () => {
    it('lists assignable interviewers from the caller’s organization only, flagged by role', async () => {
      const list = await interviews.listAssignableInterviewers(orgAId);
      const ids = list.map((u) => u.id);
      expect(ids).toEqual(expect.arrayContaining([leadId, fieldId, field2Id]));
      expect(ids).not.toContain(userBId);
      expect(list.find((u) => u.id === fieldId)?.isFieldInterviewer).toBe(true);
      expect(list.find((u) => u.id === leadId)?.isFieldInterviewer).toBe(false);
      expect(Object.keys(list[0]).sort()).toEqual([
        'firstName',
        'id',
        'isFieldInterviewer',
        'lastName',
      ]);
    });

    it('refuses to assign a role belonging to another organization', async () => {
      const foreignRole = await prisma.role.create({
        data: {
          name: 'Admin B',
          slug: `admin-b-${run}`,
          organizationId: orgBId,
        },
      });
      const orgs = new OrganizationsService(prisma as any);
      await expect(
        orgs.updateMemberRole(orgAId, fieldId, foreignRole.id),
      ).rejects.toThrow(/role not found/i);
    });

    it('reports effective permissions on /auth/me from own-organization roles only', async () => {
      const perm = await prisma.permission.create({
        data: {
          slug: 'view.interviews',
          name: 'View Interviews',
          module: 'interviews',
          organizationId: orgAId,
        },
      });
      const fieldRole = await prisma.role.findFirstOrThrow({
        where: { organizationId: orgAId, slug: 'field-interviewer' },
      });
      await prisma.permissionRole.create({
        data: { roleId: fieldRole.id, permissionId: perm.id },
      });
      const auth = new AuthService(prisma as any, {} as any, {} as any);
      const profile = await auth.getProfile(fieldId);
      expect(profile.permissions).toEqual(['view.interviews']);
      expect(profile.roles.map((r) => r.slug)).toEqual(['field-interviewer']);
      await prisma.permissionRole.deleteMany({
        where: { roleId: fieldRole.id },
      });
    });
  });

  describe('AI dialogue grounding', () => {
    async function transcriptFor(allowAiAnalysis: boolean) {
      const { interview } = await interviewWith({
        allowRecording: true,
        allowAiAnalysis,
      });
      const m = await prisma.media.create({
        data: {
          filename: 'x.webm',
          originalName: 'x.webm',
          mimeType: 'audio/webm',
          size: 1,
          type: 'AUDIO',
          path: `test/${randomUUID()}`,
          uploadedById: leadId,
          organizationId: orgAId,
          interviewId: interview.id,
        },
      });
      return prisma.transcript.create({
        data: {
          status: 'COMPLETED',
          organizationId: orgAId,
          interviewId: interview.id,
          mediaId: m.id,
          requestedById: leadId,
          segments: {
            create: [
              {
                index: 0,
                startMs: 0,
                endMs: 4000,
                text: 'The clinic is too far to walk to.',
                organizationId: orgAId,
              },
              {
                index: 1,
                startMs: 4000,
                endMs: 9000,
                text: 'We wait most of the day for a nurse.',
                organizationId: orgAId,
              },
            ],
          },
        },
      });
    }

    function dialogueWith(reply: object) {
      const gateway = {
        sendMessage: jest.fn().mockResolvedValue({
          content: JSON.stringify(reply),
          provider: 'test',
          model: 'test-model',
        }),
      };
      return {
        gateway,
        service: new TranscriptDialogueService(
          prisma as any,
          consents,
          gateway as any,
        ),
      };
    }

    it('refuses without AI-analysis consent, before calling a provider', async () => {
      const t = await transcriptFor(false);
      const { service, gateway } = dialogueWith({ answer: 'x', citations: [] });
      await expect(
        service.ask(t.id, 'What are the barriers?', orgAId),
      ).rejects.toThrow(/does not permit AI analysis/i);
      expect(gateway.sendMessage).not.toHaveBeenCalled();
    });

    it('returns verbatim, resolved citations', async () => {
      const t = await transcriptFor(true);
      const { service } = dialogueWith({
        answer: 'Distance and waiting times.',
        citations: [
          { segmentIndex: 0, excerpt: 'too far to walk' },
          { segmentIndex: 1, excerpt: 'wait most of the day' },
        ],
      });
      const result = await service.ask(t.id, 'What are the barriers?', orgAId);
      expect(result.citations).toHaveLength(2);
      expect(result.citations[1]).toMatchObject({
        segmentIndex: 1,
        startMs: 4000,
      });
    });

    it('discards an answer quoting text that is not in the segment', async () => {
      const t = await transcriptFor(true);
      const { service } = dialogueWith({
        answer: 'Cost.',
        citations: [{ segmentIndex: 0, excerpt: 'too expensive' }],
      });
      await expect(service.ask(t.id, 'Barriers?', orgAId)).rejects.toThrow(
        /does not appear/i,
      );
    });

    it('discards an answer that cites nothing', async () => {
      const t = await transcriptFor(true);
      const { service } = dialogueWith({ answer: 'Distance.', citations: [] });
      await expect(service.ask(t.id, 'Barriers?', orgAId)).rejects.toThrow(
        /cited no transcript evidence/i,
      );
    });

    it('passes through an explicit insufficient-evidence answer', async () => {
      const t = await transcriptFor(true);
      const { service } = dialogueWith({
        answer: 'The transcript does not discuss cost.',
        insufficientEvidence: true,
        citations: [],
      });
      const result = await service.ask(t.id, 'What about cost?', orgAId);
      expect(result.insufficientEvidence).toBe(true);
      expect(result.citations).toEqual([]);
    });

    it('does not answer about another organization’s transcript', async () => {
      const t = await transcriptFor(true);
      const { service } = dialogueWith({ answer: 'x', citations: [] });
      await expect(service.ask(t.id, 'Barriers?', orgBId)).rejects.toThrow(
        /not found/i,
      );
    });
  });
});
