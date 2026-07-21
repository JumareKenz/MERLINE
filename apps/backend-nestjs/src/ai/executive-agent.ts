import { Injectable } from '@nestjs/common';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class ExecutiveAgent extends SpecialistAgent {
  readonly agentType = 'executive';
  readonly displayName = 'Executive Agent';

  async process(params: { message: string; context: Record<string, unknown> }): Promise<string> {
    const ctx = this.buildContextString(params.context);
    return `[Executive Agent] I have synthesized the strategic overview.\n\n` +
      `Your request: "${params.message}"${ctx}\n\n` +
      `Here is a strategic summary across your MERL portfolio:\n` +
      `- Overall portfolio health and key performance indicators\n` +
      `- Cross-study trends, patterns, and outlier identification\n` +
      `- Resource allocation and operational efficiency insights\n` +
      `- Risk assessment and mitigation recommendations\n` +
      `- Stakeholder engagement and donor reporting readiness\n` +
      `- Strategic recommendations for evidence-based decision-making\n` +
      `- Highlights of achievements, challenges, and lessons learned\n\n` +
      `I can dive deeper into any area or generate an executive dashboard view. What would you like?`;
  }
}
