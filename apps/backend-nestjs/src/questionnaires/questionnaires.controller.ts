import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuestionnairesService } from './questionnaires.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';

@UseGuards(JwtAuthGuard)
@Controller('questionnaires')
export class QuestionnairesController {
  constructor(private readonly questionnairesService: QuestionnairesService) {}

  @Get()
  async findAll(
    @Query('studyId') studyId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.questionnairesService.findAll({
      studyId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Post()
  async create(
    @Body() dto: CreateQuestionnaireDto,
    @CurrentUser() user: any,
  ) {
    return this.questionnairesService.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionnairesService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionnaireDto,
  ) {
    return this.questionnairesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionnairesService.remove(id);
  }

  @Post(':id/clone')
  async clone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.questionnairesService.clone(id, user.id, user.organizationId);
  }

  @Post(':id/publish')
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionnairesService.publish(id);
  }

  @Post(':id/archive')
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionnairesService.archive(id);
  }

  @Get(':id/tree')
  async getTree(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionnairesService.getTree(id);
  }

  @Post(':id/review')
  async submitForReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionnairesService.submitForReview(id);
  }

  @Post(':id/approve-revision')
  async approveRevision(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionnairesService.approveRevision(id);
  }

  @Get('export/:id')
  async exportJson(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionnairesService.exportJson(id);
  }

  @Post('import')
  async importJson(
    @Body() body: { data: any; studyId: string },
    @CurrentUser() user: any,
  ) {
    return this.questionnairesService.importJson(body.data, body.studyId, user.id, user.organizationId);
  }
}
