import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class SkipLogicService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(questionId: string) {
    return this.prisma.skipLogic.findMany({
      where: { questionId },
    });
  }

  async findById(id: string) {
    const rule = await this.prisma.skipLogic.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Skip logic rule not found');
    return rule;
  }

  async create(questionId: string, dto: { condition: any; action: string; targetId?: string }) {
    return this.prisma.skipLogic.create({
      data: {
        condition: dto.condition,
        action: dto.action,
        targetId: dto.targetId,
        questionId,
      },
    });
  }

  async update(id: string, dto: { condition?: any; action?: string; targetId?: string }) {
    await this.findById(id);
    return this.prisma.skipLogic.update({
      where: { id },
      data: {
        condition: dto.condition,
        action: dto.action,
        targetId: dto.targetId,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.skipLogic.delete({ where: { id } });
  }
}
