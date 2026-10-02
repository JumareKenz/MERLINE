/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await -- supertest response bodies are untyped JSON */
/**
 * Human-in-the-loop transcript review, through the real application:
 * enumerator review → admin approval → evidence gate on analysis.
 *
 * Runs only with RUN_DB_TESTS=1 and DATABASE_URL (a test database) and an
 * S3-compatible store (for the recording link).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { jwtSignOptions } from '../../auth/jwt.constants';
import { provisionOrganizationRoles } from '../../auth/organization-provisioning';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { TransformInterceptor } from '../interceptors/transform.interceptor';
import { StorageService } from '../../storage/storage.service';
import { AnalysisPipelineService } from '../../analysis/analysis-pipeline.service';
import { AnalysisReportsService } from '../../analysis/analysis-reports.service';
import { TranscriptReviewService } from '../../transcripts/transcript-review.service';
import type { ReportDocument } from '../../analysis/report-document';

const describeDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : describe.skip;

describeDb('transcript review and the evidence gate (application)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);
  const orgA = randomUUID();
  const orgB = randomUUID();
  const admin = randomUUID();
  const adminB = randomUUID();
  const researcher = randomUUID();
  const enumA = randomUUID();
  const enumB = randomUUID();
  let project: string;
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let storage: StorageService;
  let review: TranscriptReviewService;

  const sign = (id: string, org: string) =>
    jwt.sign(
      { sub: id, email: `${id}@t.test`, orgId: org, tkn: 0 },
      process.env.JWT_SECRET ?? 'test-secret',
      jwtSignOptions('7d'),
    );
  const T = {
    admin: '',
    adminB: '',
    researcher: '',
    a: '',
    b: '',
  };
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const data = (r: request.Response) => r.body.data;

  interface Fixture {
    interviewId: string;
    transcriptId: string;
    segmentIds: string[];
    mediaId: string;
  }

  async function fixture(opts: {
    interviewer: string;
    type?: string;
    texts?: string[];
    reviewStatus?:
      'AVAILABLE_FOR_REVIEW' | 'APPROVED' | 'TRANSCRIPTION_PROCESSING';
    org?: string;
    consentAi?: boolean;
    speakers?: (string | null)[];
  }): Promise<Fixture> {
    const org = opts.org ?? orgA;
    const texts = opts.texts ?? [
      'Ruwan sha ya yi mana wuya.',
      'Mata suna tafiya nesa.',
      'Babu isasshen ruwa.',
      'Mun gode.',
    ];
    const participant = await prisma.participant.create({
      data: {
        displayName: 'Respondent',
        organizationId: org,
        createdById: opts.interviewer,
        projectId: project,
      },
    });
    const consent = await prisma.consent.create({
      data: {
        participantId: participant.id,
        version: 'v1',
        method: 'VERBAL',
        allowRecording: true,
        allowTranscription: true,
        allowAiAnalysis: opts.consentAi ?? true,
        allowQuotation: true,
        allowPublication: false,
        grantedAt: new Date(),
        organizationId: org,
        actorId: opts.interviewer,
      },
    });
    const interview = await prisma.interview.create({
      data: {
        participantId: participant.id,
        consentId: consent.id,
        projectId: project,
        interviewerId: opts.interviewer,
        organizationId: org,
        status: 'COMPLETED',
        type: opts.type ?? 'KII',
        location: 'Kano',
        language: 'ha',
      },
    });
    const key = `test/${org}/${randomUUID()}.webm`;
    await storage.putObject({
      key,
      body: Buffer.from('fake-audio'),
      contentType: 'audio/webm',
    });
    const media = await prisma.media.create({
      data: {
        filename: 'a.webm',
        originalName: 'a.webm',
        mimeType: 'audio/webm',
        size: 10,
        type: 'AUDIO',
        path: key,
        uploadedById: opts.interviewer,
        organizationId: org,
        interviewId: interview.id,
      },
    });
    const transcript = await prisma.transcript.create({
      data: {
        status:
          opts.reviewStatus === 'TRANSCRIPTION_PROCESSING'
            ? 'PROCESSING'
            : 'COMPLETED',
        reviewStatus: opts.reviewStatus ?? 'AVAILABLE_FOR_REVIEW',
        language: 'ha',
        completedAt: new Date(),
        organizationId: org,
        interviewId: interview.id,
        mediaId: media.id,
        requestedById: opts.interviewer,
      },
    });
    const segmentIds: string[] = [];
    for (const [i, text] of texts.entries()) {
      const s = await prisma.transcriptSegment.create({
        data: {
          transcriptId: transcript.id,
          organizationId: org,
          index: i,
          startMs: i * 5000,
          endMs: i * 5000 + 4000,
          text,
          speakerLabel: opts.speakers ? opts.speakers[i] : 'Speaker 1',
          confidence: 0.4 + i * 0.1,
        },
      });
      segmentIds.push(s.id);
    }
    await prisma.transcriptRevision.create({
      data: {
        organizationId: org,
        transcriptId: transcript.id,
        number: 1,
        kind: 'MACHINE',
        note: 'Machine transcript',
        segments: texts.map((text, i) => ({
          index: i,
          startMs: i * 5000,
          endMs: i * 5000 + 4000,
          speaker: 'Speaker 1',
          text,
          confidence: 0.4 + i * 0.1,
          flagged: false,
          flagReason: null,
          note: null,
        })),
      },
    });
    return {
      interviewId: interview.id,
      transcriptId: transcript.id,
      segmentIds,
      mediaId: media.id,
    };
  }

  const enumeratorEdit = (
    t: string,
    f: Fixture,
    i: number,
    body: Record<string, unknown>,
  ) =>
    http
      .patch(
        `/api/v1/field/transcripts/${f.transcriptId}/segments/${f.segmentIds[i]}`,
      )
      .set(bearer(t))
      .send(body);
  const statusOf = async (f: Fixture) =>
    (
      await prisma.transcript.findUniqueOrThrow({
        where: { id: f.transcriptId },
      })
    ).reviewStatus;

  beforeAll(async () => {
    await prisma.organization.createMany({
      data: [
        { id: orgA, name: `Review A ${run}`, slug: `review-a-${run}` },
        { id: orgB, name: `Review B ${run}`, slug: `review-b-${run}` },
      ],
    });
    const rolesA = await provisionOrganizationRoles(prisma, orgA);
    const rolesB = await provisionOrganizationRoles(prisma, orgB);
    const mkUser = (id: string, org: string, first: string) => ({
      id,
      email: `${id}@t.test`,
      passwordHash: 'x',
      firstName: first,
      lastName: 'T',
      organizationId: org,
    });
    await prisma.user.createMany({
      data: [
        mkUser(admin, orgA, 'Admin'),
        mkUser(adminB, orgB, 'AdminB'),
        mkUser(researcher, orgA, 'Res'),
        mkUser(enumA, orgA, 'Aisha'),
        mkUser(enumB, orgA, 'Bala'),
      ],
    });
    await prisma.roleUser.createMany({
      data: [
        { userId: admin, roleId: rolesA.get('administrator')! },
        { userId: adminB, roleId: rolesB.get('administrator')! },
        { userId: researcher, roleId: rolesA.get('researcher')! },
        { userId: enumA, roleId: rolesA.get('field-interviewer')! },
        { userId: enumB, roleId: rolesA.get('field-interviewer')! },
      ],
    });
    project = (
      await prisma.project.create({
        data: { name: 'Water', organizationId: orgA, createdById: admin },
      })
    ).id;
    await prisma.projectTeam.createMany({
      data: [enumA, enumB].map((userId) => ({
        projectId: project,
        userId,
        role: 'field',
      })),
    });
    T.admin = sign(admin, orgA);
    T.adminB = sign(adminB, orgB);
    T.researcher = sign(researcher, orgA);
    T.a = sign(enumA, orgA);
    T.b = sign(enumB, orgA);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    http = request(app.getHttpServer());
    storage = app.get(StorageService);
    review = app.get(TranscriptReviewService);
  }, 60_000);

  afterAll(async () => {
    const orgs = { in: [orgA, orgB] };
    const users = { in: [admin, adminB, researcher, enumA, enumB] };
    await prisma.reportSource.deleteMany({
      where: { report: { organizationId: orgs } },
    });
    await prisma.job.deleteMany({ where: { organizationId: orgs } });
    await prisma.analysisReport.deleteMany({ where: { organizationId: orgs } });
    await prisma.quotation.deleteMany({ where: { organizationId: orgs } });
    await prisma.finding.deleteMany({ where: { organizationId: orgs } });
    await prisma.transcriptReviewEvent.deleteMany({
      where: { organizationId: orgs },
    });
    await prisma.transcriptRevision.deleteMany({
      where: { organizationId: orgs },
    });
    await prisma.transcriptSegment.deleteMany({
      where: { organizationId: orgs },
    });
    await prisma.transcript.deleteMany({ where: { organizationId: orgs } });
    await prisma.media.deleteMany({ where: { organizationId: orgs } });
    await prisma.interview.deleteMany({ where: { organizationId: orgs } });
    await prisma.consent.deleteMany({ where: { organizationId: orgs } });
    await prisma.participant.deleteMany({ where: { organizationId: orgs } });
    await prisma.projectTeam.deleteMany({ where: { userId: users } });
    await prisma.project.deleteMany({ where: { organizationId: orgs } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ organizationId: orgs }, { userId: users }] },
    });
    await prisma.roleUser.deleteMany({ where: { userId: users } });
    await prisma.permissionRole.deleteMany({
      where: { role: { organizationId: orgs } },
    });
    await prisma.role.deleteMany({ where: { organizationId: orgs } });
    await prisma.permission.deleteMany({ where: { organizationId: orgs } });
    await prisma.user.deleteMany({ where: { organizationId: orgs } });
    await prisma.organization.deleteMany({ where: { id: orgs } });
    await app?.close();
    await prisma.$disconnect();
  });

  // ─── the enumerator's side ─────────────────────────────────────────

  describe('enumerator review', () => {
    let f: Fixture;
    let other: Fixture;
    beforeAll(async () => {
      f = await fixture({ interviewer: enumA });
      other = await fixture({ interviewer: enumB });
    });

    it('lists and opens only the transcripts of interviews they conducted', async () => {
      const list = data(
        await http
          .get('/api/v1/field/transcripts')
          .set(bearer(T.a))
          .expect(200),
      ) as { id: string }[];
      expect(list.map((t) => t.id)).toContain(f.transcriptId);
      expect(list.map((t) => t.id)).not.toContain(other.transcriptId);
      await http
        .get(`/api/v1/field/transcripts/${other.transcriptId}`)
        .set(bearer(T.a))
        .expect(404);
      await http
        .get(`/api/v1/field/transcripts/${other.transcriptId}/audio`)
        .set(bearer(T.a))
        .expect(404);
      await enumeratorEdit(T.a, other, 0, { text: 'x' }).expect(404);
      await http
        .post(`/api/v1/field/transcripts/${other.transcriptId}/submit`)
        .set(bearer(T.a))
        .send({})
        .expect(404);
      await http
        .get(`/api/v1/field/transcripts/${f.transcriptId}`)
        .set(bearer(T.adminB))
        .expect(404); // another organization
    });

    it('shows machine text, confidence and the recording to listen to', async () => {
      const d = data(
        await http
          .get(`/api/v1/field/transcripts/${f.transcriptId}`)
          .set(bearer(T.a))
          .expect(200),
      );
      expect(d.reviewStatus).toBe('AVAILABLE_FOR_REVIEW');
      expect(d.canEdit).toBe(true);
      expect(d.segments[0]).toMatchObject({
        machineText: 'Ruwan sha ya yi mana wuya.',
        edited: false,
        confidence: 0.4,
      });
      expect(d.interview.type).toBe('KII');
      const audio = data(
        await http
          .get(`/api/v1/field/transcripts/${f.transcriptId}/audio`)
          .set(bearer(T.a))
          .expect(200),
      );
      expect(audio.url).toMatch(/^https?:\/\//);
    });

    it('cannot use the administrator’s routes', async () => {
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.a))
        .send({})
        .expect(403);
      await http
        .get(`/api/v1/transcripts/${f.transcriptId}`)
        .set(bearer(T.a))
        .expect(403);
      await http
        .get(`/api/v1/transcripts/${f.transcriptId}/revisions`)
        .set(bearer(T.a))
        .expect(403);
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.researcher))
        .send({})
        .expect(403);
    });

    it('edits wording, adds cues, corrects speakers and flags doubt — leaving machine text intact', async () => {
      const r1 = await enumeratorEdit(T.a, f, 0, {
        text: 'Ruwan sha ya yi mana wahala [ pause ] sosai.',
      }).expect(200);
      expect(data(r1)).toMatchObject({
        text: 'Ruwan sha ya yi mana wuya.',
        editedText: 'Ruwan sha ya yi mana wahala [pause] sosai.',
        editedById: enumA,
      });
      expect(await statusOf(f)).toBe('ENUMERATOR_EDITING');

      await enumeratorEdit(T.a, f, 1, {
        text: '[background noise] Mata suna [inaudible] nesa. [laughs]',
      }).expect(200);
      await enumeratorEdit(T.a, f, 2, { speakerLabel: 'Respondent' }).expect(
        200,
      );
      await enumeratorEdit(T.a, f, 3, {
        flagged: true,
        flagReason: 'Cannot hear the last word',
        note: 'Maybe "mun gode sosai"',
      }).expect(200);

      const d = data(
        await http
          .get(`/api/v1/field/transcripts/${f.transcriptId}`)
          .set(bearer(T.a))
          .expect(200),
      );
      expect(d.segments[1].text).toBe(
        '[background noise] Mata suna [inaudible] nesa. [laughs]',
      );
      expect(d.segments[2]).toMatchObject({
        speaker: 'Respondent',
        machineSpeaker: 'Speaker 1',
      });
      expect(d.segments[3]).toMatchObject({
        flagged: true,
        flagReason: 'Cannot hear the last word',
        edited: false,
      });

      // The machine transcript is untouched in the database and in revision 1.
      const row = await prisma.transcriptSegment.findUniqueOrThrow({
        where: { id: f.segmentIds[0] },
      });
      expect(row.text).toBe('Ruwan sha ya yi mana wuya.');
      const rev1 = await prisma.transcriptRevision.findUniqueOrThrow({
        where: {
          transcriptId_number: { transcriptId: f.transcriptId, number: 1 },
        },
      });
      expect(JSON.stringify(rev1.segments)).toContain(
        'Ruwan sha ya yi mana wuya.',
      );
    });

    it('refuses malformed cue brackets and puts machine text back on null', async () => {
      await enumeratorEdit(T.a, f, 0, { text: 'Unclosed [pause' }).expect(400);
      await enumeratorEdit(T.a, f, 0, { text: 'Nested [a [b]] cue' }).expect(
        400,
      );
      await enumeratorEdit(T.a, f, 1, { text: null }).expect(200);
      const row = await prisma.transcriptSegment.findUniqueOrThrow({
        where: { id: f.segmentIds[1] },
      });
      expect(row.editedText).toBeNull();
      expect(row.editedById).toBeNull();
      await enumeratorEdit(T.a, f, 1, {
        text: '[background noise] Mata suna [inaudible] nesa. [laughs]',
      }).expect(200);
    });

    it('renames a speaker across the transcript', async () => {
      const res = await http
        .post(`/api/v1/field/transcripts/${f.transcriptId}/speakers/rename`)
        .set(bearer(T.a))
        .send({ from: 'Speaker 1', to: 'Interviewer' })
        .expect(200);
      expect(data(res).renamed).toBe(3); // segment 2 was already 'Respondent'
      await http
        .post(`/api/v1/field/transcripts/${f.transcriptId}/speakers/rename`)
        .set(bearer(T.a))
        .send({ from: 'Nobody', to: 'X' })
        .expect(404);
    });

    it('submits for admin review, freezing what they submitted, then can no longer edit', async () => {
      const res = await http
        .post(`/api/v1/field/transcripts/${f.transcriptId}/submit`)
        .set(bearer(T.a))
        .send({ note: 'Checked against the audio' })
        .expect(200);
      expect(data(res).reviewStatus).toBe('SUBMITTED_FOR_ADMIN_REVIEW');
      expect(data(res).canEdit).toBe(false);
      const revs = await prisma.transcriptRevision.findMany({
        where: { transcriptId: f.transcriptId },
        orderBy: { number: 'asc' },
      });
      expect(revs.map((r) => r.kind)).toEqual(['MACHINE', 'ENUMERATOR']);
      expect(revs[1].authorId).toBe(enumA);
      await enumeratorEdit(T.a, f, 0, { text: 'sneaky change' }).expect(409);
      await http
        .post(`/api/v1/field/transcripts/${f.transcriptId}/submit`)
        .set(bearer(T.a))
        .send({})
        .expect(409);
    });
  });

  // ─── the administrator's side ──────────────────────────────────────

  describe('administrator review', () => {
    let f: Fixture;
    beforeAll(async () => {
      f = await fixture({ interviewer: enumA });
      await enumeratorEdit(T.a, f, 0, {
        text: 'Ruwan sha ya yi mana wahala.',
      }).expect(200);
      await enumeratorEdit(T.a, f, 3, {
        flagged: true,
        flagReason: 'Inaudible',
      }).expect(200);
      await http
        .post(`/api/v1/field/transcripts/${f.transcriptId}/submit`)
        .set(bearer(T.a))
        .send({})
        .expect(200);
    });

    it('shows the recording’s machine text beside the enumerator’s edits, with provenance', async () => {
      const d = data(
        await http
          .get(`/api/v1/transcripts/${f.transcriptId}/review`)
          .set(bearer(T.admin))
          .expect(200),
      );
      expect(d.reviewStatus).toBe('SUBMITTED_FOR_ADMIN_REVIEW');
      expect(d.segments[0]).toMatchObject({
        machineText: 'Ruwan sha ya yi mana wuya.',
        text: 'Ruwan sha ya yi mana wahala.',
        edited: true,
        editedById: enumA,
      });
      expect(d.revisions.map((r: { kind: string }) => r.kind)).toEqual([
        'MACHINE',
        'ENUMERATOR',
      ]);
      expect(d.events.map((e: { action: string }) => e.action)).toEqual(
        expect.arrayContaining([
          'editing_started',
          'submitted_for_admin_review',
        ]),
      );
    });

    it('compares any two revisions segment by segment', async () => {
      const res = data(
        await http
          .get(
            `/api/v1/transcripts/${f.transcriptId}/revisions/compare?from=1&to=2`,
          )
          .set(bearer(T.admin))
          .expect(200),
      );
      expect(res.changedSegments).toBe(2);
      const first = res.diffs.find((x: { index: number }) => x.index === 0);
      expect(first.changed).toEqual(['text']);
      expect(first.before.text).toBe('Ruwan sha ya yi mana wuya.');
      expect(first.after.text).toBe('Ruwan sha ya yi mana wahala.');
      const flagged = res.diffs.find((x: { index: number }) => x.index === 3);
      expect(flagged.changed).toEqual(['flag']);
      await http
        .get(
          `/api/v1/transcripts/${f.transcriptId}/revisions/compare?from=1&to=99`,
        )
        .set(bearer(T.admin))
        .expect(404);
    });

    it('returning needs a reason; the enumerator sees the feedback and can correct and resubmit', async () => {
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/return`)
        .set(bearer(T.admin))
        .send({})
        .expect(400);
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/return`)
        .set(bearer(T.admin))
        .send({ note: 'ok' })
        .expect(400);
      // Admin corrects one thing before returning it.
      await http
        .patch(
          `/api/v1/transcripts/${f.transcriptId}/segments/${f.segmentIds[2]}`,
        )
        .set(bearer(T.admin))
        .send({ text: 'Babu isasshen ruwan sha.' })
        .expect(200);
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/return`)
        .set(bearer(T.admin))
        .send({ note: 'Please listen again to the last line' })
        .expect(200);
      expect(await statusOf(f)).toBe('RETURNED_FOR_CORRECTION');

      const mine = data(
        await http
          .get('/api/v1/field/transcripts')
          .set(bearer(T.a))
          .expect(200),
      ) as { id: string; reviewNote: string | null; reviewStatus: string }[];
      expect(mine.find((t) => t.id === f.transcriptId)).toMatchObject({
        reviewStatus: 'RETURNED_FOR_CORRECTION',
        reviewNote: 'Please listen again to the last line',
      });
      // Admin can no longer edit while it is with the enumerator.
      await http
        .patch(
          `/api/v1/transcripts/${f.transcriptId}/segments/${f.segmentIds[0]}`,
        )
        .set(bearer(T.admin))
        .send({ text: 'x' })
        .expect(409);

      await enumeratorEdit(T.a, f, 3, {
        text: 'Mun gode sosai.',
        flagged: false,
      }).expect(200);
      expect(await statusOf(f)).toBe('ENUMERATOR_EDITING');
      await http
        .post(`/api/v1/field/transcripts/${f.transcriptId}/submit`)
        .set(bearer(T.a))
        .send({})
        .expect(200);
      const kinds = (
        await prisma.transcriptRevision.findMany({
          where: { transcriptId: f.transcriptId },
          orderBy: { number: 'asc' },
        })
      ).map((r) => r.kind);
      expect(kinds).toEqual(['MACHINE', 'ENUMERATOR', 'ADMIN', 'ENUMERATOR']);
    });

    it('approves: freezes the authoritative revision, and nobody can edit it afterwards', async () => {
      const res = await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.admin))
        .send({ note: 'Verified' })
        .expect(200);
      expect(data(res).reviewStatus).toBe('APPROVED');
      const t = await prisma.transcript.findUniqueOrThrow({
        where: { id: f.transcriptId },
      });
      expect(t.approvedById).toBe(admin);
      expect(t.approvedAt).not.toBeNull();
      const finalRev = await prisma.transcriptRevision.findUniqueOrThrow({
        where: { id: t.approvedRevisionId! },
      });
      expect(finalRev.kind).toBe('APPROVED');
      expect(JSON.stringify(finalRev.segments)).toContain('Mun gode sosai.');
      await enumeratorEdit(T.a, f, 0, { text: 'late' }).expect(409);
      await http
        .patch(
          `/api/v1/transcripts/${f.transcriptId}/segments/${f.segmentIds[0]}`,
        )
        .set(bearer(T.admin))
        .send({ text: 'late' })
        .expect(409);
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.admin))
        .send({})
        .expect(409);
    });

    it('keeps the whole history: revisions only grow and machine text is still there', async () => {
      const revs = data(
        await http
          .get(`/api/v1/transcripts/${f.transcriptId}/revisions`)
          .set(bearer(T.admin))
          .expect(200),
      ) as { number: number; kind: string }[];
      expect(revs.map((r) => r.number)).toEqual([1, 2, 3, 4, 5]);
      expect(revs.at(-1)!.kind).toBe('APPROVED');
      const events = data(
        await http
          .get(`/api/v1/transcripts/${f.transcriptId}/review`)
          .set(bearer(T.admin))
          .expect(200),
      ).events;
      expect(events.map((e: { action: string }) => e.action)).toEqual(
        expect.arrayContaining(['returned_for_correction', 'approved']),
      );
      for (const e of events) expect(e.actor).toBeTruthy();
      const first = data(
        await http
          .get(
            `/api/v1/transcripts/${f.transcriptId}/revisions/compare?from=1&to=1`,
          )
          .set(bearer(T.admin))
          .expect(200),
      );
      expect(first.changedSegments).toBe(0);
      const machine = await prisma.transcriptSegment.findMany({
        where: { transcriptId: f.transcriptId },
        orderBy: { index: 'asc' },
      });
      expect(machine.map((s) => s.text)).toEqual([
        'Ruwan sha ya yi mana wuya.',
        'Mata suna tafiya nesa.',
        'Babu isasshen ruwa.',
        'Mun gode.',
      ]);
    });

    it('reopens with a reason, then locks for good', async () => {
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/reopen`)
        .set(bearer(T.admin))
        .send({})
        .expect(400);
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/reopen`)
        .set(bearer(T.admin))
        .send({ note: 'Found a mis-heard name' })
        .expect(200);
      expect(await statusOf(f)).toBe('SUBMITTED_FOR_ADMIN_REVIEW');
      expect(
        (
          await prisma.transcript.findUniqueOrThrow({
            where: { id: f.transcriptId },
          })
        ).approvedRevisionId,
      ).toBeNull();
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.admin))
        .send({ acknowledgeFlags: true })
        .expect(200);
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/lock`)
        .set(bearer(T.admin))
        .send({})
        .expect(200);
      expect(await statusOf(f)).toBe('LOCKED');
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/reopen`)
        .set(bearer(T.admin))
        .send({ note: 'again please' })
        .expect(409);
      await http
        .patch(
          `/api/v1/transcripts/${f.transcriptId}/segments/${f.segmentIds[0]}`,
        )
        .set(bearer(T.admin))
        .send({ text: 'x' })
        .expect(409);
    });
  });

  describe('approval rules', () => {
    it('will not approve a transcript still flagged, unless the flags are acknowledged', async () => {
      const f = await fixture({ interviewer: enumA });
      await enumeratorEdit(T.a, f, 1, {
        flagged: true,
        flagReason: 'Muffled',
      }).expect(200);
      await http
        .post(`/api/v1/field/transcripts/${f.transcriptId}/submit`)
        .set(bearer(T.a))
        .send({})
        .expect(200);
      const refused = await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.admin))
        .send({})
        .expect(409);
      expect(JSON.stringify(refused.body)).toMatch(
        /1 passage is still flagged/,
      );
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.admin))
        .send({ acknowledgeFlags: true })
        .expect(200);
      const ev = await prisma.auditLog.findFirst({
        where: { auditableId: f.transcriptId, event: 'transcript.approved' },
      });
      expect(ev?.newValues).toMatchObject({ flaggedRemaining: 1 });
    });

    it('needs the enumerator’s review, unless the administrator skips it with a recorded reason', async () => {
      const f = await fixture({ interviewer: enumA });
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.admin))
        .send({})
        .expect(409);
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.admin))
        .send({ skipEnumeratorReview: true })
        .expect(400);
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.admin))
        .send({
          skipEnumeratorReview: true,
          note: 'Enumerator left the project; checked against audio myself',
        })
        .expect(200);
      const events = await prisma.transcriptReviewEvent.findMany({
        where: { transcriptId: f.transcriptId },
      });
      expect(events.map((e) => e.action)).toContain(
        'approved_without_enumerator_review',
      );
    });

    it('cannot approve a transcript that is still being processed', async () => {
      const f = await fixture({
        interviewer: enumA,
        reviewStatus: 'TRANSCRIPTION_PROCESSING',
      });
      await http
        .post(`/api/v1/transcripts/${f.transcriptId}/approve`)
        .set(bearer(T.admin))
        .send({ skipEnumeratorReview: true, note: 'trying to skip ahead' })
        .expect(409);
      // The enumerator sees it is still processing, and cannot edit or submit it.
      const mine = data(
        await http
          .get('/api/v1/field/transcripts')
          .set(bearer(T.a))
          .expect(200),
      ) as { id: string }[];
      expect(mine.map((t) => t.id)).not.toContain(f.transcriptId);
      await enumeratorEdit(T.a, f, 0, { text: 'too early' }).expect(400);
      await http
        .post(`/api/v1/field/transcripts/${f.transcriptId}/submit`)
        .set(bearer(T.a))
        .send({})
        .expect(409);
    });

    it('lets only one of two racing approvals win', async () => {
      const f = await fixture({ interviewer: enumA });
      await http
        .post(`/api/v1/field/transcripts/${f.transcriptId}/submit`)
        .set(bearer(T.a))
        .send({})
        .expect(200);
      const results = await Promise.allSettled([
        review.approve(f.transcriptId, {}, admin, orgA),
        review.approve(f.transcriptId, {}, admin, orgA),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const approvedRevisions = await prisma.transcriptRevision.count({
        where: { transcriptId: f.transcriptId, kind: 'APPROVED' },
      });
      expect(approvedRevisions).toBe(1);
    });

    it('keeps another organization’s administrator out', async () => {
      const f = await fixture({ interviewer: enumA });
      for (const path of ['approve', 'return', 'reopen', 'lock']) {
        await http
          .post(`/api/v1/transcripts/${f.transcriptId}/${path}`)
          .set(bearer(T.adminB))
          .send({ note: 'hello there' })
          .expect(404);
      }
      await http
        .get(`/api/v1/transcripts/${f.transcriptId}/review`)
        .set(bearer(T.adminB))
        .expect(404);
    });
  });

  // ─── unapproved transcripts feed nothing ───────────────────────────

  describe('evidence gate', () => {
    let unapproved: Fixture;
    let approved: Fixture;
    let findingId: string;
    beforeAll(async () => {
      unapproved = await fixture({ interviewer: enumA });
      approved = await fixture({
        interviewer: enumA,
        reviewStatus: 'APPROVED',
      });
      findingId = (
        await prisma.finding.create({
          data: {
            title: 'Water',
            interpretation: 'x',
            organizationId: orgA,
            createdById: admin,
            projectId: project,
          },
        })
      ).id;
    });

    it('refuses AI dialogue, drafting and quotations on an unapproved transcript', async () => {
      const notApproved = /not been approved/i;
      const ask = await http
        .post(`/api/v1/transcripts/${unapproved.transcriptId}/ask`)
        .set(bearer(T.admin))
        .send({ question: 'What did they say?' });
      expect(ask.status).toBe(400);
      expect(JSON.stringify(ask.body)).toMatch(notApproved);
      const draft = await http
        .post(`/api/v1/findings/ai-draft`)
        .set(bearer(T.admin))
        .send({ transcriptId: unapproved.transcriptId });
      expect([400, 404]).toContain(draft.status);
      const q = await http
        .post(`/api/v1/findings/${findingId}/quotations`)
        .set(bearer(T.admin))
        .send({
          transcriptSegmentId: unapproved.segmentIds[0],
          excerpt: 'Ruwan sha',
        });
      expect(q.status).toBe(400);
      expect(JSON.stringify(q.body)).toMatch(notApproved);
    });

    it('accepts a quotation from an approved transcript, verbatim', async () => {
      await http
        .post(`/api/v1/findings/${findingId}/quotations`)
        .set(bearer(T.admin))
        .send({
          transcriptSegmentId: approved.segmentIds[0],
          excerpt: 'Ruwan sha',
        })
        .expect(201);
      await http
        .post(`/api/v1/findings/${findingId}/quotations`)
        .set(bearer(T.admin))
        .send({
          transcriptSegmentId: approved.segmentIds[0],
          excerpt: 'Ruwan kwalba',
        })
        .expect(400);
    });

    it('will not queue an interview report for an unapproved transcript', async () => {
      const res = await http
        .post('/api/v1/analysis-reports')
        .set(bearer(T.admin))
        .send({ scope: 'INTERVIEW', interviewId: unapproved.interviewId });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/no approved transcript/i);
      const ok = await http
        .post('/api/v1/analysis-reports')
        .set(bearer(T.admin))
        .send({ scope: 'INTERVIEW', interviewId: approved.interviewId });
      expect(ok.status).toBe(202);
    });

    it('will not run a report against an unapproved transcript even if one is queued', async () => {
      const pipeline = app.get(AnalysisPipelineService);
      const row = await prisma.analysisReport.create({
        data: {
          scope: 'INTERVIEW',
          title: 'Sneaky',
          language: 'en',
          interviewId: unapproved.interviewId,
          projectId: project,
          organizationId: orgA,
          requestedById: admin,
        },
      });
      const spy = jest.spyOn(pipeline, 'askJson');
      await expect(pipeline.run(row.id)).rejects.toThrow(
        /no approved transcript/i,
      );
      expect(spy).not.toHaveBeenCalled(); // the model never saw the text
      spy.mockRestore();
    });
  });

  // ─── reports: approved sources only, traceable, triangulated ───────

  describe('reports built from approved transcripts', () => {
    it('uses only approved transcripts, records its sources, and triangulates KII and FGD', async () => {
      const proj = (
        await prisma.project.create({
          data: {
            name: 'Triangulation',
            organizationId: orgA,
            createdById: admin,
          },
        })
      ).id;
      const savedProject = project;
      project = proj;
      const kii = await fixture({
        interviewer: enumA,
        type: 'KII',
        reviewStatus: 'APPROVED',
        texts: [
          'The borehole has been broken for a year.',
          'We fetch water from the river.',
        ],
      });
      const fgd = await fixture({
        interviewer: enumA,
        type: 'FGD',
        reviewStatus: 'APPROVED',
        texts: [
          'Everyone in this group says the borehole is broken.',
          'One woman said the river is safe.',
        ],
      });
      const draft = await fixture({
        interviewer: enumA,
        type: 'IDI',
        reviewStatus: 'AVAILABLE_FOR_REVIEW',
        texts: ['SECRET-UNAPPROVED-TEXT about a flood.'],
      });
      project = savedProject;
      // one segment in the FGD is flagged uncertain in review
      await prisma.transcriptSegment.update({
        where: { id: fgd.segmentIds[1] },
        data: { flagged: true },
      });

      const pipeline = app.get(AnalysisPipelineService);
      const reports = app.get(AnalysisReportsService);
      const prompts: string[] = [];
      const spy = jest
        .spyOn(pipeline, 'askJson')
        .mockImplementation(async (system: string, user: string) => {
          prompts.push(user);
          if (system.includes('ONE research interview')) {
            const idx = (needle: string) =>
              Number(
                new RegExp(`\\[(\\d+)\\][^\\n]*${needle}`).exec(user)?.[1] ?? 0,
              );
            return {
              title: 'Interview report',
              executiveSummary: ['Summary'],
              keyThemes: [
                {
                  theme: 'Water',
                  analysis: ['Analysis'],
                  quotes: [
                    {
                      segmentIndex: idx('borehole'),
                      excerpt: 'the borehole has been broken for a year',
                    },
                    {
                      segmentIndex: idx('river is safe'),
                      excerpt: 'the river is safe',
                    }, // flagged: must be dropped
                  ],
                },
              ],
            };
          }
          return {
            title: 'Project',
            executiveSummary: ['Summary'],
            keyFindings: [
              {
                finding: 'The borehole is broken',
                whatParticipantsSaid: ['They said it is broken.'],
                interpretation: ['Suggests neglect.'],
                interviews: ['I1', 'I2'],
                quoteIds: ['Q-I1-1', 'Q-I2-1', 'Q-I99-1'],
                contraryEvidence: [],
              },
            ],
          };
        });

      const created = await reports.request(
        { scope: 'PROJECT', projectId: proj } as never,
        admin,
        orgA,
      );
      await pipeline.run((created as { id: string }).id);
      spy.mockRestore();

      // The unapproved interview's words never reached the model.
      expect(prompts.join('\n')).not.toContain('SECRET-UNAPPROVED-TEXT');

      const row = await prisma.analysisReport.findUniqueOrThrow({
        where: { id: (created as { id: string }).id },
        include: { sources: true },
      });
      const doc = row.content as unknown as ReportDocument;
      expect(row.status).toBe('COMPLETED');
      expect(row.sourceCount).toBe(2);
      // Traceable: each source is an approved transcript, at its approved revision.
      expect(row.sources.map((s) => s.transcriptId).sort()).toEqual(
        [kii.transcriptId, fgd.transcriptId].sort(),
      );
      expect(row.sources.map((s) => s.interviewType).sort()).toEqual([
        'FGD',
        'KII',
      ]);
      expect(row.sources.map((s) => s.transcriptId)).not.toContain(
        draft.transcriptId,
      );
      // Every quotation resolves to a real segment of an approved transcript.
      for (const q of Object.values(doc.quotes)) {
        const seg = await prisma.transcriptSegment.findUniqueOrThrow({
          where: { id: q.segmentId },
        });
        expect(seg.text).toContain(q.text.replace(/[“”]/g, ''));
        expect(seg.flagged).toBe(false);
        expect([kii.transcriptId, fgd.transcriptId]).toContain(
          seg.transcriptId,
        );
        expect(q.interviewType).toMatch(/KII|FGD/);
      }
      expect(JSON.stringify(doc.quotes)).not.toContain('river is safe');
      // Triangulation across both types is in the report.
      const tri = doc.sections.find((s) =>
        s.heading.startsWith('Triangulation'),
      );
      expect(tri).toBeDefined();
      expect(JSON.stringify(tri)).toMatch(/KII \(of 1\)/);
      expect(JSON.stringify(tri)).toMatch(/FGD \(of 1\)/);
      expect(
        JSON.stringify(
          doc.sections.find((s) => s.heading.startsWith('Finding 1')),
        ),
      ).toMatch(/Across 2 interview types|2 of 2 interviews/);
      // A report can be limited to one interview type.
      const noIdi = await http.post('/api/v1/analysis-reports').set(bearer(T.admin)).send({ scope: 'PROJECT', projectId: proj, interviewType: 'IDI' });
      expect(noIdi.status).toBe(400);
      expect(JSON.stringify(noIdi.body)).toMatch(/No IDI interview/);
      const fgdOnly = await http.post('/api/v1/analysis-reports').set(bearer(T.admin)).send({ scope: 'PROJECT', projectId: proj, interviewType: 'FGD' });
      expect(fgdOnly.status).toBe(202);
      expect(data(fgdOnly).interviewType).toBe('FGD');
      expect(data(fgdOnly).title).toMatch(/FGD only/);
      // And it says which were left out.
      expect(JSON.stringify(doc)).toMatch(/2 of 3/);
    });
  });
});
