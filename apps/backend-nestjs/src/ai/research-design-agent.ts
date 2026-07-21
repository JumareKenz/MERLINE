import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class ResearchDesignAgent extends SpecialistAgent {
  readonly agentType = 'research-design';
  readonly displayName = 'Research Design Agent';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(params: { message: string; context: Record<string, unknown>; organizationId?: string }): Promise<string> {
    let contextInfo = '';
    if (params.organizationId) {
      const studyCount = await this.prisma.study.count({ where: { organizationId: params.organizationId, deletedAt: null } });
      const indicatorCount = await this.prisma.indicator.count({ where: { organizationId: params.organizationId, deletedAt: null } });
      contextInfo = `\n\nOrganization context: ${studyCount} studies, ${indicatorCount} indicators.`;
    }
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
