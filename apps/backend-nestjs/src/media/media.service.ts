import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaType, ProcessingStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { BaseService } from '../common/base/base.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { InitChunkedUploadDto } from './dto/init-chunked-upload.dto';
import { jsonObject } from '../common/utils/prisma-json';

/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Media persistence, rebuilt on durable object storage.
 *
 * What changed and why:
 *
 *  - Objects go to S3/MinIO instead of the local filesystem. The old path
 *    resolved to `/tmp/uploads` on Vercel and to a single pod's disk on
 *    Kubernetes, so uploads could vanish between requests.
 *  - Every read and delete is tenant-scoped. `GET /media/:id/download`
 *    previously streamed any file to any authenticated caller who knew its
 *    UUID, with no ownership check at all.
 *  - Downloads are served as short-lived signed URLs rather than proxied
 *    bytes, so large interview audio does not occupy an application worker.
 *  - `audio/webm` is accepted. Chrome's MediaRecorder produces it by default,
 *    so the previous allowlist would have rejected browser-recorded audio —
 *    which is exactly what the Phase 2 PWA will produce.
 *  - The size cap is configurable and defaults far above the old 50 MB, which
 *    was below a single 90-minute interview.
 *  - Checksums are computed and stored, so an upload can be verified rather
 *    than assumed.
 *
 * Still deliberately unchanged: chunked upload keeps its three-step API shape.
 * Its reassembly is rewritten here, but true resumable multipart upload is
 * Phase 2 work alongside the offline outbox.
 */

const ALLOWED_MIME_TYPES: Record<string, MediaType> = {
  'image/jpeg': MediaType.IMAGE,
  'image/png': MediaType.IMAGE,
  'image/gif': MediaType.IMAGE,
  'image/webp': MediaType.IMAGE,
  'image/svg+xml': MediaType.IMAGE,

  // Audio. `audio/webm` and `audio/ogg;codecs=opus` are what browsers record.
  'audio/mpeg': MediaType.AUDIO,
  'audio/mp3': MediaType.AUDIO,
  'audio/wav': MediaType.AUDIO,
  'audio/x-wav': MediaType.AUDIO,
  'audio/ogg': MediaType.AUDIO,
  'audio/opus': MediaType.AUDIO,
  'audio/webm': MediaType.AUDIO,
  'audio/mp4': MediaType.AUDIO,
  'audio/m4a': MediaType.AUDIO,
  'audio/x-m4a': MediaType.AUDIO,
  'audio/aac': MediaType.AUDIO,
  'audio/flac': MediaType.AUDIO,

  'video/mp4': MediaType.VIDEO,
  'video/mpeg': MediaType.VIDEO,
  'video/webm': MediaType.VIDEO,
  'video/quicktime': MediaType.VIDEO,

  'application/pdf': MediaType.FILE,
  'application/msword': MediaType.FILE,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    MediaType.FILE,
  'application/vnd.ms-excel': MediaType.FILE,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    MediaType.FILE,
  'text/csv': MediaType.FILE,
  'application/json': MediaType.FILE,
  'text/plain': MediaType.FILE,
  'image/signature': MediaType.SIGNATURE,
};

/** 90 minutes of 128 kbps audio is roughly 86 MB; uncompressed WAV far more. */
const DEFAULT_MAX_FILE_BYTES = 512 * 1024 * 1024;

/**
 * Upper bound on parts in one resumable recording upload. At the field
 * app's 512 KiB part size this is ~2 GB, far above any real interview; it
 * exists so a hostile client cannot create unbounded chunk rows.
 */
const MAX_RECORDING_PARTS = 4096;

@Injectable()
export class MediaService extends BaseService {
  private readonly maxFileBytes: number;

  constructor(
    prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    super(prisma);
    this.maxFileBytes = Number(
      process.env.MAX_UPLOAD_BYTES ?? DEFAULT_MAX_FILE_BYTES,
    );
  }

  async upload(
    file: Express.Multer.File,
    dto: {
      type?: MediaType;
      metadata?: Record<string, unknown>;
      interviewId?: string;
    },
    userId: string,
    organizationId: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file content received');
    }

    if (file.size > this.maxFileBytes) {
      throw new BadRequestException(
        `File exceeds the maximum upload size of ${Math.floor(this.maxFileBytes / 1024 / 1024)}MB`,
      );
    }

    // `audio/webm;codecs=opus` — match on the bare type.
    const baseMime = file.mimetype.split(';')[0].trim().toLowerCase();
    const allowedType = ALLOWED_MIME_TYPES[baseMime];
    if (!allowedType) {
      throw new BadRequestException(`File type ${baseMime} is not allowed`);
    }

