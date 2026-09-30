/**
 * The data half of migration 20260930100000 (enumerators and transcript
 * review) run against rows shaped like production's: existing field
 * accounts become enumerator records, completed transcripts become
 * "available for review" (not approved) with their machine text preserved
 * as revision 1, and nothing existing is altered or removed.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { provisionOrganizationRoles } from '../../auth/organization-provisioning';

const describeDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : describe.skip;

const SQL = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../prisma/migrations/20260930100000_enumerators_and_transcript_review/migration.sql',
  ),
  'utf8',
);
const DATA_SQL = SQL.slice(SQL.indexOf('-- ─── Data'));

describeDb('enumerator/review migration backfill (database)', () => {
  const prisma = new PrismaClient();
  const org = randomUUID();
  const field = randomUUID();
  const admin = randomUUID();
  const other = randomUUID();
  const ids = { done: '', processing: '', pending: '' };

  beforeAll(async () => {
    await prisma.organization.create({
      data: { id: org, name: 'Mig', slug: `mig-${org.slice(0, 8)}` },
    });
    const roles = await provisionOrganizationRoles(prisma, org);
    await prisma.user.createMany({
      data: [field, admin, other].map((id, i) => ({
        id,
        email: `${id}@t.test`,
        passwordHash: 'x',
        firstName: ['Team', 'Ad', 'Ot'][i],
        lastName: '',
        organizationId: org,
        ...(id === field && { fieldAccessCode: 'ABCD' }),
      })),
    });
    await prisma.roleUser.createMany({
      data: [
        { userId: field, roleId: roles.get('field-interviewer')! },
        { userId: admin, roleId: roles.get('administrator')! },
      ],
    });
    const project = await prisma.project.create({
      data: { name: 'P', organizationId: org, createdById: admin },
    });
    const participant = await prisma.participant.create({
      data: {
        displayName: 'R',
        organizationId: org,
        createdById: admin,
        projectId: project.id,
      },
    });
    const consent = await prisma.consent.create({
      data: {
        participantId: participant.id,
        version: 'v1',
        method: 'VERBAL',
        allowRecording: true,
        allowTranscription: true,
        allowAiAnalysis: true,
        allowQuotation: true,
        allowPublication: false,
        grantedAt: new Date(),
        organizationId: org,
        actorId: admin,
      },
    });
    const interview = await prisma.interview.create({
      data: {
        participantId: participant.id,
        consentId: consent.id,
        projectId: project.id,
        interviewerId: field,
        organizationId: org,
      },
    });
    const media = await prisma.media.create({
      data: {
        filename: 'a',
        originalName: 'a',
        mimeType: 'audio/webm',
        size: 1,
        type: 'AUDIO',
        path: `m/${randomUUID()}`,
        uploadedById: field,
        organizationId: org,
        interviewId: interview.id,
      },
    });
    const mk = async (status: 'COMPLETED' | 'PROCESSING' | 'PENDING') =>
      (
        await prisma.transcript.create({
          data: {
            status,
            organizationId: org,
            interviewId: interview.id,
            mediaId: media.id,
            requestedById: admin,
            completedAt: status === 'COMPLETED' ? new Date() : null,
          },
        })
      ).id;
    ids.done = await mk('COMPLETED');
    ids.processing = await mk('PROCESSING');
    ids.pending = await mk('PENDING');
    await prisma.transcriptSegment.createMany({
      data: [
        {
          transcriptId: ids.done,
          organizationId: org,
          index: 0,
          startMs: 0,
          endMs: 900,
          text: 'machine one',
          speakerLabel: 'S1',
          confidence: 0.7,
        },
        {
          transcriptId: ids.done,
          organizationId: org,
          index: 1,
          startMs: 900,
          endMs: 1800,
          text: 'machine two',
          editedText: 'human two',
        },
      ],
    });
    // Put the rows back as they were before the migration.
    await prisma.$executeRawUnsafe(
      `update transcripts set review_status = 'RECORDING_SUBMITTED' where organization_id = $1`,
      org,
    );
    await prisma.$executeRawUnsafe(
      `drop index if exists field_access_codes_one_active_per_user`,
    );
  });

  afterAll(async () => {
    await prisma.transcriptRevision.deleteMany({
      where: { organizationId: org },
    });
    await prisma.transcriptSegment.deleteMany({
      where: { organizationId: org },
    });
    await prisma.transcript.deleteMany({ where: { organizationId: org } });
    await prisma.media.deleteMany({ where: { organizationId: org } });
    await prisma.interview.deleteMany({ where: { organizationId: org } });
    await prisma.consent.deleteMany({ where: { organizationId: org } });
    await prisma.participant.deleteMany({ where: { organizationId: org } });
    await prisma.enumeratorProfile.deleteMany({
      where: { organizationId: org },
    });
    await prisma.project.deleteMany({ where: { organizationId: org } });
    await prisma.roleUser.deleteMany({
      where: { userId: { in: [field, admin, other] } },
    });
    await prisma.permissionRole.deleteMany({
      where: { role: { organizationId: org } },
    });
    await prisma.role.deleteMany({ where: { organizationId: org } });
    await prisma.permission.deleteMany({ where: { organizationId: org } });
    await prisma.user.deleteMany({ where: { organizationId: org } });
    await prisma.organization.deleteMany({ where: { id: org } });
    await prisma.$executeRawUnsafe(
      `create unique index if not exists field_access_codes_one_active_per_user on field_access_codes (user_id) where status = 'ACTIVE'`,
    );
    await prisma.$disconnect();
  });

  it('turns existing field accounts into enumerator records and leaves their code working', async () => {
    for (const statement of DATA_SQL.split(/;\s*\n/)
      .map((s) => s.replace(/--.*$/gm, '').trim())
      .filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
    const profiles = await prisma.enumeratorProfile.findMany({
      where: { organizationId: org },
    });
    expect(profiles.map((p) => p.userId)).toEqual([field]); // not the admin, not the plain user
    expect(profiles[0].uniqueId).toMatch(/^ENU-[0-9A-F]{6}$/);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: field } }))
        .fieldAccessCode,
    ).toBe('ABCD');
  });

  it('marks completed transcripts available for review — never approved — and keeps the machine text', async () => {
    const t = async (id: string) =>
      prisma.transcript.findUniqueOrThrow({ where: { id } });
    expect((await t(ids.done)).reviewStatus).toBe('AVAILABLE_FOR_REVIEW');
    expect((await t(ids.processing)).reviewStatus).toBe(
      'TRANSCRIPTION_PROCESSING',
    );
    expect((await t(ids.pending)).reviewStatus).toBe('RECORDING_SUBMITTED');
    expect((await t(ids.done)).approvedAt).toBeNull();

    const revs = await prisma.transcriptRevision.findMany({
      where: { transcriptId: ids.done },
    });
    expect(revs).toHaveLength(1);
    expect(revs[0]).toMatchObject({ number: 1, kind: 'MACHINE' });
    const segs = revs[0].segments as { text: string }[];
    expect(segs.map((s) => s.text)).toEqual(['machine one', 'machine two']); // machine wording, not the human edit
    expect(
      await prisma.transcriptRevision.count({
        where: { transcriptId: { in: [ids.processing, ids.pending] } },
      }),
    ).toBe(0);
  });

  it('did not touch the existing segments', async () => {
    const segs = await prisma.transcriptSegment.findMany({
      where: { transcriptId: ids.done },
      orderBy: { index: 'asc' },
    });
    expect(segs.map((s) => [s.text, s.editedText])).toEqual([
      ['machine one', null],
      ['machine two', 'human two'],
    ]);
  });
});
