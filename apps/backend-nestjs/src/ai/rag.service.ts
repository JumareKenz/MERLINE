import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class RagService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async search(query: string, organizationId: string, limit: number = 10) {
    const chunks = await this.prisma.documentChunk.findMany({
      where: {
        organizationId,
        content: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return chunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      source: chunk.source,
      metadata: chunk.metadata,
      documentId: chunk.documentId,
      score: this.computeRelevanceScore(query, chunk.content),
    })).sort((a, b) => b.score - a.score);
  }

  async ingestDocument(
    content: string,
    metadata: Record<string, unknown>,
    organizationId: string,
    userId: string,
    source?: string,
  ) {
    const chunkSize = 2000;
    const overlap = 200;
    const chunks: string[] = [];

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const chunk = content.slice(i, i + chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }

    const documentId = crypto.randomUUID();

    await this.prisma.documentChunk.createMany({
      data: chunks.map((chunkText) => ({
        content: chunkText,
        metadata: metadata as any,
        source,
        documentId,
        organizationId,
        createdById: userId,
      })),
    });
  }

  async getDocuments(organizationId: string) {
    const chunks = await this.prisma.documentChunk.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const grouped = new Map<string, { documentId: string; source: string | null; metadata: any; chunks: typeof chunks; createdAt: Date }>();

    for (const chunk of chunks) {
      const key = chunk.documentId ?? chunk.id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          documentId: key,
          source: chunk.source,
          metadata: chunk.metadata,
          chunks: [],
          createdAt: chunk.createdAt,
        });
      }
      grouped.get(key)!.chunks.push(chunk);
    }

    return Array.from(grouped.values()).map((doc) => ({
      documentId: doc.documentId,
      source: doc.source,
      metadata: doc.metadata,
      chunkCount: doc.chunks.length,
      createdAt: doc.createdAt,
    }));
  }

  private computeRelevanceScore(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const contentLower = content.toLowerCase();
    const matches = queryWords.filter((word) => contentLower.includes(word)).length;
    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }
}