    const id = uuidv4();
    const extension = path.extname(file.originalname).replace(/^\./, '');
    const key = this.storage.buildKey({
      organizationId,
      kind: 'media',
      id,
      extension,
    });

    const { checksum, bytes } = await this.storage.putObject({
      key,
      body: file.buffer,
      contentType: baseMime,
      metadata: { organizationId, uploadedBy: userId },
    });

    const declaredChecksum = dto.metadata?.checksum as string | undefined;
    if (declaredChecksum && declaredChecksum !== checksum) {
      // The client told us what it sent and the bytes disagree. Remove the
      // object rather than record a row pointing at corrupt content.
      await this.storage.deleteObject(key);
      throw new BadRequestException(
        'Upload checksum mismatch; the file was not stored',
      );
    }

    return this.prisma.media.create({
      data: {
        id,
        filename: path.basename(key),
        originalName: file.originalname,
        mimeType: baseMime,
        size: bytes,
        type: dto.type ?? allowedType,
        processingStatus: ProcessingStatus.COMPLETED,
        path: key,
        checksum,
        metadata: (dto.metadata ?? {}) as any,
        uploadedById: userId,
        organizationId,
        // PHASE 2: set when this upload is an interview recording. The
        // caller (InterviewsService) is responsible for the consent check —
        // this method has no notion of consent, only storage.
        interviewId: dto.interviewId,
      },
    });
  }

  async initChunkedUpload(dto: InitChunkedUploadDto) {
    const identifier = uuidv4();
    return {
      identifier,
      uploadUrl: `/media/chunked/${identifier}`,
      expiresIn: 86400,
      mediaType: dto.type ?? this.inferMediaType(dto.mimeType),
    };
  }

  /**
   * Chunks are buffered as individual objects under a temporary prefix so that
   * nothing depends on a single machine's disk. Reassembly happens in
   * `completeChunkedUpload`.
   */
  async uploadChunk(
    identifier: string,
    file: Express.Multer.File,
    index: number,
    userId: string,
    organizationId: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No chunk content received');
    }
    if (!Number.isInteger(index) || index < 0) {
      throw new BadRequestException(
        'Chunk index must be a non-negative integer',
      );
    }

    const key = this.chunkKey(organizationId, identifier, index);
    const { checksum } = await this.storage.putObject({
      key,
      body: file.buffer,
      contentType: 'application/octet-stream',
      metadata: { identifier, index: String(index) },
    });

    // A retried chunk replaces its earlier row rather than adding a second
    // one — duplicate rows would be concatenated twice on completion and
    // silently corrupt the reassembled file.
    await this.prisma.$transaction([
      this.prisma.mediaChunk.deleteMany({
        where: { identifier, index, uploadedById: userId },
      }),
      this.prisma.mediaChunk.create({
        data: {
          identifier,
          index,
          size: file.size,
          checksum,
          uploadedById: userId,
        },
      }),
    ]);

    return { identifier, chunkIndex: index, received: file.size, checksum };
  }

  async completeChunkedUpload(
    identifier: string,
    userId: string,
    organizationId: string,
    options: { originalName?: string; mimeType?: string } = {},
  ) {
    const chunks = await this.prisma.mediaChunk.findMany({
      where: { identifier, uploadedById: userId },
      orderBy: { index: 'asc' },
    });

    if (chunks.length === 0) {
      throw new BadRequestException('No chunks found for this identifier');
    }

    // Previously the reassembled object was hard-coded to
    // `application/octet-stream` / MediaType.FILE, so a chunk-uploaded
    // interview was not recorded as audio at all.
    const mimeType = (options.mimeType ?? 'application/octet-stream')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const mediaType =
      ALLOWED_MIME_TYPES[mimeType] ?? this.inferMediaType(mimeType);

    const parts: Buffer[] = [];
    for (const chunk of chunks) {
      const stream = await this.storage.getObjectStream(
        this.chunkKey(organizationId, identifier, chunk.index),
      );
      parts.push(await this.readStream(stream));
    }
    const body = Buffer.concat(parts);

    if (body.length > this.maxFileBytes) {
      throw new BadRequestException(
        'Reassembled file exceeds the maximum upload size',
      );
    }

    const id = uuidv4();
    const extension = options.originalName
      ? path.extname(options.originalName).replace(/^\./, '')
      : '';
    const key = this.storage.buildKey({
      organizationId,
      kind: 'media',
      id,
      extension,
    });

    const { checksum, bytes } = await this.storage.putObject({
      key,
      body,
      contentType: mimeType,
      metadata: {
        organizationId,
        uploadedBy: userId,
        assembledFrom: identifier,
      },
    });

    const media = await this.prisma.media.create({
      data: {
        id,
        filename: path.basename(key),
        originalName: options.originalName ?? `chunked-${identifier}`,
        mimeType,
        size: bytes,
        type: mediaType,
        processingStatus: ProcessingStatus.COMPLETED,
        path: key,
        checksum,
        uploadedById: userId,
        organizationId,
      },
    });

    // Best-effort cleanup; the row is already durable, so a failure here must
    // not fail the request.
    await Promise.all(
      chunks.map((chunk) =>
        this.storage
          .deleteObject(this.chunkKey(organizationId, identifier, chunk.index))
          .catch(() => undefined),
      ),
    );
    await this.prisma.mediaChunk.deleteMany({
      where: { identifier, uploadedById: userId },
    });

    return media;
  }

  /**
   * PHASE 2 — resumable recording upload primitives.
   *
   * The field app records offline and uploads later over whatever
   * connection it finds, so an upload is a series of small, independently
   * retryable parts rather than one long request. These methods only store
   * bytes; the consent gate lives in InterviewsService, which is the only
   * caller, exactly as with `upload()`.
   *
   * The upload id is generated on the device (it is the local recording's
   * id), which makes every step naturally idempotent across app restarts:
   *  - a part re-sent after a dropped response overwrites itself;
   *  - completion re-sent after a dropped response returns the Media row it
   *    already created instead of failing or duplicating it.
   * Object keys include the uploader, so one user can never write into
   * another user's in-flight upload even with a guessed id.
   */
  async putRecordingPart(
    uploadId: string,
    index: number,
    body: Buffer,
    userId: string,
    organizationId: string,
  ) {
    if (!body?.length) {
      throw new BadRequestException('No chunk content received');
    }
    if (!Number.isInteger(index) || index < 0 || index > MAX_RECORDING_PARTS) {
      throw new BadRequestException('Chunk index is out of range');
    }

    const { checksum } = await this.storage.putObject({
      key: this.recordingPartKey(organizationId, userId, uploadId, index),
      body,
      contentType: 'application/octet-stream',
      metadata: { uploadId, index: String(index) },
    });

    await this.prisma.$transaction([
      this.prisma.mediaChunk.deleteMany({
        where: { identifier: uploadId, index, uploadedById: userId },
      }),
      this.prisma.mediaChunk.create({
        data: {
          identifier: uploadId,
          index,
          size: body.length,
          checksum,
          uploadedById: userId,
        },
      }),
    ]);

    return { index, received: body.length, checksum };
  }

  async listRecordingParts(uploadId: string, userId: string) {
    const parts = await this.prisma.mediaChunk.findMany({
      where: { identifier: uploadId, uploadedById: userId },
      orderBy: { index: 'asc' },
      select: { index: true, size: true },
    });
    return parts;
  }

  /** The Media row a completed upload produced, if completion already ran. */
  async findCompletedRecording(
    uploadId: string,
    interviewId: string,
    organizationId: string,
  ) {
    return this.prisma.media.findFirst({
      where: {
        organizationId,
        interviewId,
        deletedAt: null,
        metadata: { path: ['uploadId'], equals: uploadId },
      },
    });
  }

  async completeRecordingUpload(
    uploadId: string,
    userId: string,
    organizationId: string,
    options: {
      interviewId: string;
      totalParts: number;
      mimeType: string;
      originalName: string;
      checksum?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const existing = await this.findCompletedRecording(
      uploadId,
      options.interviewId,
      organizationId,
    );
    if (existing) return existing;

    const baseMime = options.mimeType.split(';')[0].trim().toLowerCase();
    if (ALLOWED_MIME_TYPES[baseMime] !== MediaType.AUDIO) {
      throw new BadRequestException(
        `Recording type ${baseMime} is not an accepted audio format`,
      );
    }

    const parts = await this.listRecordingParts(uploadId, userId);
    const missing: number[] = [];
    for (let i = 0; i < options.totalParts; i++) {
      if (!parts.some((p) => p.index === i)) missing.push(i);
    }
    if (missing.length > 0 || parts.length !== options.totalParts) {
      throw new BadRequestException(
        `Upload is incomplete: missing part(s) ${missing.slice(0, 10).join(', ') || 'unknown'}`,
      );
    }

    const buffers: Buffer[] = [];
    for (const part of parts) {
      const stream = await this.storage.getObjectStream(
        this.recordingPartKey(organizationId, userId, uploadId, part.index),
      );
      buffers.push(await this.readStream(stream));
    }
    const body = Buffer.concat(buffers);

    if (body.length > this.maxFileBytes) {
      throw new BadRequestException(
        'Reassembled recording exceeds the maximum upload size',
      );
    }

    const id = uuidv4();
    const extension =
      path.extname(options.originalName).replace(/^\./, '') || 'webm';
    const key = this.storage.buildKey({
      organizationId,
      kind: 'media',
      id,
      extension,
    });

    const { checksum, bytes } = await this.storage.putObject({
      key,
      body,
      contentType: baseMime,
      metadata: { organizationId, uploadedBy: userId, uploadId },
    });

    if (options.checksum && options.checksum !== checksum) {
      // The device told us what it recorded and the bytes disagree. Keep
      // nothing: drop the assembled object and the parts, so the device
      // re-sends from scratch rather than resuming onto corrupt parts.
      await this.storage.deleteObject(key).catch(() => undefined);
      await this.discardRecordingParts(uploadId, userId, organizationId, parts);
      throw new BadRequestException(
        'Recording checksum mismatch; the upload was discarded and must be re-sent',
      );
    }

    const media = await this.prisma.media.create({
      data: {
        id,
        filename: path.basename(key),
        originalName: options.originalName,
        mimeType: baseMime,
        size: bytes,
        type: MediaType.AUDIO,
        processingStatus: ProcessingStatus.COMPLETED,
        path: key,
        checksum,
        metadata: jsonObject({ ...(options.metadata ?? {}), uploadId }),
        uploadedById: userId,
        organizationId,
        interviewId: options.interviewId,
      },
    });

    // Best-effort: the Media row is already durable.
    await this.discardRecordingParts(uploadId, userId, organizationId, parts);

    return media;
  }

  private async discardRecordingParts(
    uploadId: string,
    userId: string,
    organizationId: string,
    parts: { index: number }[],
  ) {
    await Promise.all(
      parts.map((part) =>
        this.storage
          .deleteObject(
            this.recordingPartKey(organizationId, userId, uploadId, part.index),
          )
          .catch(() => undefined),
      ),
    );
    await this.prisma.mediaChunk
      .deleteMany({ where: { identifier: uploadId, uploadedById: userId } })
      .catch(() => undefined);
  }

  private recordingPartKey(
    organizationId: string,
    userId: string,
    uploadId: string,
    index: number,
  ): string {
    return `org/${organizationId}/recording-parts/${userId}/${uploadId}/${String(index).padStart(6, '0')}`;
  }

  /** Tenant-scoped. All reads go through here. */
  async findById(id: string, organizationId: string) {
    const media = await this.prisma.media.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!media) {
      // Same response whether it does not exist or belongs to another tenant.
      throw new NotFoundException('Media not found');
    }

    return media;
  }

  /**
   * Returns a short-lived signed URL. The authorization decision happens here,
   * in `findById`; the URL itself carries no identity, so it must never be
   * minted before that check.
   */
  async getDownloadUrl(id: string, organizationId: string) {
    const media = await this.findById(id, organizationId);

    if (!(await this.storage.objectExists(media.path))) {
      throw new NotFoundException(
        'Stored object is missing for this media record',
      );
    }

    return {
      url: await this.storage.getSignedDownloadUrl(
        media.path,
        media.originalName,
      ),
      expiresIn: Number(process.env.SIGNED_URL_TTL_SECONDS ?? 900),
      media,
    };
  }

  async remove(id: string, organizationId: string) {
    const media = await this.findById(id, organizationId);

    // Soft-delete the row first; the object is removed by the retention job in
    // Phase 4, so a mis-click stays recoverable.
    return this.prisma.media.update({
      where: { id: media.id },
      data: { deletedAt: new Date() },
    });
  }

  async getStatus(id: string, organizationId: string) {
    const media = await this.findById(id, organizationId);
    return {
      id: media.id,
      filename: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      type: media.type,
      processingStatus: media.processingStatus,
      checksum: media.checksum,
      createdAt: media.createdAt,
    };
  }

  async listForOrganization(organizationId: string, type?: MediaType) {
    return this.prisma.media.findMany({
      where: { organizationId, deletedAt: null, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private chunkKey(
    organizationId: string,
    identifier: string,
    index: number,
  ): string {
    return `org/${organizationId}/chunks/${identifier}/${String(index).padStart(6, '0')}`;
  }

  private async readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private inferMediaType(mimeType: string): MediaType {
    const base = mimeType.split(';')[0].trim().toLowerCase();
    if (base.startsWith('image/')) return MediaType.IMAGE;
    if (base.startsWith('audio/')) return MediaType.AUDIO;
    if (base.startsWith('video/')) return MediaType.VIDEO;
    return MediaType.FILE;
  }

  private throwIfForeign(ownerOrgId: string, organizationId: string) {
    if (ownerOrgId !== organizationId) {
      throw new ForbiddenException('Resource not found in this organization');
    }
  }
}
