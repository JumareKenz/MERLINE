import { Injectable, NotFoundException, BadRequestException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { InitChunkedUploadDto } from './dto/init-chunked-upload.dto';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { MediaType, ProcessingStatus } from '@prisma/client';
import { createReadStream } from 'fs';

const UPLOADS_ROOT = path.resolve(process.env.UPLOADS_DIR || 'uploads');

const ALLOWED_MIME_TYPES: Record<string, MediaType> = {
  'image/jpeg': MediaType.IMAGE,
  'image/png': MediaType.IMAGE,
  'image/gif': MediaType.IMAGE,
  'image/webp': MediaType.IMAGE,
  'image/svg+xml': MediaType.IMAGE,
  'audio/mpeg': MediaType.AUDIO,
  'audio/wav': MediaType.AUDIO,
  'audio/ogg': MediaType.AUDIO,
  'audio/mp4': MediaType.AUDIO,
  'video/mp4': MediaType.VIDEO,
  'video/mpeg': MediaType.VIDEO,
  'video/webm': MediaType.VIDEO,
  'video/quicktime': MediaType.VIDEO,
  'application/pdf': MediaType.FILE,
  'application/msword': MediaType.FILE,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': MediaType.FILE,
  'application/vnd.ms-excel': MediaType.FILE,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': MediaType.FILE,
  'text/csv': MediaType.FILE,
  'application/json': MediaType.FILE,
  'text/plain': MediaType.FILE,
  'image/signature': MediaType.SIGNATURE,
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

@Injectable()
export class MediaService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
    if (!fs.existsSync(UPLOADS_ROOT)) {
      fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, dto: { type?: MediaType; submissionId?: string; metadata?: Record<string, unknown> }, userId: string, organizationId: string) {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const allowedType = ALLOWED_MIME_TYPES[file.mimetype];
    if (!allowedType && !dto.type) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    const id = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${id}${ext}`;
    const subDir = this.getDateSubDir();
    const relativePath = path.join(subDir, filename);
    const absolutePath = path.join(UPLOADS_ROOT, relativePath);

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, file.buffer);

    const mediaType = dto.type || this.inferMediaType(file.mimetype);

    return this.prisma.media.create({
      data: {
        id,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        type: mediaType,
        processingStatus: ProcessingStatus.COMPLETED,
        path: relativePath,
        checksum: dto.metadata?.checksum as string | undefined,
        metadata: (dto.metadata || {}) as any,
        submissionId: dto.submissionId || null,
        uploadedById: userId,
        organizationId,
      },
    });
  }

  async initChunkedUpload(dto: InitChunkedUploadDto, userId: string) {
    const identifier = uuidv4();

    const mediaType = dto.type || this.inferMediaType(dto.mimeType);

    return {
      identifier,
      uploadUrl: `/media/chunked/${identifier}`,
      expiresIn: 86400,
      mediaType,
    };
  }

  async uploadChunk(identifier: string, file: Express.Multer.File, index: number, userId: string) {
    const chunkDir = path.join(UPLOADS_ROOT, 'chunks', identifier);
    fs.mkdirSync(chunkDir, { recursive: true });

    const chunkPath = path.join(chunkDir, `chunk-${index}`);
    fs.writeFileSync(chunkPath, file.buffer);

    await this.prisma.mediaChunk.create({
      data: {
        identifier,
        index,
        size: file.size,
        checksum: undefined,
        uploadedById: userId,
      },
    });

    return { identifier, chunkIndex: index, received: file.size };
  }

  async completeChunkedUpload(identifier: string, userId: string, organizationId: string, submissionId?: string) {
    const chunks = await this.prisma.mediaChunk.findMany({
      where: { identifier },
      orderBy: { index: 'asc' },
    });

    if (chunks.length === 0) {
      throw new BadRequestException('No chunks found for this identifier');
    }

    const id = uuidv4();
    const chunkDir = path.join(UPLOADS_ROOT, 'chunks', identifier);
    const firstChunkMeta = chunks[0];

    const mimeType = 'application/octet-stream';
    const mediaType = MediaType.FILE;
    const ext = '';
    const filename = `${id}${ext}`;
    const subDir = this.getDateSubDir();
    const relativePath = path.join(subDir, filename);
    const absolutePath = path.join(UPLOADS_ROOT, relativePath);

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

    const writeStream = fs.createWriteStream(absolutePath);
    let totalSize = 0;

    for (const chunk of chunks) {
      const chunkPath = path.join(chunkDir, `chunk-${chunk.index}`);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
      totalSize += data.length;
      fs.unlinkSync(chunkPath);
    }

    writeStream.end();

    fs.rmdirSync(chunkDir, { recursive: true });

    const media = await this.prisma.media.create({
      data: {
        id,
        filename,
        originalName: `chunked-${identifier}`,
        mimeType,
        size: totalSize,
        type: mediaType,
        processingStatus: ProcessingStatus.COMPLETED,
        path: relativePath,
        submissionId: submissionId || null,
        uploadedById: userId,
        organizationId,
      },
    });

    await this.prisma.mediaChunk.deleteMany({
      where: { identifier },
    });

    return media;
  }

  async findById(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: { submission: true },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException('Media not found');
    }

    return media;
  }

  async download(id: string) {
    const media = await this.findById(id);
    const absolutePath = path.join(UPLOADS_ROOT, media.path);

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('File not found on disk');
    }

    const stream = createReadStream(absolutePath);
    return { stream, media };
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.media.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStatus(id: string) {
    const media = await this.findById(id);
    return {
      id: media.id,
      filename: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      type: media.type,
      processingStatus: media.processingStatus,
      createdAt: media.createdAt,
    };
  }

  async getSubmissionMedia(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return this.prisma.media.findMany({
      where: { submissionId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getDateSubDir(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return path.join(String(year), month, day);
  }

  private inferMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('audio/')) return MediaType.AUDIO;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    return MediaType.FILE;
  }
}
