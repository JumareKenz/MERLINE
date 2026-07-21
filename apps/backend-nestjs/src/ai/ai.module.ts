import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiGatewayService } from './ai-gateway.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { GuardrailService } from './guardrail.service';
import { RagService } from './rag.service';
import { PromptRegistryService } from './prompt-registry.service';
import { ResearchDesignAgent } from './research-design-agent';
import { SurveyDesignAgent } from './survey-design-agent';
import { IndicatorAgent } from './indicator-agent';
import { DataQualityAgent } from './data-quality-agent';
import { ReportingAgent } from './reporting-agent';
import { KnowledgeAgent } from './knowledge-agent';
import { QualitativeAgent } from './qualitative-agent';
import { ExecutiveAgent } from './executive-agent';
import { TranslationAgent } from './translation-agent';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiGatewayService,
    AgentOrchestratorService,
    GuardrailService,
    RagService,
    PromptRegistryService,
    ResearchDesignAgent,
    SurveyDesignAgent,
    IndicatorAgent,
    DataQualityAgent,
    ReportingAgent,
    KnowledgeAgent,
    QualitativeAgent,
    ExecutiveAgent,
    TranslationAgent,
  ],
  exports: [
    AiService,
    AiGatewayService,
    AgentOrchestratorService,
    GuardrailService,
    RagService,
    PromptRegistryService,
  ],
})
export class AiModule {}
