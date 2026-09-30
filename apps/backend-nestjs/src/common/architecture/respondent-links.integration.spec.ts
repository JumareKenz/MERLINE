/**
 * Self-interview links (database + object storage):
 *
 *   - A link can only pin a guide that was approved, for its project.
 *   - A respondent with no account starts once (idempotently), and every
 *     later call needs the session secret their device made.
 *   - What they create is an ordinary participant + DIGITAL consent (with
 *     the exact text they saw) + interview, so the consent gate applies:
 *     no recording without permission, and a withdrawal stops uploads.
 *   - Upload parts are isolated per session; completion attributes the
 *     recording to the link's creator and queues transcription.
 *   - Every question is open: a respondent is never shown answer options,
 *     even for a guide that once held choices; a stale page's choices are
 *     accepted but not stored.
 *   - Closing, expiry, response limits and a regenerated URL are honoured.
 *   - Everything admin-side is tenant-scoped.
 *
 * Runs only with RUN_DB_TESTS=1, DATABASE_URL and AWS_ENDPOINT (MinIO).
 */
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { GuidesService } from '../../guides/guides.service';
import { MediaService } from '../../media/media.service';
import { StorageService } from '../../storage/storage.service';
import { RespondentLinksService } from '../../respondent-links/respondent-links.service';
import { RespondService } from '../../respondent-links/respond.service';

const shouldRun =
  process.env.RUN_DB_TESTS === '1' &&
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.AWS_ENDPOINT);

const describeDb = shouldRun ? describe : describe.skip;

