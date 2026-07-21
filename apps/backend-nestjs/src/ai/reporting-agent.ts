import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class ReportingAgent extends SpecialistAgent {
  readonly agentType = 'reporting';
  readonly displayName = 'Reporting Agent';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(params: { message: string; context: Record<string, unknown>; organizationId?: string }): Promise<string> {
    let reportContext = '';
    if (params.organizationId) {
      const reports = await this.prisma.report.count({ where: { organizationId: params.organizationId, deletedAt: null } });
      const studies = await this.prisma.study.count({ where: { organizationId: params.organizationId, deletedAt: null } });
      reportContext = `\n\nOrganization has ${reports} reports across ${studies} studies.`;
    }

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
