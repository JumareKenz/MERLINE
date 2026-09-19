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
export class ResearchDesignAgent extends SpecialistAgent {
  readonly agentType = 'research-design';
  readonly displayName = 'Research Design Agent';

  async process(params: { message: string; context: Record<string, unknown> }): Promise<string> {
    const contextInfo = '';
    return `[Research Design Agent] I have analyzed your study design query.\n\n` +
      `Your request: "${params.message}"${contextInfo}\n\n` +
      `Based on best practices in MERL research design, I recommend considering the following:\n` +
      `- Define clear research objectives aligned with your program's theory of change\n` +
      `- Select an appropriate study type (e.g., baseline, endline, cross-sectional, longitudinal)\n` +
      `- Determine sampling strategy (probability vs non-probability) and sample size\n` +
      `- Establish valid and reliable indicators with clear definitions\n` +
      `- Plan for data quality assurance throughout the research lifecycle\n` +
      `- Consider ethical considerations including informed consent and data privacy\n\n` +
      `Would you like me to elaborate on any of these aspects?`;
  }
}
