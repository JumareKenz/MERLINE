/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await -- supertest response bodies are untyped JSON */
/**
 * One project, several interview types — through the real application.
 * Runs only with RUN_DB_TESTS=1 and DATABASE_URL (a test database).
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

const describeDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : describe.skip;

describeDb('interview types per project (application)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);
  const orgA = randomUUID();
  const orgB = randomUUID();
  const admin = randomUUID();
  const adminB = randomUUID();
  const viewer = randomUUID();
  const enumerator = randomUUID();
  let project: string;
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const sign = (id: string, org: string) =>
    jwt.sign(
      { sub: id, email: `${id}@t.test`, orgId: org, tkn: 0 },
      process.env.JWT_SECRET ?? 'test-secret',
      jwtSignOptions('7d'),
    );
  const T = { admin: '', adminB: '', viewer: '', enumerator: '' };
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const data = (r: request.Response) => r.body.data;

  const body = (projectId: string, extra: Record<string, unknown> = {}) => ({
    interviewId: randomUUID(),
    participantId: randomUUID(),
    consentId: randomUUID(),
    projectId,
    participant: { displayName: 'R' },
    consent: {
      version: 'v1',
      method: 'VERBAL',
      allowRecording: true,
      allowTranscription: true,
      allowAiAnalysis: true,
      allowQuotation: true,
      allowPublication: false,
      capturedAt: new Date().toISOString(),
    },
    ...extra,
  });

  beforeAll(async () => {
    await prisma.organization.createMany({
      data: [
        { id: orgA, name: `Types A ${run}`, slug: `types-a-${run}` },
        { id: orgB, name: `Types B ${run}`, slug: `types-b-${run}` },
      ],
    });
    const rolesA = await provisionOrganizationRoles(prisma, orgA);
    const rolesB = await provisionOrganizationRoles(prisma, orgB);
    await prisma.user.createMany({
      data: [
        [admin, orgA],
        [adminB, orgB],
        [viewer, orgA],
        [enumerator, orgA],
      ].map(([id, org]) => ({
        id,
        email: `${id}@t.test`,
        passwordHash: 'x',
        firstName: 'T',
        lastName: 'U',
        organizationId: org,
      })),
    });
    await prisma.roleUser.createMany({
      data: [
        { userId: admin, roleId: rolesA.get('administrator')! },
        { userId: adminB, roleId: rolesB.get('administrator')! },
        { userId: viewer, roleId: rolesA.get('viewer')! },
        { userId: enumerator, roleId: rolesA.get('field-interviewer')! },
      ],
    });
    project = (
      await prisma.project.create({
        data: {
          name: 'Mixed methods',
          organizationId: orgA,
          createdById: admin,
        },
      })
    ).id;
    await prisma.projectTeam.create({
      data: { projectId: project, userId: enumerator, role: 'field' },
    });
    T.admin = sign(admin, orgA);
    T.adminB = sign(adminB, orgB);
    T.viewer = sign(viewer, orgA);
    T.enumerator = sign(enumerator, orgA);
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
  }, 60_000);

  afterAll(async () => {
    const orgs = { in: [orgA, orgB] };
    const users = { in: [admin, adminB, viewer, enumerator] };
    await prisma.transcriptRevision.deleteMany({
      where: { organizationId: orgs },
    });
    await prisma.transcript.deleteMany({ where: { organizationId: orgs } });
    await prisma.media.deleteMany({ where: { organizationId: orgs } });
    await prisma.interview.deleteMany({ where: { organizationId: orgs } });
    await prisma.consent.deleteMany({ where: { organizationId: orgs } });
    await prisma.participant.deleteMany({ where: { organizationId: orgs } });
    await prisma.projectInterviewType.deleteMany({
      where: { organizationId: orgs },
    });
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

  it('offers the six standard types until a project defines its own', async () => {
    const res = data(
      await http
        .get(`/api/v1/projects/${project}/interview-types`)
        .set(bearer(T.admin))
        .expect(200),
    );
    expect(res.configured).toBe(false);
    expect(res.types.map((t: { key: string }) => t.key)).toEqual([
      'KII',
      'FGD',
      'IDI',
      'HOUSEHOLD',
      'OBSERVATION',
      'OTHER',
    ]);
  });

  it('lets an administrator configure several types, with type-specific fields', async () => {
    const res = await http
      .put(`/api/v1/projects/${project}/interview-types`)
      .set(bearer(T.admin))
      .send({
        types: [
          { key: 'KII', label: 'Key informant interview' },
          {
            key: 'FGD',
            label: 'Focus group discussion',
            fields: [
              {
                key: 'groupSize',
                label: 'Group size',
                kind: 'number',
                required: true,
              },
              {
                key: 'groupType',
                label: 'Group',
                kind: 'select',
                options: ['Women', 'Men', 'Youth', 'Mixed'],
                required: true,
              },
            ],
          },
          {
            key: 'WATER_POINT_VISIT',
            label: 'Water point observation',
            description: 'Structured visit',
            fields: [{ key: 'pointId', label: 'Water point ID', kind: 'text' }],
          },
        ],
      })
      .expect(200);
    const d = data(res);
    expect(d.configured).toBe(true);
    expect(d.types.map((t: { key: string }) => t.key)).toEqual([
      'KII',
      'FGD',
      'WATER_POINT_VISIT',
    ]);
    expect(d.types[2].custom).toBe(true);
    expect(d.types[1].fields).toHaveLength(2);
  });

  it('refuses malformed configuration', async () => {
    const put = (types: unknown) =>
      http
        .put(`/api/v1/projects/${project}/interview-types`)
        .set(bearer(T.admin))
        .send({ types });
    expect((await put([])).status).toBe(400);
    expect((await put([{ key: 'kii', label: 'x' }])).status).toBe(400); // lowercase key
    expect(
      (
        await put([
          { key: 'KII', label: 'a' },
          { key: 'KII', label: 'b' },
        ])
      ).status,
    ).toBe(400); // duplicate
    expect(
      (
        await put([
          {
            key: 'FGD',
            label: 'a',
            fields: [{ key: 'g', label: 'G', kind: 'select' }],
          },
        ])
      ).status,
    ).toBe(400); // select without options
    expect(
      (
        await put([
          {
            key: 'FGD',
            label: 'a',
            fields: [{ key: 'g', label: 'G', kind: 'nonsense' }],
          },
        ])
      ).status,
    ).toBe(400);
  });

  it('is closed to viewers and other organizations', async () => {
    await http
      .put(`/api/v1/projects/${project}/interview-types`)
      .set(bearer(T.viewer))
      .send({ types: [{ key: 'KII', label: 'x' }] })
      .expect(403);
    await http
      .get(`/api/v1/projects/${project}/interview-types`)
      .set(bearer(T.adminB))
      .expect(404);
    await http
      .put(`/api/v1/projects/${project}/interview-types`)
      .set(bearer(T.adminB))
      .send({ types: [{ key: 'KII', label: 'x' }] })
      .expect(404);
  });

  it('records the type and its metadata on each interview, several types in one project', async () => {
    const kii = await http
      .post('/api/v1/field/interviews')
      .set(bearer(T.enumerator))
      .send(body(project, { type: 'KII' }))
      .expect(201);
    const fgd = await http
      .post('/api/v1/field/interviews')
      .set(bearer(T.enumerator))
      .send(
        body(project, {
          type: 'FGD',
          typeMetadata: {
            groupSize: '8',
            groupType: 'Women',
            stray: 'dropped',
          },
        }),
      )
      .expect(201);
    await http
      .post('/api/v1/field/interviews')
      .set(bearer(T.enumerator))
      .send(
        body(project, {
          type: 'WATER_POINT_VISIT',
          typeMetadata: { pointId: 'WP-12' },
        }),
      )
      .expect(201);

    const rows = await prisma.interview.findMany({
      where: { projectId: project },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows.map((r) => r.type)).toEqual([
      'KII',
      'FGD',
      'WATER_POINT_VISIT',
    ]);
    expect(rows[1].typeMetadata).toEqual({ groupSize: 8, groupType: 'Women' });
    expect(rows[0].typeMetadata).toBeNull();
    expect(data(kii).id).toBeTruthy();
    expect(data(fgd).id).toBeTruthy();

    const usage = data(
      await http
        .get(`/api/v1/projects/${project}/interview-types/usage`)
        .set(bearer(T.admin))
        .expect(200),
    );
    expect(usage).toEqual(
      expect.arrayContaining([
        { type: 'KII', interviews: 1, awaitingApproval: 0, approved: 0 },
        { type: 'FGD', interviews: 1, awaitingApproval: 0, approved: 0 },
        {
          type: 'WATER_POINT_VISIT',
          interviews: 1,
          awaitingApproval: 0,
          approved: 0,
        },
      ]),
    );
  });

  it('enforces the type’s required fields and options', async () => {
    const post = (extra: Record<string, unknown>) =>
      http
        .post('/api/v1/field/interviews')
        .set(bearer(T.enumerator))
        .send(body(project, extra));
    expect((await post({ type: 'FGD' })).status).toBe(400); // group size required
    expect(
      (
        await post({
          type: 'FGD',
          typeMetadata: { groupSize: 'many', groupType: 'Women' },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post({
          type: 'FGD',
          typeMetadata: { groupSize: 6, groupType: 'Aliens' },
        })
      ).status,
    ).toBe(400);
    expect((await post({ type: 'IDI' })).status).toBe(400); // not one of this project's types
  });

  it('falls back to the project’s method for older devices that send no type', async () => {
    await prisma.project.update({
      where: { id: project },
      data: { settings: { method: 'KII' } },
    });
    const res = await http
      .post('/api/v1/field/interviews')
      .set(bearer(T.enumerator))
      .send(body(project))
      .expect(201);
    expect(
      (
        await prisma.interview.findUniqueOrThrow({
          where: { id: data(res).id },
        })
      ).type,
    ).toBe('KII');
  });

  it('stops offering a removed type but keeps the interviews that used it', async () => {
    await http
      .put(`/api/v1/projects/${project}/interview-types`)
      .set(bearer(T.admin))
      .send({ types: [{ key: 'KII', label: 'Key informant interview' }] })
      .expect(200);
    const list = data(
      await http
        .get(`/api/v1/projects/${project}/interview-types`)
        .set(bearer(T.admin))
        .expect(200),
    );
    expect(list.types.map((t: { key: string }) => t.key)).toEqual(['KII']);
    await http
      .post('/api/v1/field/interviews')
      .set(bearer(T.enumerator))
      .send(
        body(project, {
          type: 'FGD',
          typeMetadata: { groupSize: 5, groupType: 'Men' },
        }),
      )
      .expect(400);
    expect(
      await prisma.interview.count({
        where: { projectId: project, type: 'FGD' },
      }),
    ).toBe(1);
    // Bringing it back restores it.
    await http
      .put(`/api/v1/projects/${project}/interview-types`)
      .set(bearer(T.admin))
      .send({
        types: [
          { key: 'KII', label: 'KII' },
          { key: 'FGD', label: 'Focus group' },
        ],
      })
      .expect(200);
    const back = await prisma.projectInterviewType.findUniqueOrThrow({
      where: { projectId_key: { projectId: project, key: 'FGD' } },
    });
    expect(back.isActive).toBe(true);
    expect(back.label).toBe('Focus group');
  });

  it('always offers a type that has an approved guide, even if the saved list left it out', async () => {
    // The list was saved with KII and FGD only; an approved IDI guide exists.
    await prisma.questionSet.create({
      data: {
        familyId: randomUUID(),
        title: 'IDI guide',
        interviewType: 'IDI',
        status: 'APPROVED',
        projectId: project,
        organizationId: orgA,
        createdById: admin,
        languages: ['en'],
      },
    });
    const list = data(
      await http
        .get(`/api/v1/projects/${project}/interview-types`)
        .set(bearer(T.admin))
        .expect(200),
    );
    expect(list.types.map((t: { key: string }) => t.key)).toEqual(
      expect.arrayContaining(['KII', 'FGD', 'IDI']),
    );
    const field = data(
      await http
        .get('/api/v1/field/projects')
        .set(bearer(T.enumerator))
        .expect(200),
    );
    expect(
      field[0].interviewTypes.map((t: { key: string }) => t.key),
    ).toContain('IDI');
    // Each type gets its own guide: a focus group and an in-depth interview differ.
    const q = (en: string) => ({
      create: [
        { order: 1, text: { en }, type: 'OPEN', probes: {}, required: true },
      ],
    });
    await prisma.questionSet.updateMany({
      where: { organizationId: orgA },
      data: { title: 'IDI guide' },
    });
    const idi = await prisma.questionSet.findFirstOrThrow({
      where: { organizationId: orgA, interviewType: 'IDI' },
    });
    await prisma.guideQuestion.create({
      data: {
        questionSetId: idi.id,
        order: 1,
        text: { en: 'Individual question' },
        type: 'OPEN',
        probes: {},
        required: true,
      },
    });
    await prisma.questionSet.create({
      data: {
        familyId: randomUUID(),
        title: 'FGD guide',
        interviewType: 'FGD',
        status: 'APPROVED',
        projectId: project,
        organizationId: orgA,
        createdById: admin,
        languages: ['en'],
        questions: q('Group question'),
      },
    });
    const both = data(
      await http
        .get('/api/v1/field/projects')
        .set(bearer(T.enumerator))
        .expect(200),
    )[0];
    expect(Object.keys(both.guides).sort()).toEqual(['FGD', 'IDI']);
    expect(both.guides.FGD.id).not.toBe(both.guides.IDI.id);
    expect(both.guides.FGD.questions[0].text.en).toBe('Group question');
    expect(both.guides.IDI.questions[0].text.en).toBe('Individual question');
    await prisma.guideQuestion.deleteMany({
      where: { questionSet: { organizationId: orgA } },
    });
    await prisma.questionSet.deleteMany({ where: { organizationId: orgA } });
  });

  it('filters the administrator’s transcript list by interview type, review status and project', async () => {
    const mk = async (
      type: string,
      reviewStatus: 'AVAILABLE_FOR_REVIEW' | 'APPROVED',
    ) => {
      const iv = await prisma.interview.findFirstOrThrow({
        where: { projectId: project, type },
      });
      const media = await prisma.media.create({
        data: {
          filename: 'x',
          originalName: 'x',
          mimeType: 'audio/webm',
          size: 1,
          type: 'AUDIO',
          path: `t/${randomUUID()}`,
          uploadedById: enumerator,
          organizationId: orgA,
          interviewId: iv.id,
        },
      });
      return prisma.transcript.create({
        data: {
          status: 'COMPLETED',
          reviewStatus,
          organizationId: orgA,
          interviewId: iv.id,
          mediaId: media.id,
          requestedById: enumerator,
        },
      });
    };
    const kii = await mk('KII', 'APPROVED');
    const fgd = await mk('FGD', 'AVAILABLE_FOR_REVIEW');
    const ids = async (qs: string) =>
      (
        data(
          await http
            .get(`/api/v1/transcripts?${qs}`)
            .set(bearer(T.admin))
            .expect(200),
        ) as { id: string }[]
      ).map((t) => t.id);

    expect(await ids(`projectId=${project}&type=FGD`)).toEqual([fgd.id]);
    expect(await ids(`projectId=${project}&type=KII`)).toEqual([kii.id]);
    expect((await ids(`projectId=${project}`)).sort()).toEqual(
      [kii.id, fgd.id].sort(),
    );
    expect(await ids(`projectId=${project}&reviewStatus=APPROVED`)).toEqual([
      kii.id,
    ]);
    expect(
      await ids(`projectId=${project}&type=FGD&reviewStatus=APPROVED`),
    ).toEqual([]);
    await http
      .get('/api/v1/transcripts?reviewStatus=NOPE')
      .set(bearer(T.admin))
      .expect(400);
    const row = (
      data(
        await http
          .get(`/api/v1/transcripts?projectId=${project}&type=FGD`)
          .set(bearer(T.admin))
          .expect(200),
      ) as { interview: { type: string } }[]
    )[0];
    expect(row.interview.type).toBe('FGD'); // every transcript carries its interview type

    const summary = data(
      await http
        .get(`/api/v1/transcripts/review-summary?projectId=${project}`)
        .set(bearer(T.admin))
        .expect(200),
    );
    expect(summary.byStatus).toMatchObject({
      APPROVED: 1,
      AVAILABLE_FOR_REVIEW: 1,
      LOCKED: 0,
    });
    expect(summary.byType).toEqual(
      expect.arrayContaining([
        { type: 'KII', total: 1, approved: 1 },
        { type: 'FGD', total: 1, approved: 0 },
      ]),
    );
    await http
      .get('/api/v1/transcripts/review-summary')
      .set(bearer(T.viewer))
      .expect(403);
  });
});
