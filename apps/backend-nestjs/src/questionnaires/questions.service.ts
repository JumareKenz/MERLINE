import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(sectionId: string) {
    return this.prisma.question.findMany({
      where: { sectionId },
      orderBy: { sortOrder: 'asc' },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        skipLogic: true,
        validations: true,
        translations: true,
      },
    });
  }

  async findById(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        skipLogic: true,
        validations: true,
        translations: true,
      },
    });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async create(sectionId: string, dto: CreateQuestionDto) {
    const maxOrder = await this.prisma.question.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    return this.prisma.question.create({
      data: {
        text: dto.text,
        description: dto.description,
        type: dto.type,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        isRequired: dto.isRequired ?? false,
        sectionId,
      },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        skipLogic: true,
        validations: true,
        translations: true,
      },
    });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    await this.findById(id);
    return this.prisma.question.update({
      where: { id },
      data: {
        text: dto.text,
        description: dto.description,
        type: dto.type,
        sortOrder: dto.sortOrder,
        isRequired: dto.isRequired,
      },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        skipLogic: true,
        validations: true,
        translations: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.question.delete({ where: { id } });
  }

  async reorder(sectionId: string, orderedIds: string[]) {
    const questions = await this.prisma.question.findMany({
      where: { sectionId },
    });
    const existingIds = new Set(questions.map((q) => q.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new NotFoundException(`Question ${id} not found in this section`);
      }
    }
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.question.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return this.findAll(sectionId);
  }
}
