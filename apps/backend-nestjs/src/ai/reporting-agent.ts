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
export class ReportingAgent extends SpecialistAgent {
  readonly agentType = 'reporting';
  readonly displayName = 'Reporting Agent';

  async process(params: { message: string; context: Record<string, unknown> }): Promise<string> {
    const reportContext = '';

    return `[Reporting Agent] Let me help you with reporting and visualization.\n\n` +
      `Your request: "${params.message}"${reportContext}\n\n` +
      `Available reporting capabilities:\n` +
      `- Generate PDF, Excel, and CSV export of study data\n` +
      `- Create custom dashboards with charts and KPIs\n` +
      `- Schedule automated report generation\n` +
      `- Use templates for consistent report formatting\n` +
      `- Include indicator tracking tables and trend charts\n` +
      `- Add data quality summaries and flag reports\n\n` +
      `Would you like me to help create a specific report or dashboard?`;
  }
}
