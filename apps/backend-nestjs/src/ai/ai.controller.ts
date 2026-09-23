import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AiService } from './ai.service';
import { RagService } from './rag.service';
import { PromptRegistryService } from './prompt-registry.service';
import { ChatDto } from './dto/chat.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { RagSearchDto } from './dto/rag-search.dto';
import { RagIngestDto } from './dto/rag-ingest.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

@UseGuards(JwtAuthGuard)
/**
 * PHASE 1 — the nine specialist-agent routes are removed.
 *
 * They returned hard-coded template text and could not call a model: the
 * SpecialistAgent base class has no gateway dependency. With the fabricated
 * gateway fallback also gone, leaving them would have kept the one remaining
 * surface where static text is presented as AI output.
 *
 * Their source files stay on disk, unregistered, consistent with the Phase 0
 * deregistration discipline. A real qualitative analysis service — one that
 * must return evidence-linked findings — replaces them in Phase 2.
 */
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly ragService: RagService,
    private readonly promptRegistry: PromptRegistryService,
  ) {}

  @Post('chat')
  @Permissions('use.ai')
  async chat(@Body() dto: ChatDto, @CurrentUser() user: any) {
    return this.aiService.chat(
      dto.sessionId,
      dto.message,
      user.id,
      user.organizationId,
    );
  }

  @Get('sessions')
  @Permissions('use.ai')
  async listSessions(@CurrentUser() user: any) {
    return this.aiService.listSessions(user.organizationId, user.id);
  }

  @Post('sessions')
  @Permissions('use.ai')
  async createSession(@Body() dto: CreateSessionDto, @CurrentUser() user: any) {
    return this.aiService.createSession(dto, user.id, user.organizationId);
  }

  @Get('sessions/:id')
  @Permissions('use.ai')
  async getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.aiService.getSession(id, user.organizationId);
  }

  @Delete('sessions/:id')
  @Permissions('use.ai')
  async deleteSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.aiService.deleteSession(id, user.organizationId);
  }

  @Post('rag/search')
  @Permissions('use.ai')
  async ragSearch(@Body() dto: RagSearchDto, @CurrentUser() user: any) {
    return this.ragService.search(dto.query, user.organizationId, dto.limit);
  }

  @Post('rag/ingest')
  @Permissions('configure.ai')
  async ragIngest(@Body() dto: RagIngestDto, @CurrentUser() user: any) {
    await this.ragService.ingestDocument(
      dto.content,
      dto.metadata ?? {},
      user.organizationId,
      user.id,
      dto.source,
    );
    return { ingested: true };
  }

  @Get('rag/documents')
  @Permissions('view.ai')
  async ragDocuments(@CurrentUser() user: any) {
    return this.ragService.getDocuments(user.organizationId);
  }

  @Get('prompts')
  @Permissions('view.ai')
  async listPrompts(@CurrentUser() user: any) {
    return this.promptRegistry.listPrompts(user.organizationId);
  }

  @Post('prompts')
  @Permissions('configure.ai')
  async createPrompt(@Body() dto: CreatePromptDto, @CurrentUser() user: any) {
    return this.promptRegistry.createPrompt(dto, user.organizationId, user.id);
  }

  @Put('prompts/:id')
  @Permissions('configure.ai')
  async updatePrompt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromptDto,
  ) {
    return this.promptRegistry.updatePrompt(id, dto);
  }

  @Delete('prompts/:id')
  @Permissions('configure.ai')
  async deletePrompt(@Param('id', ParseUUIDPipe) id: string) {
    return this.promptRegistry.deletePrompt(id);
  }

  @Get('metrics')
  @Permissions('view.ai')
  async getMetrics(@CurrentUser() user: any) {
    return this.aiService.getMetrics(user.organizationId);
  }

  @Get('inferences')
  @Permissions('view.ai')
  async listInferences(@CurrentUser() user: any) {
    return this.aiService.listInferences(user.organizationId);
  }
}
