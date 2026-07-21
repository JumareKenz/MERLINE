import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class IndicatorAgent extends SpecialistAgent {
  readonly agentType = 'indicator';
  readonly displayName = 'Indicator Agent';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(params: { message: string; context: Record<string, unknown>; organizationId?: string; studyId?: string }): Promise<string> {
    let indicatorContext = '';
    if (params.studyId) {
      const indicators = await this.prisma.indicator.findMany({
        where: { studyId: params.studyId, deletedAt: null },
        take: 5,
      });
      if (indicators.length > 0) {
        indicatorContext = `\n\nCurrent indicators in this study: ${indicators.map((i) => `${i.name} (${i.type})`).join(', ')}.`;
      }
    } else if (params.organizationId) {
      const count = await this.prisma.indicator.count({ where: { organizationId: params.organizationId, deletedAt: null } });
      indicatorContext = `\n\nOrganization has ${count} indicators defined.`;
    }

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
