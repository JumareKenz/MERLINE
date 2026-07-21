import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { toJsonValue } from '../common/utils/prisma-json';

@Injectable()
export class ReportTemplatesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: { category?: string }) {
    const where: any = {};

    if (query.category) {
      where.category = query.category;
    }

    return this.prisma.reportTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Report template not found');
    }

    return template;
  }

  async create(dto: CreateReportTemplateDto, userId: string, organizationId: string) {
    return this.prisma.reportTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        config: toJsonValue(dto.config ?? {}),
        category: dto.category,
        isPublic: dto.isPublic ?? false,
        organizationId,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: UpdateReportTemplateDto) {
    await this.findById(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.config !== undefined) data.config = dto.config;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;

    return this.prisma.reportTemplate.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.reportTemplate.delete({
      where: { id },
    });
  }
}
