import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { PullDto } from './dto/pull.dto';
import { PushDto } from './dto/push.dto';
import { SyncAction, SyncStatus } from '@prisma/client';

const ENTITY_MODEL_MAP: Record<string, string> = {
  assignment: 'assignment',
  submission: 'submission',
  media: 'media',
  study: 'study',
  questionnaire: 'questionnaire',
};

@Injectable()
export class SyncService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async pull(dto: PullDto, userId: string, organizationId: string) {
    const since = dto.lastSyncedAt ? new Date(dto.lastSyncedAt) : new Date(0);
    const entityTypes = dto.entityTypes || Object.keys(ENTITY_MODEL_MAP);

    const results: Record<string, any[]> = {};

    for (const entityType of entityTypes) {
      const model = ENTITY_MODEL_MAP[entityType];
      if (!model) continue;

      const records = await this.fetchUpdatedRecords(model, since, organizationId);
      results[entityType] = records;
    }

    return {
      data: results,
      syncedAt: new Date().toISOString(),
      deviceId: dto.deviceId,
    };
  }

  async push(dto: PushDto, userId: string, organizationId: string) {
    const results: any[] = [];
    const batchId = crypto.randomUUID();

    await this.prisma.syncBatch.create({
      data: {
        batchId,
        entityType: 'mixed',
        totalItems: dto.changes.length,
        organizationId,
        userId,
      },
    });

    for (const item of dto.changes) {
      try {
        const model = ENTITY_MODEL_MAP[item.entityType];
        if (!model) {
          results.push({
            entityId: item.entityId,
            entityType: item.entityType,
            status: 'skipped',
            reason: `Unknown entity type: ${item.entityType}`,
          });
          continue;
        }

        await this.applyChange(model, item, organizationId);

        await this.prisma.syncLog.create({
          data: {
            action: item.action,
            entityType: item.entityType,
            entityId: item.entityId,
            payload: item.payload as any,
            status: SyncStatus.SYNCED,
            deviceId: item.deviceId || dto.deviceId,
            organizationId,
            userId,
            syncedAt: new Date(),
          },
        });

        results.push({
          entityId: item.entityId,
          entityType: item.entityType,
          action: item.action,
          status: 'synced',
        });
      } catch (error: any) {
        await this.prisma.syncLog.create({
          data: {
            action: item.action,
            entityType: item.entityType,
            entityId: item.entityId,
            payload: item.payload as any,
            status: SyncStatus.FAILED,
            conflict: { error: error.message } as any,
            deviceId: item.deviceId || dto.deviceId,
            organizationId,
            userId,
          },
        });

        results.push({
          entityId: item.entityId,
          entityType: item.entityType,
          action: item.action,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const failed = results.filter((r) => r.status === 'failed').length;
    await this.prisma.syncBatch.update({
      where: { id: batchId },
      data: {
        processedItems: dto.changes.length,
        failedItems: failed,
        status: failed > 0 ? 'completed_with_errors' : 'completed',
        completedAt: new Date(),
      },
    });

    return {
      results,
      syncedAt: new Date().toISOString(),
      total: dto.changes.length,
      synced: results.filter((r) => r.status === 'synced').length,
      failed,
    };
  }

  async getStatus(organizationId: string) {
    const totalLogs = await this.prisma.syncLog.count({
      where: { organizationId },
    });

    const pendingLogs = await this.prisma.syncLog.count({
      where: { organizationId, status: SyncStatus.PENDING },
    });

    const failedLogs = await this.prisma.syncLog.count({
      where: { organizationId, status: SyncStatus.FAILED },
    });

    const lastSync = await this.prisma.syncLog.findFirst({
      where: { organizationId, status: SyncStatus.SYNCED },
      orderBy: { syncedAt: 'desc' },
    });

    const recentBatches = await this.prisma.syncBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      totalLogs,
      pendingLogs,
      failedLogs,
      lastSyncAt: lastSync?.syncedAt || null,
      recentBatches,
    };
  }

  async getLog(organizationId: string, query: { status?: SyncStatus; entityType?: string; limit?: number; offset?: number }) {
    const where: any = { organizationId };

    if (query.status) where.status = query.status;
    if (query.entityType) where.entityType = query.entityType;

    const [items, total] = await Promise.all([
      this.prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit || 100,
        skip: query.offset || 0,
      }),
      this.prisma.syncLog.count({ where }),
    ]);

    return { items, total };
  }

  async fullSync(organizationId: string, userId: string) {
    const batchId = crypto.randomUUID();
    let totalItems = 0;
    const entityResults: Record<string, any[]> = {};

    for (const [entityType, model] of Object.entries(ENTITY_MODEL_MAP)) {
      const records = await this.getAllRecords(model, organizationId);
      entityResults[entityType] = records;
      totalItems += records.length;
    }

    await this.prisma.syncBatch.create({
      data: {
        batchId,
        entityType: 'full',
        totalItems,
        processedItems: totalItems,
        status: 'completed',
        organizationId,
        userId,
        completedAt: new Date(),
      },
    });

    return {
      batchId,
      data: entityResults,
      totalItems,
      syncedAt: new Date().toISOString(),
    };
  }

  private async fetchUpdatedRecords(model: string, since: Date, organizationId: string): Promise<any[]> {
    const delegate = (this.prisma as any)[model];
    if (!delegate || typeof delegate.findMany !== 'function') return [];

    return delegate.findMany({
      where: {
        organizationId,
        updatedAt: { gte: since },
      },
    });
  }

  private async getAllRecords(model: string, organizationId: string): Promise<any[]> {
    const delegate = (this.prisma as any)[model];
    if (!delegate || typeof delegate.findMany !== 'function') return [];

    return delegate.findMany({
      where: { organizationId },
    });
  }

  private async applyChange(model: string, item: { action: SyncAction; entityId: string; payload: Record<string, unknown> }, organizationId: string) {
    const delegate = (this.prisma as any)[model];
    if (!delegate) {
      throw new Error(`Unknown model: ${model}`);
    }

    switch (item.action) {
      case SyncAction.CREATE: {
        const data = { ...item.payload, organizationId } as any;
        delete data.id;
        await delegate.create({ data });
        break;
      }
      case SyncAction.UPDATE: {
        const existing = await delegate.findUnique({ where: { id: item.entityId } });
        if (existing) {
          const serverUpdatedAt = new Date(existing.updatedAt).getTime();
          const clientUpdatedAt = item.payload.updatedAt ? new Date(item.payload.updatedAt as string).getTime() : 0;

          if (clientUpdatedAt >= serverUpdatedAt) {
            const data = { ...item.payload } as any;
            delete data.id;
            delete data.organizationId;
            delete data.createdAt;
            await delegate.update({ where: { id: item.entityId }, data });
          }
        }
        break;
      }
      case SyncAction.DELETE: {
        const existing = await delegate.findUnique({ where: { id: item.entityId } });
        if (existing) {
          if (typeof delegate.update === 'function' && existing.deletedAt !== undefined) {
            await delegate.update({ where: { id: item.entityId }, data: { deletedAt: new Date() } });
          } else {
            await delegate.delete({ where: { id: item.entityId } });
          }
        }
        break;
      }
    }
  }
}
