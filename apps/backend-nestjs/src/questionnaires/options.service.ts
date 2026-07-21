import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class OptionsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(questionId: string) {
    return this.prisma.questionOption.findMany({
      where: { questionId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    const option = await this.prisma.questionOption.findUnique({
      where: { id },
    });
    if (!option) throw new NotFoundException('Option not found');
    return option;
  }

  async create(questionId: string, dto: CreateOptionDto) {
    const maxOrder = await this.prisma.questionOption.aggregate({
      where: { questionId },
      _max: { sortOrder: true },
    });
    return this.prisma.questionOption.create({
      data: {
        text: dto.text,
        value: dto.value,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        questionId,
      },
    });
  }

  async update(id: string, dto: UpdateOptionDto) {
    await this.findById(id);
    return this.prisma.questionOption.update({
      where: { id },
      data: {
        text: dto.text,
        value: dto.value,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.questionOption.delete({ where: { id } });
  }

  async reorder(questionId: string, orderedIds: string[]) {
    const options = await this.prisma.questionOption.findMany({
      where: { questionId },
    });
    const existingIds = new Set(options.map((o) => o.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new NotFoundException(`Option ${id} not found in this question`);
      }
    }
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.questionOption.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return this.findAll(questionId);
  }
}
