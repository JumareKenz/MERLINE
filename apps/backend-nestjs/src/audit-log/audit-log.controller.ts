import {
  Controller, Get, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditLogService } from './audit-log.service';

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('event') event?: string,
    @Query('auditableType') auditableType?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: any,
  ) {
    return this.auditLogService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      event,
      auditableType,
      userId,
      organizationId: user.organizationId,
      search,
    });
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogService.findById(id);
  }
}
