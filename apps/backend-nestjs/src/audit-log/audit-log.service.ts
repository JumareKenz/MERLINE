import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    event: string;
    auditableType: string;
    auditableId: string;
    userId?: string;
    organizationId?: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    ipAddress?: string;
    userAgent?: string;
    tags?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        event: params.event,
        auditableType: params.auditableType,
        auditableId: params.auditableId,
        userId: params.userId ?? null,
        organizationId: params.organizationId ?? null,
        oldValues: (params.oldValues ?? null) as any,
        newValues: (params.newValues ?? null) as any,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        tags: params.tags ?? null,
        checksum: null,
      },
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    event?: string;
    auditableType?: string;
    userId?: string;
    organizationId?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.event) where.event = query.event;
    if (query.auditableType) where.auditableType = query.auditableType;
    if (query.userId) where.userId = query.userId;
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.search) {
      where.OR = [
        { event: { contains: query.search, mode: 'insensitive' } },
        { auditableType: { contains: query.search, mode: 'insensitive' } },
        { auditableId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }
}
