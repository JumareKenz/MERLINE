import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';

/**
 * PHASE 1 — PLATFORM SAFETY · OBJECT STORAGE
 *
 * S3-compatible object storage (real S3, or MinIO/R2 via AWS_ENDPOINT). This
 * file and `storage.module.ts` were referenced throughout `src/` (app.module,
 * media.service, storage.integration.spec) but never present in git — the
 * repo's `.gitignore` had a blanket `storage/` rule left over from an earlier
 * Laravel scaffold, which silently matched this NestJS source directory too.
 * Removed from `.gitignore`; see that commit for detail.
 *
 * `putObject` always returns a SHA-256 checksum computed from the exact bytes
 * sent, independent of what S3 reports, so a corrupted upload is detectable
 * without trusting the remote side.
 */

export interface BuildKeyOptions {
  organizationId: string;
  kind: string;
  id: string;
  extension?: string;
}

export interface PutObjectOptions {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

interface AwsConfig {
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

interface StorageConfig {
  signedUrlTtlSeconds: string | number;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlTtlSeconds: number;
  private readonly serverSideEncryption?: 'AES256';

  constructor(config: ConfigService) {
    const aws = config.get<AwsConfig>('aws');
    const storage = config.get<StorageConfig>('storage');

    if (!aws?.bucket) {
      throw new Error('Missing required storage configuration: aws.bucket (AWS_BUCKET)');
    }

    this.bucket = aws.bucket;
    this.signedUrlTtlSeconds = Number(storage?.signedUrlTtlSeconds ?? 900);

    this.client = new S3Client({
      region: aws.region,
      endpoint: aws.endpoint || undefined,
      // Path-style is required by MinIO/most S3-compatible services; real S3
      // accepts it too, so this is safe either way.
      forcePathStyle: Boolean(aws.endpoint),
      credentials:
        aws.accessKeyId && aws.secretAccessKey
          ? { accessKeyId: aws.accessKeyId, secretAccessKey: aws.secretAccessKey }
          : undefined,
    });

    // STORAGE_SSE: explicit 'AES256' or 'off' wins. Otherwise default to SSE
    // for real S3 and no SSE for an S3-compatible endpoint — MinIO rejects
    // SSE headers unless KMS is configured, and DEPLOYMENT.md documents this
    // exact default.
    const sseEnv = process.env.STORAGE_SSE;
    if (sseEnv === 'AES256') {
      this.serverSideEncryption = 'AES256';
    } else if (sseEnv === 'off') {
      this.serverSideEncryption = undefined;
    } else {
      this.serverSideEncryption = aws.endpoint ? undefined : 'AES256';
    }
  }

  /** SHA-256 hex digest of the given bytes. Used both to compute and to verify. */
  static checksum(body: Buffer): string {
    return createHash('sha256').update(body).digest('hex');
  }

  /**
   * Deterministic, organization-prefixed object key so retention and consent
   * withdrawal can operate on a tenant's objects as a unit.
   */
  buildKey(options: BuildKeyOptions): string {
    const { organizationId, kind, id, extension } = options;
    const suffix = extension ? `.${extension.replace(/^\./, '')}` : '';
    return `org/${organizationId}/${kind}/${id}${suffix}`;
  }

  async putObject(options: PutObjectOptions): Promise<{ checksum: string; bytes: number }> {
    const checksum = StorageService.checksum(options.body);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
        Metadata: { ...options.metadata, checksum },
        ...(this.serverSideEncryption
          ? { ServerSideEncryption: this.serverSideEncryption }
          : {}),
      }),
    );

    return { checksum, bytes: options.body.length };
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      if (this.isNotFound(error)) return false;
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getObjectStream(key: string): Promise<NodeJS.ReadableStream> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return response.Body as NodeJS.ReadableStream;
  }

  /**
   * Short-lived signed GET URL. Callers are responsible for the authorization
   * check (e.g. tenant ownership) *before* calling this — the URL itself
   * carries no identity once minted.
   */
  async getSignedDownloadUrl(key: string, filename?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(filename
        ? {
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
          }
        : {}),
    });

    return getSignedUrl(this.client, command, { expiresIn: this.signedUrlTtlSeconds });
  }

  private isNotFound(error: unknown): boolean {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    return err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404;
  }
}