describeDb('self-interview links (database)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();

  let guides: GuidesService;
  let links: RespondentLinksService;
  let respond: RespondService;
  let projectId: string;
  let otherProjectId: string;
  let approvedGuideId: string;
  let openQuestionId: string;
  let secondQuestionId: string;
  let thirdQuestionId: string;

  const secret = () => randomBytes(24).toString('base64url');
  const consent = (over: Record<string, boolean> = {}) => ({
    allowRecording: true,
    allowTranscription: true,
    allowAiAnalysis: true,
    allowQuotation: false,
    allowPublication: false,
    ...over,
  });

  async function newLink(extra: Record<string, unknown> = {}) {
    return links.create(
      {
        projectId,
        questionSetId: approvedGuideId,
        title: 'Water governance KII',
        ...extra,
      } as any,
      userId,
      orgId,
    );
  }

  async function startSession(
    token: string,
    over: Record<string, unknown> = {},
  ) {
    const s = { sessionId: randomUUID(), secret: secret() };
    const res = await respond.start(
      token,
      {
        ...s,
        respondent: { name: 'Amina Bello', role: 'Ward head' },
        consent: consent(),
        ...over,
      } as any,
      'jest',
    );
    return { ...s, res };
  }

  async function uploadRecording(
    token: string,
    s: { sessionId: string; secret: string },
    uploadId = randomUUID(),
  ) {
    const parts = [randomBytes(1000), randomBytes(700)];
    for (const [i, p] of parts.entries())
      await respond.putPart(token, s.sessionId, s.secret, uploadId, i, p);
    const media = await respond.completeUpload(
      token,
      s.sessionId,
      s.secret,
      uploadId,
      { totalParts: 2, mimeType: 'audio/webm;codecs=opus', durationMs: 4200 },
    );
    return { uploadId, media };
  }

  beforeAll(async () => {
    await prisma.organization.createMany({
      data: [
        { id: orgId, name: `Links ${run}`, slug: `links-${run}` },
        { id: otherOrgId, name: `Other ${run}`, slug: `links-o-${run}` },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: userId,
          email: `links-${run}@t.test`,
          passwordHash: 'x',
          firstName: 'Lead',
          lastName: 'U',
          organizationId: orgId,
        },
        {
          id: otherUserId,
          email: `links-o-${run}@t.test`,
          passwordHash: 'x',
          firstName: 'Other',
          lastName: 'U',
          organizationId: otherOrgId,
        },
      ],
    });
    const project = (name: string) =>
      prisma.project.create({
        data: {
          name,
          settings: { method: 'KII' },
          organizationId: orgId,
          createdById: userId,
        },
      });
    projectId = (await project('Water')).id;
    otherProjectId = (await project('Health')).id;

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
    guides = new GuidesService(prisma as any);
    links = new RespondentLinksService(prisma as any);
    respond = new RespondService(
      prisma as any,
      new MediaService(prisma as any, storage),
    );

    const g = await guides.create(
      {
        title: 'KII guide',
        interviewType: 'KII',
        projectId,
        languages: ['en', 'ha'],
        questions: [
          {
            text: { en: 'Describe your role.', ha: 'Bayyana matsayinka.' },
            type: 'OPEN',
            probes: { en: 'Ask about years in post' },
          },
          { text: { en: 'How does your household get water?' } },
          { text: { en: 'What would you change about it?' }, type: 'OPEN' },
        ],
      } as any,
      userId,
      orgId,
    );
    await guides.approve(g.id, userId, orgId);
    approvedGuideId = g.id;
    [openQuestionId, secondQuestionId, thirdQuestionId] = g.questions.map(
      (q) => q.id,
    );
  }, 60_000);

  afterAll(async () => {
    const orgs = { organizationId: { in: [orgId, otherOrgId] } };
    const sessions = await prisma.respondentSession.findMany({
      where: orgs,
      select: { id: true },
    });
    await prisma.mediaChunk.deleteMany({
      where: {
        uploadedById: { in: sessions.map((s) => `respondent-${s.id}`) },
      },
    });
    await prisma.job.deleteMany({ where: orgs });
    await prisma.transcriptReviewEvent.deleteMany({ where: orgs });
    await prisma.transcriptRevision.deleteMany({ where: orgs });
    await prisma.transcript.deleteMany({ where: orgs });
    await prisma.respondentSession.deleteMany({ where: orgs });
    await prisma.interviewQuestionLog.deleteMany({ where: orgs });
    await prisma.media.deleteMany({ where: orgs });
    await prisma.interview.deleteMany({ where: orgs });
    await prisma.consent.deleteMany({ where: orgs });
    await prisma.participant.deleteMany({ where: orgs });
    await prisma.respondentLink.deleteMany({ where: orgs });
    await prisma.guideQuestion.deleteMany({ where: { questionSet: orgs } });
    await prisma.questionSet.deleteMany({ where: orgs });
    await prisma.project.deleteMany({ where: orgs });
    await prisma.user.deleteMany({ where: orgs });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgId, otherOrgId] } },
    });
    await prisma.$disconnect();
  });

  it('pins only an approved guide belonging to the project', async () => {
    const draft = await guides.create(
      {
        title: 'Draft',
        interviewType: 'KII',
        languages: ['en'],
        questions: [{ text: { en: 'Q?' }, type: 'OPEN' }],
      } as any,
      userId,
      orgId,
    );
    await expect(newLink({ questionSetId: draft.id })).rejects.toThrow(
      /Approve the guide/,
    );
    await expect(
      links.create(
        {
          projectId: otherProjectId,
          questionSetId: approvedGuideId,
          title: 'x',
        } as any,
        userId,
        orgId,
      ),
    ).rejects.toThrow(/another project/);
    await expect(
      newLink({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
    ).rejects.toThrow(/future/);

    const link = await newLink();
    expect(link.token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(link.state).toBe('open');
    expect(link.consentText).toMatch(/voluntary/);
  });

  it('shows the respondent the questions without interviewer probes', async () => {
    const link = await newLink();
    const view = await respond.getLink(link.token);
    expect(view.state).toBe('open');
    expect(view.projectName).toBe('Water');
    expect(view.languages).toEqual(['en', 'ha']);
    expect(view.guide.questions).toHaveLength(3);
    expect(view.guide.questions[0]).not.toHaveProperty('probes');
    await expect(respond.getLink('not-a-real-token')).rejects.toThrow(
      /not valid/,
    );
  });

  it('starts idempotently and creates an ordinary participant, DIGITAL consent and interview', async () => {
    const link = await newLink();
    await expect(
      startSession(link.token, { consent: consent({ allowRecording: false }) }),
    ).rejects.toThrow(/permission to record/);

    const s = await startSession(link.token);
    expect(s.res.finished).toBe(false);

    // Same id + same secret: the same session, nothing duplicated.
    const again = await respond.start(
      link.token,
      {
        sessionId: s.sessionId,
        secret: s.secret,
        respondent: { name: 'Amina Bello' },
        consent: consent(),
      } as any,
      'jest',
    );
    expect(again.sessionId).toBe(s.sessionId);
    // Same id, different secret: refused.
    await expect(
      respond.start(
        link.token,
        {
          sessionId: s.sessionId,
          secret: secret(),
          respondent: { name: 'X' },
          consent: consent(),
        } as any,
        'jest',
      ),
    ).rejects.toThrow(/already in use/);

    const session = await prisma.respondentSession.findUniqueOrThrow({
      where: { id: s.sessionId },
      include: {
        interview: { include: { consent: true, participant: true } },
      },
    });
    expect(session.secretHash).not.toContain(s.secret);
    const i = session.interview;
    expect(i.organizationId).toBe(orgId);
    expect(i.respondentLinkId).toBe(link.id);
    expect(i.questionSetId).toBe(approvedGuideId);
    expect(i.interviewerId).toBe(userId);
    expect(i.type).toBe('KII');
    expect(i.status).toBe('IN_PROGRESS');
    expect(i.consent.method).toBe('DIGITAL');
    expect(i.consent.allowAiAnalysis).toBe(true);
    expect((i.consent.metadata as any).consentText).toBe(link.consentText);
    expect(i.participant.displayName).toBe('Amina Bello');
    expect((i.participant.metadata as any).role).toBe('Ward head');
    expect(
      await prisma.interview.count({ where: { respondentLinkId: link.id } }),
    ).toBe(1);
  });

  it('refuses calls without the right session secret or link', async () => {
    const link = await newLink();
    const other = await newLink();
    const s = await startSession(link.token);
    await expect(
      respond.state(link.token, s.sessionId, secret()),
    ).rejects.toThrow(/not valid/);
    await expect(
      respond.state(other.token, s.sessionId, s.secret),
    ).rejects.toThrow(/not valid/);
    await expect(respond.state(link.token, s.sessionId, '')).rejects.toThrow();
    await expect(
      respond.state(link.token, s.sessionId, s.secret),
    ).resolves.toMatchObject({ sessionId: s.sessionId });
  });

  it('stores the recording from session-isolated parts and queues transcription', async () => {
    const link = await newLink();
    const s = await startSession(link.token);
    const { uploadId, media } = await uploadRecording(link.token, s);

    const stored = await prisma.media.findUniqueOrThrow({
      where: { id: media.id },
    });
    expect(stored.uploadedById).toBe(userId);
    expect(stored.size).toBe(1700);
    expect(stored.mimeType).toBe('audio/webm');
    expect((stored.metadata as any).source).toBe('self-interview-link');
    expect((stored.metadata as any).uploadId).toBe(uploadId);

    // Completion is idempotent.
    const again = await respond.completeUpload(
      link.token,
      s.sessionId,
      s.secret,
      uploadId,
      { totalParts: 2, mimeType: 'audio/webm' },
    );
    expect(again.id).toBe(media.id);
    expect(
      await prisma.transcript.count({ where: { mediaId: media.id } }),
    ).toBe(1);

    // Another session cannot see or add to this upload.
    const s2 = await startSession(link.token);
    const status = await respond.uploadStatus(
      link.token,
      s2.sessionId,
      s2.secret,
      uploadId,
    );
    expect(status.completed).toBeNull();
    expect(status.receivedParts).toEqual([]);

    const state = await respond.state(link.token, s.sessionId, s.secret);
    expect(state.completedUploads).toEqual([uploadId]);
  });

  it('limits how many recordings one session may start', async () => {
    const link = await newLink();
    const s = await startSession(link.token);
    for (let i = 0; i < 5; i++)
      await respond.uploadStatus(
        link.token,
        s.sessionId,
        s.secret,
        randomUUID(),
      );
    await expect(
      respond.uploadStatus(link.token, s.sessionId, s.secret, randomUUID()),
    ).rejects.toThrow(/Too many recordings/);
  });

  it('stops uploads once consent is withdrawn', async () => {
    const link = await newLink();
    const s = await startSession(link.token);
    const uploadId = randomUUID();
    await respond.putPart(
      link.token,
      s.sessionId,
      s.secret,
      uploadId,
      0,
      randomBytes(10),
    );
    const session = await prisma.respondentSession.findUniqueOrThrow({
      where: { id: s.sessionId },
      include: { interview: true },
    });
    await prisma.consent.update({
      where: { id: session.interview.consentId },
      data: { withdrawnAt: new Date() },
    });
    await expect(
      respond.putPart(
        link.token,
        s.sessionId,
        s.secret,
        uploadId,
        1,
        randomBytes(10),
      ),
    ).rejects.toThrow(/withdrawn/);
  });

  it('keeps the latest mark per question and stores no chosen answers', async () => {
    const link = await newLink();
    const s = await startSession(link.token);
    const t = (ms: number) => new Date(Date.now() + ms).toISOString();

    await expect(
      respond.saveAnswers(link.token, s.sessionId, s.secret, [
        { questionId: randomUUID(), status: 'ASKED', markedAt: t(0) },
      ] as any),
    ).rejects.toThrow(/not part of this interview/);

    await respond.saveAnswers(link.token, s.sessionId, s.secret, [
      { questionId: openQuestionId, status: 'ASKED', atMs: 0, markedAt: t(0) },
      {
        questionId: secondQuestionId,
        status: 'ASKED',
        atMs: 30_000,
        markedAt: t(1),
      },
      { questionId: thirdQuestionId, status: 'SKIPPED', markedAt: t(2) },
    ] as any);
    // An older mark arriving late does not undo a newer one.
    await respond.saveAnswers(link.token, s.sessionId, s.secret, [
      {
        questionId: secondQuestionId,
        status: 'ASKED',
        atMs: 5_000,
        markedAt: t(-60_000),
      },
    ] as any);
    // A page opened before choices were removed may still send them: the
    // batch is accepted, and the choice is not stored.
    await respond.saveAnswers(link.token, s.sessionId, s.secret, [
      {
        questionId: openQuestionId,
        status: 'ASKED',
        atMs: 0,
        selected: [1],
        value: 3,
        markedAt: t(3),
      },
    ] as any);

    const session = await prisma.respondentSession.findUniqueOrThrow({
      where: { id: s.sessionId },
    });
    const log = await prisma.interviewQuestionLog.findMany({
      where: { interviewId: session.interviewId },
    });
    expect(log.find((l) => l.questionId === secondQuestionId)!.atMs).toBe(
      30_000,
    );
    expect(log.find((l) => l.questionId === thirdQuestionId)!.status).toBe(
      'SKIPPED',
    );
    expect(log).toHaveLength(3);
    expect(log.every((l) => l.answer === null)).toBe(true);
  });

  it('shows a respondent open questions only, even for a guide that once had choices', async () => {
    // A guide written before the rule: a choice and a scale in the database.
    const old = await guides.create(
      {
        title: 'Older KII guide',
        interviewType: 'KII',
        projectId,
        languages: ['en'],
        linkOnly: true,
        questions: [
          { text: { en: 'Your role?' } },
          { text: { en: 'Source?' } },
        ],
      } as any,
      userId,
      orgId,
    );
    await prisma.guideQuestion.updateMany({
      where: { questionSetId: old.id, order: 2 },
      data: { type: 'SINGLE', options: [{ en: 'Borehole' }, { en: 'River' }] },
    });
    await prisma.guideQuestion.create({
      data: {
        questionSetId: old.id,
        order: 3,
        text: { en: 'How satisfied?' },
        type: 'SCALE',
        scaleMin: 1,
        scaleMax: 5,
      },
    });
    await guides.approve(old.id, userId, orgId);
    const link = await newLink({ questionSetId: old.id });

    const view = await respond.getLink(link.token);
    expect(view.guide.questions).toHaveLength(3);
    for (const q of view.guide.questions) {
      expect(q.type).toBe('OPEN');
      expect(q).not.toHaveProperty('options');
      expect(q).not.toHaveProperty('scaleMin');
      expect(q).not.toHaveProperty('scaleMax');
    }
    expect(JSON.stringify(view)).not.toMatch(/Borehole|River/);
  });

  it('finishes only with a stored recording, then accepts nothing more', async () => {
    const link = await newLink();
    const s = await startSession(link.token);
    await expect(
      respond.finish(link.token, s.sessionId, s.secret),
    ).rejects.toThrow(/not finished uploading/);
    await uploadRecording(link.token, s);
    await respond.finish(link.token, s.sessionId, s.secret);
    await respond.finish(link.token, s.sessionId, s.secret); // idempotent

    const session = await prisma.respondentSession.findUniqueOrThrow({
      where: { id: s.sessionId },
      include: { interview: true },
    });
    expect(session.finishedAt).not.toBeNull();
    expect(session.interview.status).toBe('COMPLETED');
    await expect(
      respond.putPart(
        link.token,
        s.sessionId,
        s.secret,
        randomUUID(),
        0,
        randomBytes(5),
      ),
    ).rejects.toThrow(/already submitted/);
    expect((await links.findById(link.id, orgId)).responses).toEqual({
      started: 1,
      completed: 1,
    });
  });

  it('honours a one-response limit, closing, expiry and a regenerated URL', async () => {
    const single = await newLink({
      maxResponses: 1,
      respondentName: 'Dr Musa',
    });
    expect((await respond.getLink(single.token)).respondentName).toBe(
      'Dr Musa',
    );
    const s = await startSession(single.token);
    await uploadRecording(single.token, s);
    await respond.finish(single.token, s.sessionId, s.secret);
    expect((await respond.getLink(single.token)).state).toBe('full');
    await expect(startSession(single.token)).rejects.toThrow(
      /already been used/,
    );

    const link = await newLink();
    const inProgress = await startSession(link.token);
    await links.close(link.id, orgId);
    expect((await respond.getLink(link.token)).state).toBe('closed');
    await expect(startSession(link.token)).rejects.toThrow(/closed/);
    // Someone already answering can still finish.
    await uploadRecording(link.token, inProgress);
    await respond.finish(link.token, inProgress.sessionId, inProgress.secret);
    await links.reopen(link.id, orgId);
    expect((await respond.getLink(link.token)).state).toBe('open');

    await prisma.respondentLink.update({
      where: { id: link.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await respond.getLink(link.token)).state).toBe('expired');

    const fresh = await newLink();
    const rotated = await links.regenerateToken(fresh.id, orgId);
    expect(rotated.token).not.toBe(fresh.token);
    await expect(respond.getLink(fresh.token)).rejects.toThrow(/not valid/);
    await expect(respond.getLink(rotated.token)).resolves.toBeTruthy();
  });

  it('keeps a link-only guide away from field teams in both directions', async () => {
    const qs = (title: string, linkOnly = false) =>
      guides.create(
        {
          title,
          interviewType: 'KII',
          projectId: otherProjectId,
          languages: ['en'],
          linkOnly,
          questions: [{ text: { en: `${title}?` }, type: 'OPEN' }],
        } as any,
        userId,
        orgId,
      );
    const field = await qs('Field KII');
    await guides.approve(field.id, userId, orgId);

    // Approving questions made for a link leaves the field guide in place.
    const forLink = await qs('Link KII', true);
    await guides.approve(forLink.id, userId, orgId);
    const status = async (id: string) =>
      (await prisma.questionSet.findUniqueOrThrow({ where: { id } })).status;
    expect(await status(field.id)).toBe('APPROVED');
    expect(await status(forLink.id)).toBe('APPROVED');
    expect(
      (
        await GuidesService.approvedFor(
          prisma as any,
          orgId,
          otherProjectId,
          'KII',
        )
      )?.id,
    ).toBe(field.id);

    // And a new field guide does not displace the link's questions.
    const field2 = await qs('Field KII v2');
    await guides.approve(field2.id, userId, orgId);
    expect(await status(field.id)).toBe('ARCHIVED');
    expect(await status(forLink.id)).toBe('APPROVED');

    // A new version of the link guide stays link-only and replaces only its own family.
    const v2 = await guides.save(
      forLink.id,
      {
        title: 'Link KII',
        interviewType: 'KII',
        projectId: otherProjectId,
        languages: ['en'],
        questions: [{ text: { en: 'Changed?' }, type: 'OPEN' }],
      } as any,
      userId,
      orgId,
    );
    expect(v2.linkOnly).toBe(true);
    await guides.approve(v2.id, userId, orgId);
    expect(await status(forLink.id)).toBe('ARCHIVED');
    expect(await status(field2.id)).toBe('APPROVED');

    // It can back a link.
    const link = await links.create(
      { projectId: otherProjectId, questionSetId: v2.id, title: 'Link' } as any,
      userId,
      orgId,
    );
    expect(link.questionSet.id).toBe(v2.id);
  });

  it('keeps links and their responses inside the organization', async () => {
    const link = await newLink();
    await expect(links.findById(link.id, otherOrgId)).rejects.toThrow(
      /not found/,
    );
    await expect(links.responses(link.id, otherOrgId)).rejects.toThrow(
      /not found/,
    );
    await expect(links.close(link.id, otherOrgId)).rejects.toThrow(/not found/);
    expect(
      (await links.list(otherOrgId, {})).some((l) => l.id === link.id),
    ).toBe(false);
    await expect(
      links.create(
        { projectId, questionSetId: approvedGuideId, title: 'x' } as any,
        otherUserId,
        otherOrgId,
      ),
    ).rejects.toThrow(/Project not found/);

    await links.remove(link.id, orgId);
    await expect(respond.getLink(link.token)).rejects.toThrow(/not valid/);
  });
});
