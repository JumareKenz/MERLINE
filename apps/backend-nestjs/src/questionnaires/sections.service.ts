import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Injectable()
export class SectionsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(questionnaireId: string) {
    return this.prisma.section.findMany({
      where: { questionnaireId },
      orderBy: { sortOrder: 'asc' },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
            skipLogic: true,
            validations: true,
            translations: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
            skipLogic: true,
            validations: true,
            translations: true,
          },
        },
      },
    });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  async create(questionnaireId: string, dto: CreateSectionDto) {
    const maxOrder = await this.prisma.section.aggregate({
      where: { questionnaireId },
      _max: { sortOrder: true },
    });
    return this.prisma.section.create({
      data: {
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        questionnaireId,
      },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
            skipLogic: true,
            validations: true,
            translations: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateSectionDto) {
    await this.findById(id);
    return this.prisma.section.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder,
      },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
            skipLogic: true,
            validations: true,
            translations: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.section.delete({ where: { id } });
  }

  async reorder(questionnaireId: string, orderedIds: string[]) {
    const sections = await this.prisma.section.findMany({
      where: { questionnaireId },
    });
    const existingIds = new Set(sections.map((s) => s.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new NotFoundException(`Section ${id} not found in this questionnaire`);
      }
    }
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.section.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return this.findAll(questionnaireId);
  }
}
