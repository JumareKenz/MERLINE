/**
 * PHASE 1 — legacy query removal.
 *
 * This agent previously enriched its reply with counts read from deregistered
 * MERL tables. An active module must not query tables whose owning module is
 * frozen, so those lookups are gone along with the PrismaService dependency.
 *
 * NOTE: the reply below is still a hard-coded template — this agent does not
 * call a language model, and cannot: the SpecialistAgent base class has no
 * gateway dependency. Removing the nine specialist agents is Phase 2 work,
 * tracked in LEGACY.md. It was deliberately not folded into Phase 1.
 */
import { Injectable } from '@nestjs/common';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class DataQualityAgent extends SpecialistAgent {
  readonly agentType = 'data-quality';
  readonly displayName = 'Data Quality Agent';

  async process(params: { message: string; context: Record<string, unknown> }): Promise<string> {
    const qualityContext = '';

    return `[Data Quality Agent] Let me help you with data quality assessment.\n\n` +
      `Your request: "${params.message}"${qualityContext}\n\n` +
      `Key data quality dimensions to consider:\n` +
      `- Completeness: Are all required fields filled?\n` +
      `- Accuracy: Do values fall within expected ranges?\n` +
      `- Consistency: Are there contradictions across related fields?\n` +
      `- Timeliness: Was data collected within the planned timeframe?\n` +
      `- Uniqueness: Are there duplicate submissions or records?\n\n` +
      `I can help you set up automated quality checks, define validation rules, or review flagged submissions.`;
  }
}
