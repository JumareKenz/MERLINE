import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class DataQualityAgent extends SpecialistAgent {
  readonly agentType = 'data-quality';
  readonly displayName = 'Data Quality Agent';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(params: { message: string; context: Record<string, unknown>; organizationId?: string }): Promise<string> {
    let qualityContext = '';
    if (params.organizationId) {
      const submissions = await this.prisma.submission.count({ where: { organizationId: params.organizationId, deletedAt: null } });
      const flagged = await this.prisma.submission.count({ where: { organizationId: params.organizationId, status: 'FLAGGED' } });
      qualityContext = `\n\nOrganization has ${submissions} total submissions with ${flagged} flagged for quality issues (${submissions > 0 ? Math.round((flagged / submissions) * 100) : 0}% flag rate).`;
    }

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
