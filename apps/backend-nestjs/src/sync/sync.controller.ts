import {
  Controller, Get, Post, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { PullDto } from './dto/pull.dto';
import { PushDto } from './dto/push.dto';
import { SyncStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('sync/pull')
  async pull(
    @Body() dto: PullDto,
    @CurrentUser() user: any,
  ) {
    return this.syncService.pull(dto, user.id, user.organizationId);
  }

  @Post('sync/push')
  async push(
    @Body() dto: PushDto,
    @CurrentUser() user: any,
  ) {
    return this.syncService.push(dto, user.id, user.organizationId);
  }

  @Get('sync/status')
  async getStatus(@CurrentUser() user: any) {
    return this.syncService.getStatus(user.organizationId);
  }

  @Get('sync/log')
  async getLog(
    @CurrentUser() user: any,
    @Query('status') status?: SyncStatus,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.syncService.getLog(user.organizationId, {
      status,
      entityType,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Post('sync/full')
  async fullSync(@CurrentUser() user: any) {
    return this.syncService.fullSync(user.organizationId, user.id);
  }
}
