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
export class IndicatorAgent extends SpecialistAgent {
  readonly agentType = 'indicator';
  readonly displayName = 'Indicator Agent';

  async process(params: { message: string; context: Record<string, unknown> }): Promise<string> {
    const indicatorContext = '';

    return `[Indicator Agent] Let me help you with your indicator-related query.\n\n` +
      `Your request: "${params.message}"${indicatorContext}\n\n` +
      `Key considerations for indicator development:\n` +
      `- Ensure indicators are SMART (Specific, Measurable, Achievable, Relevant, Time-bound)\n` +
      `- Define clear numerator and denominator for each indicator\n` +
      `- Establish baseline values and realistic targets\n` +
      `- Set data source and collection frequency\n` +
      `- Define disaggregation dimensions (e.g., gender, age, location)\n` +
      `- Set threshold values for performance alerts\n\n` +
      `Would you like me to suggest specific indicators or help refine existing ones?`;
  }
}
