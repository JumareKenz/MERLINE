/**
 * PHASE 2 — QUALITATIVE INTERVIEW PRODUCT
 *
 * Database-backed proof of the evidence-integrity invariant: a Finding
 * cannot be approved or published without a Quotation resolving to a real
 * TranscriptSegment, and a Quotation cannot be created unless its excerpt
 * actually appears in that segment's text and the source consent still
 * permits quotation.
 *
 * Transcript and TranscriptSegment rows are created directly via Prisma
 * here rather than through TranscriptsService, since exercising real
 * transcription requires a live provider key this environment does not
 * have (see consent-enforcement.integration.spec.ts, which does cover the
 * request path up to that boundary). What matters for this suite is that a
 * segment exists with real, organization-scoped content — how it got there
 * is orthogonal to whether FindingsService enforces evidence integrity
 * around it.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ConsentsService } from '../../consents/consents.service';
import { FindingsService } from '../../findings/findings.service';

const shouldRun =
  process.env.RUN_DB_TESTS === '1' && Boolean(process.env.DATABASE_URL);
const describeDb = shouldRun ? describe : describe.skip;

describeDb('evidence integrity (database)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);

  const orgAId = randomUUID();
  const orgBId = randomUUID();
  const userAId = randomUUID();
  const userBId = randomUUID();

  let consents: ConsentsService;
  let findings: FindingsService;

  /** Builds participant -> consent -> interview -> transcript -> segment for one org. */
  async function buildEvidenceChain(
    orgId: string,
    userId: string,
    opts: { allowQuotation: boolean; allowPublication: boolean },
  ) {
    const participant = await prisma.participant.create({
      data: {
        displayName: `Evidence ${run}`,
        organizationId: orgId,
        createdById: userId,
      },
    });
    const consent = await prisma.consent.create({
      data: {
        participantId: participant.id,
        version: 'v1',
        method: 'VERBAL',
        allowTranscription: true,
        allowQuotation: opts.allowQuotation,
        allowPublication: opts.allowPublication,
        organizationId: orgId,
        actorId: userId,
      },
    });
    const interview = await prisma.interview.create({
      data: {
        participantId: participant.id,
        consentId: consent.id,
        interviewerId: userId,
        organizationId: orgId,
      },
    });
    const media = await prisma.media.create({
      data: {
        filename: `${run}.webm`,
        originalName: 'x.webm',
        mimeType: 'audio/webm',
        size: 10,
        type: 'AUDIO',
        path: `org/${orgId}/media/${randomUUID()}`,
        uploadedById: userId,
        organizationId: orgId,
        interviewId: interview.id,
      },
    });
    const transcript = await prisma.transcript.create({
      data: {
        status: 'COMPLETED',
        organizationId: orgId,
        interviewId: interview.id,
        mediaId: media.id,
        requestedById: userId,
      },
    });
    const segment = await prisma.transcriptSegment.create({
      data: {
        transcriptId: transcript.id,
        organizationId: orgId,
        index: 0,
        startMs: 0,
        endMs: 5000,
        text: 'The clinic was closed for three weeks during the outbreak.',
      },
    });

    return { participant, consent, interview, media, transcript, segment };
  }

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: orgAId, name: `Evidence A ${run}`, slug: `evidence-a-${run}` },
        { id: orgBId, name: `Evidence B ${run}`, slug: `evidence-b-${run}` },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `ea-${run}@t.test`,
          passwordHash: 'x',
          firstName: 'A',
          lastName: 'U',
          organizationId: orgAId,
        },
        {
          id: userBId,
          email: `eb-${run}@t.test`,
          passwordHash: 'x',
          firstName: 'B',
          lastName: 'U',
          organizationId: orgBId,
        },
      ],
    });

    consents = new ConsentsService(prisma as any);
    findings = new FindingsService(prisma as any, consents);
  }, 60_000);

  afterAll(async () => {
    await prisma.quotation.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.finding.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.transcriptSegment.deleteMany({
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

  describe('approval requires evidence', () => {
    it('refuses to approve a finding with zero quotations', async () => {
      const finding = await findings.create(
        { title: 'No evidence', interpretation: 'x' },
        userAId,
        orgAId,
      );

      await expect(
        findings.approve(finding.id, userAId, orgAId),
      ).rejects.toThrow(/needs at least one quotation/i);
    });

    it('refuses a quotation whose excerpt is not actually in the segment text', async () => {
      const chain = await buildEvidenceChain(orgAId, userAId, {
        allowQuotation: true,
        allowPublication: true,
      });
      const finding = await findings.create(
        { title: 'F', interpretation: 'x' },
        userAId,
        orgAId,
      );

      await expect(
        findings.addQuotation(
          finding.id,
          {
            transcriptSegmentId: chain.segment.id,
            excerpt: 'words never spoken',
          },
          userAId,
          orgAId,
        ),
      ).rejects.toThrow(/does not appear verbatim/i);
    });

    it('refuses a quotation when consent.allowQuotation is false', async () => {
      const chain = await buildEvidenceChain(orgAId, userAId, {
        allowQuotation: false,
        allowPublication: false,
      });
      const finding = await findings.create(
        { title: 'F', interpretation: 'x' },
        userAId,
        orgAId,
      );

      await expect(
        findings.addQuotation(
          finding.id,
          {
            transcriptSegmentId: chain.segment.id,
            excerpt: 'clinic was closed',
          },
          userAId,
          orgAId,
        ),
      ).rejects.toThrow(/does not permit quotation/i);
    });

    it('refuses to quote a transcript segment from another organization', async () => {
      const chainB = await buildEvidenceChain(orgBId, userBId, {
        allowQuotation: true,
        allowPublication: true,
      });
      const findingA = await findings.create(
        { title: 'F', interpretation: 'x' },
        userAId,
        orgAId,
      );

      await expect(
        findings.addQuotation(
          findingA.id,
          {
            transcriptSegmentId: chainB.segment.id,
            excerpt: 'clinic was closed',
          },
          userAId,
          orgAId,
        ),
      ).rejects.toThrow();
    });

    it('approves once a real, verbatim, consented quotation exists', async () => {
      const chain = await buildEvidenceChain(orgAId, userAId, {
        allowQuotation: true,
        allowPublication: true,
      });
      const finding = await findings.create(
        {
          title: 'Clinic closures',
          interpretation: 'Access was disrupted',
        },
        userAId,
        orgAId,
      );

      await findings.addQuotation(
        finding.id,
        {
          transcriptSegmentId: chain.segment.id,
          excerpt: 'clinic was closed for three weeks',
        },
        userAId,
        orgAId,
      );

      const approved = await findings.approve(finding.id, userAId, orgAId);
      expect(approved.status).toBe('APPROVED');
    });
  });

  describe('publication re-checks consent per quotation', () => {
    it('refuses to publish when the underlying consent does not permit publication', async () => {
      const chain = await buildEvidenceChain(orgAId, userAId, {
        allowQuotation: true,
        allowPublication: false,
      });
      const finding = await findings.create(
        { title: 'F', interpretation: 'x' },
        userAId,
        orgAId,
      );
      await findings.addQuotation(
        finding.id,
        { transcriptSegmentId: chain.segment.id, excerpt: 'clinic was closed' },
        userAId,
        orgAId,
      );
      await findings.approve(finding.id, userAId, orgAId);

      await expect(findings.publish(finding.id, orgAId)).rejects.toThrow(
        /does not permit publication/i,
      );
    });

    it('publishes once every quotation source consent permits publication', async () => {
      const chain = await buildEvidenceChain(orgAId, userAId, {
        allowQuotation: true,
        allowPublication: true,
      });
      const finding = await findings.create(
        { title: 'F', interpretation: 'x' },
        userAId,
        orgAId,
      );
      await findings.addQuotation(
        finding.id,
        { transcriptSegmentId: chain.segment.id, excerpt: 'clinic was closed' },
        userAId,
        orgAId,
      );
      await findings.approve(finding.id, userAId, orgAId);

      const published = await findings.publish(finding.id, orgAId);
      expect(published.status).toBe('PUBLISHED');
    });

    it('refuses to publish a finding that is not yet approved', async () => {
      const chain = await buildEvidenceChain(orgAId, userAId, {
        allowQuotation: true,
        allowPublication: true,
      });
      const finding = await findings.create(
        { title: 'F', interpretation: 'x' },
        userAId,
        orgAId,
      );
      await findings.addQuotation(
        finding.id,
        { transcriptSegmentId: chain.segment.id, excerpt: 'clinic was closed' },
        userAId,
        orgAId,
      );

      await expect(findings.publish(finding.id, orgAId)).rejects.toThrow(
        /requires one of: APPROVED/i,
      );
    });
  });

  describe('rejection needs no evidence', () => {
    it('rejects a finding with zero quotations', async () => {
      const finding = await findings.create(
        { title: 'F', interpretation: 'x' },
        userAId,
        orgAId,
      );
      const rejected = await findings.reject(finding.id, userAId, orgAId);
      expect(rejected.status).toBe('REJECTED');
    });
  });
});
