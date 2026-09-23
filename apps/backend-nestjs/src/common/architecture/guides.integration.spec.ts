/**
 * Interview guides (question sets), against the database:
 *
 *   - Editing an approved guide creates the next version; approving it
 *     archives the previous one; an interview keeps the version it used.
 *   - Only approved guides reach the field app, project-specific first.
 *   - Interviews are given the approved guide automatically, or the exact
 *     version a (possibly offline) device showed.
 *   - The question log is idempotent and the latest device mark wins.
 *   - A bad upload reports every problem and imports nothing.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { FieldService } from '../../field/field.service';
import { GuidesService } from '../../guides/guides.service';
import { InterviewsService } from '../../interviews/interviews.service';
import { ConsentsService } from '../../consents/consents.service';

const describeDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : describe.skip;

describeDb('interview guides (database)', () => {
  const prisma = new PrismaClient();
  const orgId = randomUUID();
  const userId = randomUUID();
  const tag = orgId.slice(0, 8);
  const guides = new GuidesService(prisma as any);
  const field = new FieldService(prisma as any);
  const interviews = new InterviewsService(
    prisma as any,
    new ConsentsService(prisma as any),
    {} as any,
  );
  let projectId: string;
  let otherProjectId: string;

  const guide = (title: string, extra: Record<string, unknown> = {}): any => ({
    title,
    interviewType: 'KII',
    languages: ['en', 'ha'],
    questions: [
      {
        text: { en: 'Your role?', ha: 'Matsayinka?' },
        type: 'OPEN',
        required: true,
      },
      {
        text: { en: 'Main water source?' },
        type: 'SINGLE',
        options: [{ en: 'Borehole' }, { en: 'River' }],
      },
    ],
    ...extra,
  });

  const fieldInterview = (questionSetId?: string) => ({
    interviewId: randomUUID(),
    participantId: randomUUID(),
    consentId: randomUUID(),
    projectId,
    participant: { displayName: `P ${randomUUID().slice(0, 4)}` },
    consent: {
      version: 'v1',
      method: 'VERBAL',
      allowRecording: true,
      allowTranscription: true,
      allowAiAnalysis: false,
      allowQuotation: false,
      allowPublication: false,
      capturedAt: new Date().toISOString(),
    },
    ...(questionSetId && { questionSetId }),
  });

  beforeAll(async () => {
    await prisma.organization.create({
      data: { id: orgId, name: `G ${tag}`, slug: `g-${tag}` },
    });
    await prisma.user.create({
      data: {
        id: userId,
        email: `g-${tag}@t.test`,
        passwordHash: 'x',
        firstName: 'G',
        lastName: 'U',
        organizationId: orgId,
      },
    });
    projectId = (
      await prisma.project.create({
        data: {
          name: 'Water',
          settings: { method: 'KII' },
          organizationId: orgId,
          createdById: userId,
        },
      })
    ).id;
    otherProjectId = (
      await prisma.project.create({
        data: {
          name: 'Health',
          settings: { method: 'KII' },
          organizationId: orgId,
          createdById: userId,
        },
      })
    ).id;
  });

  afterAll(async () => {
    const where = { organizationId: orgId };
    await prisma.interviewQuestionLog.deleteMany({ where });
    await prisma.interview.deleteMany({ where });
    await prisma.consent.deleteMany({ where });
    await prisma.participant.deleteMany({ where });
    await prisma.guideQuestion.deleteMany({ where: { questionSet: where } });
    await prisma.questionSet.deleteMany({ where });
    await prisma.project.deleteMany({ where });
    await prisma.user.deleteMany({ where });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it('versions an approved guide, archives the old version, and keeps interviews on theirs', async () => {
    const v1 = await guides.create(guide('Org-wide KII guide'), userId, orgId);
    expect(v1.familyId).toBe(v1.id);
    expect(v1.questions.map((q) => q.order)).toEqual([1, 2]);

    // Drafts do not reach the field.
    let projects = await field.myProjects(userId, orgId);
    expect(projects.find((p) => p.id === projectId)?.guide).toBeNull();

    await guides.approve(v1.id, userId, orgId);
    projects = await field.myProjects(userId, orgId);
    expect(projects.find((p) => p.id === projectId)?.guide?.id).toBe(v1.id);

    // An interview created now uses v1 automatically.
    const first = await field.createFieldInterview(
      fieldInterview() as any,
      userId,
      orgId,
    );
    expect(first.questionSetId).toBe(v1.id);

    // Editing the approved guide starts v2 as a draft; v1 stays approved.
    const v2 = await guides.save(
      v1.id,
      guide('Org-wide KII guide', {
        questions: [{ text: { en: 'New question' }, type: 'OPEN' }],
      }),
      userId,
      orgId,
    );
    expect(v2.version).toBe(2);
    expect(v2.status).toBe('DRAFT');
    await expect(
      guides.save(v1.id, guide('again'), userId, orgId),
    ).rejects.toThrow(/already a draft/);

    await guides.approve(v2.id, userId, orgId);
    const v1After = await prisma.questionSet.findUniqueOrThrow({
      where: { id: v1.id },
    });
    expect(v1After.status).toBe('ARCHIVED');

    // The earlier interview still points at v1 and its questions.
    const log = await interviews.questionLog(first.id, orgId);
    expect(log.guide?.id).toBe(v1.id);
    expect(log.guide?.questions).toHaveLength(2);

    // An offline device that still showed v1 keeps v1.
    const offline = await field.createFieldInterview(
      fieldInterview(v1.id) as any,
      userId,
      orgId,
    );
    expect(offline.questionSetId).toBe(v1.id);
  });

  it('prefers a guide made for the project over an organization-wide one', async () => {
    const specific = await guides.create(
      guide('Water KII guide', { projectId }),
      userId,
      orgId,
    );
    await guides.approve(specific.id, userId, orgId);
    const projects = await field.myProjects(userId, orgId);
    expect(projects.find((p) => p.id === projectId)?.guide?.id).toBe(
      specific.id,
    );
    expect(projects.find((p) => p.id === otherProjectId)?.guide?.title).toBe(
      'Org-wide KII guide',
    );

    // A second guide approved for the same project and type replaces it.
    const replacement = await guides.create(
      guide('Water KII guide, revised', { projectId }),
      userId,
      orgId,
    );
    await guides.approve(replacement.id, userId, orgId);
    const old = await prisma.questionSet.findUniqueOrThrow({
      where: { id: specific.id },
    });
    expect(old.status).toBe('ARCHIVED');
    const orgWide = await prisma.questionSet.count({
      where: { organizationId: orgId, projectId: null, status: 'APPROVED' },
    });
    expect(orgWide).toBe(1); // a different slot: untouched
  });

  it('stores question marks idempotently, latest device time winning', async () => {
    const iv = await field.createFieldInterview(
      fieldInterview() as any,
      userId,
      orgId,
    );
    const { guide: g } = await interviews.questionLog(iv.id, orgId);
    const [q1, q2] = g!.questions;
    const t = (s: number) =>
      new Date(Date.UTC(2026, 8, 24, 10, 0, s)).toISOString();

    await interviews.saveQuestionLog(
      iv.id,
      [
        {
          questionId: q1.id,
          status: 'ASKED',
          atMs: 12_000,
          recordingRef: 'rec-1',
          markedAt: t(10),
        },
        { questionId: q2.id, status: 'SKIPPED', markedAt: t(11) },
      ],
      userId,
      orgId,
    );
    // Resent (offline retry) plus an older mark that must not win.
    const after = await interviews.saveQuestionLog(
      iv.id,
      [
        {
          questionId: q1.id,
          status: 'ASKED',
          atMs: 12_000,
          recordingRef: 'rec-1',
          markedAt: t(10),
        },
        { questionId: q2.id, status: 'ASKED', markedAt: t(5) },
      ],
      userId,
      orgId,
    );
    expect(after.entries).toHaveLength(2);
    expect(after.entries.find((e) => e.questionId === q2.id)?.status).toBe(
      'SKIPPED',
    );
    expect(after.entries.find((e) => e.questionId === q1.id)?.atMs).toBe(
      12_000,
    );

    // A newer CLEAR undoes the mark.
    const cleared = await interviews.saveQuestionLog(
      iv.id,
      [{ questionId: q2.id, status: 'CLEAR', markedAt: t(20) }],
      userId,
      orgId,
    );
    expect(cleared.entries.map((e) => e.questionId)).toEqual([q1.id]);

    // Questions from another guide are refused.
    await expect(
      interviews.saveQuestionLog(
        iv.id,
        [{ questionId: randomUUID(), status: 'ASKED', markedAt: t(30) }],
        userId,
        orgId,
      ),
    ).rejects.toThrow(/not in this interview's guide/);
  });

  it('refuses an upload with problems, listing each, and imports nothing', async () => {
    const before = await prisma.questionSet.count({
      where: { organizationId: orgId },
    });
    const csv = 'question_en,type,options_en\nPick one,single,Only\n,open,\n';
    await expect(
      guides.import(
        { buffer: Buffer.from(csv), originalname: 'g.csv' } as any,
        { title: 'Bad', interviewType: 'KII' },
        userId,
        orgId,
      ),
    ).rejects.toMatchObject({ response: { errors: [{ row: 2 }, { row: 3 }] } });
    expect(
      await prisma.questionSet.count({ where: { organizationId: orgId } }),
    ).toBe(before);

    const ok = await guides.import(
      {
        buffer: Buffer.from('question_en,question_ha\nHello?,Sannu?\n'),
        originalname: 'g.csv',
      } as any,
      { title: 'Good', interviewType: 'FGD' },
      userId,
      orgId,
    );
    expect(ok.status).toBe('DRAFT');
    expect(ok.languages).toEqual(['en', 'ha']);
    expect(ok.questions[0].text).toEqual({ en: 'Hello?', ha: 'Sannu?' });
  });
});
