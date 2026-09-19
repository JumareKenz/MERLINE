/**
 * PHASE 1 — PLATFORM SAFETY · STORAGE ACCEPTANCE
 *
 * Verifies object storage against a real S3-compatible endpoint (MinIO),
 * including that a signed URL actually resolves to the bytes that were
 * uploaded.
 *
 * This is the gate that matters most for the interview product: the previous
 * implementation wrote to a local directory that resolved to `/tmp/uploads`
 * on Vercel, so uploaded audio could disappear between requests. A test that
 * mocks the storage client cannot detect that class of problem.
 *
 * Runs when RUN_DB_TESTS=1, DATABASE_URL and AWS_ENDPOINT are set. Skips
 * otherwise. Creates its own bucket and removes its own objects.
 */
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MediaService } from '../../media/media.service';
import { StorageService } from '../../storage/storage.service';

const shouldRun =
  process.env.RUN_DB_TESTS === '1' &&
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.AWS_ENDPOINT);

const describeStorage = shouldRun ? describe : describe.skip;

describeStorage('object storage (MinIO/S3)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);

  const orgA = randomUUID();
  const orgB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();

  let storage: StorageService;
  let media: MediaService;

  const config = new ConfigService({
    aws: {
      region: process.env.AWS_REGION ?? 'eu-west-1',
      endpoint: process.env.AWS_ENDPOINT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      bucket: process.env.AWS_BUCKET ?? 'merline-test',
    },
    storage: { signedUrlTtlSeconds: '900' },
  });

  /** A tiny WebM-ish payload; content is opaque to the storage layer. */
  function audioFile(name: string, bytes = 2048): Express.Multer.File {
    const buffer = Buffer.alloc(bytes, 7);
    return {
      fieldname: 'file',
      originalname: name,
      encoding: '7bit',
      mimetype: 'audio/webm;codecs=opus',
      size: buffer.length,
      buffer,
    } as Express.Multer.File;
  }

  beforeAll(async () => {
    await prisma.$connect();

    const client = new S3Client({
      region: process.env.AWS_REGION ?? 'eu-west-1',
      endpoint: process.env.AWS_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
    try {
      await client.send(
        new CreateBucketCommand({ Bucket: process.env.AWS_BUCKET ?? 'merline-test' }),
      );
    } catch {
      // Already exists — fine.
    }

    await prisma.organization.createMany({
      data: [
        { id: orgA, name: `StorA ${run}`, slug: `stor-a-${run}` },
        { id: orgB, name: `StorB ${run}`, slug: `stor-b-${run}` },
      ],
    });
    await prisma.user.createMany({
      data: [
        { id: userA, email: `s-a-${run}@t.test`, passwordHash: 'x', firstName: 'A', lastName: 'U', organizationId: orgA },
        { id: userB, email: `s-b-${run}@t.test`, passwordHash: 'x', firstName: 'B', lastName: 'U', organizationId: orgB },
      ],
    });

    storage = new StorageService(config);
    media = new MediaService(prisma as any, storage);
  }, 60_000);

  afterAll(async () => {
    const rows = await prisma.media.findMany({
      where: { organizationId: { in: [orgA, orgB] } },
    });
    await Promise.all(rows.map((row) => storage.deleteObject(row.path).catch(() => undefined)));

    await prisma.media.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it('uploads audio to object storage and records a checksum', async () => {
    const record = await media.upload(audioFile('interview.webm'), {}, userA, orgA);

    expect(record.type).toBe('AUDIO');
    // The old allowlist rejected audio/webm, which is what MediaRecorder emits.
    expect(record.mimeType).toBe('audio/webm');
    expect(record.checksum).toHaveLength(64);
    expect(record.size).toBe(2048);
    // Key is organization-prefixed so retention and consent withdrawal can
    // operate on a tenant's objects as a unit.
    expect(record.path.startsWith(`org/${orgA}/media/`)).toBe(true);

    expect(await storage.objectExists(record.path)).toBe(true);
  }, 30_000);

  it('serves a signed URL that returns the exact bytes uploaded', async () => {
    const record = await media.upload(audioFile('playback.webm', 4096), {}, userA, orgA);
    const { url, expiresIn } = await media.getDownloadUrl(record.id, orgA);

    expect(url).toContain(record.path);
    expect(expiresIn).toBeGreaterThan(0);

    const response = await fetch(url);
    expect(response.status).toBe(200);

    const downloaded = Buffer.from(await response.arrayBuffer());
    expect(downloaded.length).toBe(4096);
    expect(StorageService.checksum(downloaded)).toBe(record.checksum);
  }, 30_000);

  it('refuses to mint a signed URL for another organization media', async () => {
    const record = await media.upload(audioFile('private.webm'), {}, userB, orgB);

    await expect(media.getDownloadUrl(record.id, orgA)).rejects.toThrow();
  }, 30_000);

  it('rejects a disallowed content type', async () => {
    const file = audioFile('payload.exe');
    (file as any).mimetype = 'application/x-msdownload';

    await expect(media.upload(file, {}, userA, orgA)).rejects.toThrow(/not allowed/i);
  }, 30_000);

  it('rejects an upload whose declared checksum does not match the bytes', async () => {
    await expect(
      media.upload(audioFile('tampered.webm'), { metadata: { checksum: 'deadbeef' } }, userA, orgA),
    ).rejects.toThrow(/checksum/i);
  }, 30_000);

  it('does not leave an object behind when the checksum check fails', async () => {
    const before = await prisma.media.count({ where: { organizationId: orgA } });

    await expect(
      media.upload(audioFile('tampered2.webm'), { metadata: { checksum: 'nope' } }, userA, orgA),
    ).rejects.toThrow();

    const after = await prisma.media.count({ where: { organizationId: orgA } });
    expect(after).toBe(before);
  }, 30_000);
});
