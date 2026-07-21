import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class ValidationsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(questionId: string) {
    return this.prisma.questionValidation.findMany({
      where: { questionId },
    });
  }

  async findById(id: string) {
    const validation = await this.prisma.questionValidation.findUnique({ where: { id } });
    if (!validation) throw new NotFoundException('Validation rule not found');
    return validation;
  }

  async create(questionId: string, dto: { rule: string; value?: string; message?: string }) {
    return this.prisma.questionValidation.create({
      data: {
        rule: dto.rule,
        value: dto.value,
        message: dto.message,
        questionId,
      },
    });
  }

  async update(id: string, dto: { rule?: string; value?: string; message?: string }) {
    await this.findById(id);
    return this.prisma.questionValidation.update({
      where: { id },
      data: {
        rule: dto.rule,
        value: dto.value,
        message: dto.message,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.questionValidation.delete({ where: { id } });
  }
}
