/**
 * PHASE 2 — QUALITATIVE INTERVIEW PRODUCT
 *
 * Database-backed proof of the field-worker access-code login: an admin
 * issues a code for a user in their own organization; that code (and only
 * that code) authenticates as that user via a normal session; revoking it,
 * or reaching across organizations, is refused.
 */
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../../auth/auth.service';

const shouldRun =
  process.env.RUN_DB_TESTS === '1' && Boolean(process.env.DATABASE_URL);
const describeDb = shouldRun ? describe : describe.skip;

describeDb('field access code (database)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);

  const orgAId = randomUUID();
  const orgBId = randomUUID();
  const userAId = randomUUID(); // field worker in org A
  const userBId = randomUUID(); // any user in org B, for cross-tenant checks

  let users: UsersService;
  let auth: AuthService;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: orgAId, name: `FieldCode A ${run}`, slug: `field-code-a-${run}` },
        { id: orgBId, name: `FieldCode B ${run}`, slug: `field-code-b-${run}` },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `fc-a-${run}@t.test`,
          passwordHash: 'x',
          firstName: 'Field',
          lastName: 'Worker',
          organizationId: orgAId,
        },
        {
          id: userBId,
          email: `fc-b-${run}@t.test`,
          passwordHash: 'x',
          firstName: 'B',
          lastName: 'User',
          organizationId: orgBId,
        },
      ],
    });

    users = new UsersService(prisma as any);
    const jwtService = new JwtService({ secret: 'test-secret' });
    const configService = new ConfigService({ jwt: { expiresIn: '7d' } });
    auth = new AuthService(prisma as any, jwtService, configService);
  }, 60_000);

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgAId, orgBId] } },
    });
    await prisma.$disconnect();
  });

  it('refuses to generate a code for a user in another organization', async () => {
    await expect(
      users.generateFieldAccessCode(userBId, orgAId),
    ).rejects.toThrow();
  });

  it('generates a code, logs in with it, and the code is usable with or without formatting', async () => {
    const { code } = await users.generateFieldAccessCode(userAId, orgAId);
    expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);

    const loginResult = await auth.fieldLogin({ code });
    expect(loginResult.user.id).toBe(userAId);
    expect(loginResult.token.accessToken).toBeTruthy();

    // Same code, no dash, lowercase, stray whitespace — must still work.
    const loose = ` ${code.replace('-', '').toLowerCase()} `;
    const loginResult2 = await auth.fieldLogin({ code: loose });
    expect(loginResult2.user.id).toBe(userAId);
  });

  it('refuses an invalid code', async () => {
    await expect(auth.fieldLogin({ code: 'NOTREAL01' })).rejects.toThrow(
      /invalid/i,
    );
  });

  it('refuses a code for a deactivated user', async () => {
    const { code } = await users.generateFieldAccessCode(userAId, orgAId);
    await prisma.user.update({
      where: { id: userAId },
      data: { isActive: false },
    });

    await expect(auth.fieldLogin({ code })).rejects.toThrow(/inactive/i);

    await prisma.user.update({
      where: { id: userAId },
      data: { isActive: true },
    });
  });

  it('revoking the code blocks future login with it', async () => {
    const { code } = await users.generateFieldAccessCode(userAId, orgAId);
    await users.revokeFieldAccessCode(userAId, orgAId);

    await expect(auth.fieldLogin({ code })).rejects.toThrow(/invalid/i);
  });

  it('refuses to revoke a code for a user in another organization', async () => {
    await users.generateFieldAccessCode(userAId, orgAId);
    await expect(
      users.revokeFieldAccessCode(userAId, orgBId),
    ).rejects.toThrow();
  });

  it('issuing a new code invalidates the previous one', async () => {
    const first = await users.generateFieldAccessCode(userAId, orgAId);
    const second = await users.generateFieldAccessCode(userAId, orgAId);

    expect(second.code).not.toBe(first.code);
    await expect(auth.fieldLogin({ code: first.code })).rejects.toThrow(
      /invalid/i,
    );

    const loginResult = await auth.fieldLogin({ code: second.code });
    expect(loginResult.user.id).toBe(userAId);
  });
});
