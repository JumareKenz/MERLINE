import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { RagService } from './rag.service';
import { PromptRegistryService } from './prompt-registry.service';
import { ChatDto } from './dto/chat.dto';
import { AgentRequestDto } from './dto/agent-request.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { RagSearchDto } from './dto/rag-search.dto';
import { RagIngestDto } from './dto/rag-ingest.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly ragService: RagService,
    private readonly promptRegistry: PromptRegistryService,
  ) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto, @CurrentUser() user: any) {
    return this.aiService.chat(dto.sessionId, dto.message, user.id, user.organizationId);
  }

  @Get('sessions')
  async listSessions(@CurrentUser() user: any) {
    return this.aiService.listSessions(user.organizationId, user.id);
  }

  @Post('sessions')
  async createSession(@Body() dto: CreateSessionDto, @CurrentUser() user: any) {
    return this.aiService.createSession(dto, user.id, user.organizationId);
  }

  @Get('sessions/:id')
  async getSession(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.aiService.getSession(id, user.organizationId);
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.aiService.deleteSession(id, user.organizationId);
  }

  @Post('agents/research-design')
  async researchDesignAgent(@Body() dto: AgentRequestDto, @CurrentUser() user: any) {
    return this.aiService.dispatchAgent('research-design', dto.message, dto.context ?? {}, user.organizationId);
  }

  @Post('agents/survey-design')
  async surveyDesignAgent(@Body() dto: AgentRequestDto, @CurrentUser() user: any) {
    return this.aiService.dispatchAgent('survey-design', dto.message, dto.context ?? {}, user.organizationId);
  }

  @Post('agents/indicator')
  async indicatorAgent(@Body() dto: AgentRequestDto, @CurrentUser() user: any) {
    return this.aiService.dispatchAgent('indicator', dto.message, dto.context ?? {}, user.organizationId);
  }

  @Post('agents/data-quality')
  async dataQualityAgent(@Body() dto: AgentRequestDto, @CurrentUser() user: any) {
    return this.aiService.dispatchAgent('data-quality', dto.message, dto.context ?? {}, user.organizationId);
  }

  @Post('agents/reporting')
  async reportingAgent(@Body() dto: AgentRequestDto, @CurrentUser() user: any) {
    return this.aiService.dispatchAgent('reporting', dto.message, dto.context ?? {}, user.organizationId);
  }

  @Post('agents/knowledge')
  async knowledgeAgent(@Body() dto: AgentRequestDto, @CurrentUser() user: any) {
    return this.aiService.dispatchAgent('knowledge', dto.message, dto.context ?? {}, user.organizationId);
  }

  @Post('agents/qualitative')
  async qualitativeAgent(@Body() dto: AgentRequestDto, @CurrentUser() user: any) {
    return this.aiService.dispatchAgent('qualitative', dto.message, dto.context ?? {}, user.organizationId);
  }

  @Post('agents/executive')
  async executiveAgent(@Body() dto: AgentRequestDto, @CurrentUser() user: any) {
    return this.aiService.dispatchAgent('executive', dto.message, dto.context ?? {}, user.organizationId);
  }

  @Post('agents/translation')
  async translationAgent(@Body() dto: AgentRequestDto, @CurrentUser() user: any) {
    return this.aiService.dispatchAgent('translation', dto.message, dto.context ?? {}, user.organizationId);
  }

  @Post('rag/search')
  async ragSearch(@Body() dto: RagSearchDto, @CurrentUser() user: any) {
    return this.ragService.search(dto.query, user.organizationId, dto.limit);
  }

  @Post('rag/ingest')
  async ragIngest(@Body() dto: RagIngestDto, @CurrentUser() user: any) {
    await this.ragService.ingestDocument(dto.content, dto.metadata ?? {}, user.organizationId, user.id, dto.source);
    return { ingested: true };
  }

  @Get('rag/documents')
  async ragDocuments(@CurrentUser() user: any) {
    return this.ragService.getDocuments(user.organizationId);
  }

  @Get('prompts')
  async listPrompts(@CurrentUser() user: any) {
    return this.promptRegistry.listPrompts(user.organizationId);
  }

  @Post('prompts')
  async createPrompt(@Body() dto: CreatePromptDto, @CurrentUser() user: any) {
    return this.promptRegistry.createPrompt(dto, user.organizationId, user.id);
  }

  @Put('prompts/:id')
  async updatePrompt(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePromptDto) {
    return this.promptRegistry.updatePrompt(id, dto);
  }

  @Delete('prompts/:id')
  async deletePrompt(@Param('id', ParseUUIDPipe) id: string) {
    return this.promptRegistry.deletePrompt(id);
  }

  @Get('metrics')
  async getMetrics(@CurrentUser() user: any) {
    return this.aiService.getMetrics(user.organizationId);
  }

  @Get('inferences')
  async listInferences(@CurrentUser() user: any) {
    return this.aiService.listInferences(user.organizationId);
  }
}
