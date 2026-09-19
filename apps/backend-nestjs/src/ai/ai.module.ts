import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiGatewayService } from './ai-gateway.service';
import { GuardrailService } from './guardrail.service';
import { RagService } from './rag.service';
import { PromptRegistryService } from './prompt-registry.service';

/**
 * PHASE 1: the nine specialist agents and their orchestrator are no longer
 * registered. See ai.controller.ts and LEGACY.md.
 */
@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiGatewayService,
    GuardrailService,
    RagService,
    PromptRegistryService,
  ],
  exports: [
    AiService,
    AiGatewayService,
    GuardrailService,
    RagService,
    PromptRegistryService,
  ],
})
export class AiModule {}
