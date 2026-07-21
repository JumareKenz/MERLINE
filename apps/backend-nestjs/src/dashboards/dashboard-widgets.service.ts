import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { toJsonValue } from '../common/utils/prisma-json';

@Injectable()
export class DashboardWidgetsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll() {
    return this.prisma.dashboardWidget.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    const widget = await this.prisma.dashboardWidget.findUnique({
      where: { id },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    return widget;
  }

  async create(dto: CreateWidgetDto, userId: string, organizationId: string) {
    return this.prisma.dashboardWidget.create({
      data: {
        type: dto.type,
        title: dto.title,
        config: toJsonValue(dto.config ?? {}),
        sortOrder: dto.sortOrder ?? 0,
        isVisible: dto.isVisible ?? true,
        organizationId,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateWidgetDto>) {
    await this.findById(id);

    const data: any = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.config !== undefined) data.config = dto.config;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isVisible !== undefined) data.isVisible = dto.isVisible;

    return this.prisma.dashboardWidget.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.dashboardWidget.delete({
      where: { id },
    });
  }
}
