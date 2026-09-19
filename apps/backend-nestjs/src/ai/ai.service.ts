import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { AiGatewayService } from './ai-gateway.service';
import { GuardrailService } from './guardrail.service';
import { RagService } from './rag.service';
import { PromptRegistryService } from './prompt-registry.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { toJsonValue } from '../common/utils/prisma-json';

@Injectable()
export class AiService extends BaseService {
  constructor(
    prisma: PrismaService,
    private readonly aiGateway: AiGatewayService,
    private readonly guardrail: GuardrailService,
    private readonly rag: RagService,
    private readonly promptRegistry: PromptRegistryService,
  ) {
    super(prisma);
  }

  async chat(sessionId: string | undefined, message: string, userId: string, organizationId: string) {
    const inputCheck = this.guardrail.checkInput(message);
    if (!inputCheck.passed) {
      return { reply: `I cannot process this request: ${inputCheck.reason}` };
    }

    let session;
    if (sessionId) {
      session = await this.prisma.aiSession.findFirst({
        where: { id: sessionId, organizationId, deletedAt: null },
      });
      if (!session) {
        throw new NotFoundException('Session not found');
      }
    } else {
      session = await this.prisma.aiSession.create({
        data: {
          title: message.substring(0, 100),
          organizationId,
          userId,
        },
      });
    }

    await this.prisma.aiMessage.create({
      data: {
        role: 'user',
        content: message,
        sessionId: session.id,
      },
    });

    const context = {
      sessionId: session.id,
      organizationId,
      userId,
      ...(session.context as Record<string, unknown>),
    };

    const ragResults = await this.rag
      .search(message, organizationId, 3)
      .catch(() => []);

    const ragContext =
      ragResults.length > 0
        ? [
            '',
            '',
            'Relevant excerpts from the knowledge base:',
            ...ragResults.map((d) => `- ${d.content.substring(0, 500)}`),
          ].join('\n')
        : '';

    // PHASE 1: the user's message goes to the model directly.
    //
    // It was previously wrapped around `orchestrator.dispatchToAgent(...)`,
    // which injected a hard-coded block of MERL advice into the prompt. That
    // primed every answer with static text and made the agents look
    // functional. The agents are deregistered; this sends the real question.
    const fullPrompt = `${message}${ragContext}`;

    const systemPrompt =
      'You are a research assistant for a qualitative interview platform. ' +
      'Answer concisely and only from what you are given. If the knowledge ' +
      'base excerpts do not support an answer, say so rather than inferring.';

    let finalResponse: string;
    let model = 'unknown';
    let provider = 'unknown';
    let inputTokens = 0;
    let outputTokens = 0;
    let cost = 0;
    let latencyMs = 0;

    // PHASE 1: no fabrication fallback.
    //
    // This used to be wrapped in `catch { finalResponse = agentResponse; }`,
    // so a provider failure silently returned the static agent template as
    // though the model had produced it — the same defect as the gateway's
    // simulated response, one layer up. Errors now propagate to the caller.
    const gatewayResult = await this.aiGateway.sendMessage({
      message: fullPrompt,
      systemPrompt,
    });

    finalResponse = gatewayResult.content;
    model = gatewayResult.model;
    provider = gatewayResult.provider;
    inputTokens = gatewayResult.usage.inputTokens;
    outputTokens = gatewayResult.usage.outputTokens;
    cost = gatewayResult.usage.cost;
    latencyMs = gatewayResult.usage.latencyMs;

    const outputCheck = this.guardrail.checkOutput(finalResponse);
    if (!outputCheck.passed) {
      finalResponse = `I generated a response but it was filtered for safety. Please rephrase your question.`;
    }

    await this.prisma.aiMessage.create({
      data: {
        role: 'assistant',
        content: finalResponse,
        meta: { model, provider, ragHits: ragResults.length },
        sessionId: session.id,
      },
    });

    await this.prisma.aiInference.create({
      data: {
        model,
        provider,
        inputTokens,
        outputTokens,
        cost,
        latencyMs,
        organizationId,
        userId,
      },
    });

    return {
      reply: finalResponse,
      sessionId: session.id,
      usage: { inputTokens, outputTokens, cost, latencyMs },
    };
  }

  async listSessions(organizationId: string, userId: string) {
    return this.prisma.aiSession.findMany({
      where: { organizationId, userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async createSession(dto: CreateSessionDto, userId: string, organizationId: string) {
    return this.prisma.aiSession.create({
      data: {
        title: dto.title,
        context: toJsonValue(dto.context ?? {}),
        organizationId,
        userId,
      },
    });
  }

  async getSession(id: string, organizationId: string) {
    const session = await this.prisma.aiSession.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async deleteSession(id: string, organizationId: string) {
    const session = await this.prisma.aiSession.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.aiSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }


  async getMetrics(organizationId: string) {
    const [totalInferences, totalCost, avgLatency, recentInferences] = await Promise.all([
      this.prisma.aiInference.count({ where: { organizationId } }),
      this.prisma.aiInference.aggregate({
        where: { organizationId },
        _sum: { cost: true },
      }),
      this.prisma.aiInference.aggregate({
        where: { organizationId },
        _avg: { latencyMs: true },
      }),
      this.prisma.aiInference.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalInferences,
      totalCost: totalCost._sum.cost ?? 0,
      avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
      recentActivity: recentInferences,
    };
  }

  async listInferences(organizationId: string, limit: number = 50) {
    return this.prisma.aiInference.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }
}
