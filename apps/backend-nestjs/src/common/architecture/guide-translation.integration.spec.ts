/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { GuidesService } from '../../guides/guides.service';

const describeDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : describe.skip;

describeDb('guide Hausa translation and review (database)', () => {
  const prisma = new PrismaClient();
  const org = randomUUID();
  const user = randomUUID();
  let reply = '';
  const provider = {
    chat: jest.fn((_p: { user: string }) => Promise.resolve(reply)),
  };
  let guides: GuidesService;

  const draft = () =>
    guides.create(
      {
        title: 'FGD guide',
        interviewType: 'FGD',
        languages: ['en', 'ha'],
        questions: [
          {
            text: { en: 'Tell us about care.' },
            probes: { en: 'Where?' },
            required: true,
          },
          {
            text: { en: 'What would you improve?' },
            probes: {},
            required: true,
          },
        ],
      } as never,
      user,
      org,
    );

  beforeAll(async () => {
    await prisma.organization.create({
      data: { id: org, name: 'GT', slug: `gt-${org.slice(0, 8)}` },
    });
    await prisma.user.create({
      data: {
        id: user,
        email: `${user}@t.test`,
        passwordHash: 'x',
        firstName: 'A',
        lastName: 'B',
        organizationId: org,
      },
    });
    guides = new GuidesService(
      prisma as never,
      provider as never,
      { get: () => 'm' } as never,
    );
  });
  afterAll(async () => {
    await prisma.questionSet.deleteMany({ where: { organizationId: org } });
    await prisma.user.deleteMany({ where: { organizationId: org } });
    await prisma.organization.delete({ where: { id: org } });
    await prisma.$disconnect();
  });

  it('drafts the Hausa automatically on save, flags it, and blocks approval until reviewed', async () => {
    reply = '';
    const first = await draft(); // provider returns junk: saving still works, nothing is flagged
    expect(first.translationStatus).toBeNull();
    await expect(guides.approve(first.id, user, org)).resolves.toMatchObject({
      status: 'APPROVED',
    });

    provider.chat.mockClear();
    reply = 'will be replaced below';
    const g = await guides.create(
      {
        title: 'G2',
        interviewType: 'IDI',
        languages: ['en', 'ha'],
        questions: [{ text: { en: 'Q1' }, probes: {}, required: true }],
      } as never,
      user,
      org,
    );
    const q1 = g.questions[0].id;
    reply = JSON.stringify({ items: [{ key: q1, text: 'T1', probes: '' }] });
    const translated = await guides.translateToHausa(g.id, org);
    expect(translated.translationStatus).toBe('MACHINE_DRAFT');
    expect(translated.questions[0].text as Record<string, string>).toEqual({
      en: 'Q1',
      ha: 'T1',
    });

    await expect(guides.approve(g.id, user, org)).rejects.toThrow(
      /not been reviewed/,
    );
    await expect(
      guides.markTranslationReviewed(g.id, user, org),
    ).resolves.toMatchObject({ translationStatus: 'REVIEWED' });
    await expect(guides.approve(g.id, user, org)).resolves.toMatchObject({
      status: 'APPROVED',
    });
  });

  it('never overwrites Hausa a person already wrote, and refuses non-drafts', async () => {
    const g = await guides.create(
      {
        title: 'G3',
        interviewType: 'KII',
        languages: ['en', 'ha'],
        questions: [
          { text: { en: 'Q', ha: 'Na mutum' }, probes: {}, required: true },
        ],
      } as never,
      user,
      org,
    );
    provider.chat.mockClear();
    const same = await guides.translateToHausa(g.id, org);
    expect(provider.chat).not.toHaveBeenCalled();
    expect((same.questions[0].text as Record<string, string>).ha).toBe(
      'Na mutum',
    );
    await guides.approve(g.id, user, org);
    await expect(guides.translateToHausa(g.id, org)).rejects.toThrow(
      /Only a draft/,
    );
  });

  it('turns a failing or malformed model reply into a clear error and changes nothing', async () => {
    const g = await guides.create(
      {
        title: 'G4',
        interviewType: 'KII',
        languages: ['en', 'ha'],
        questions: [{ text: { en: 'Q' }, probes: {}, required: true }],
      } as never,
      user,
      org,
    );
    reply = 'not json';
    await expect(guides.translateToHausa(g.id, org)).rejects.toThrow(
      /unusable/,
    );
    provider.chat.mockRejectedValueOnce(new Error('503'));
    await expect(guides.translateToHausa(g.id, org)).rejects.toThrow(
      /did not answer/,
    );
    const after = await prisma.questionSet.findUniqueOrThrow({
      where: { id: g.id },
    });
    expect(after.translationStatus).toBeNull();
  });
});
