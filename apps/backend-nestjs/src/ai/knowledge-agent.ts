import { Injectable } from '@nestjs/common';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class KnowledgeAgent extends SpecialistAgent {
  readonly agentType = 'knowledge';
  readonly displayName = 'Knowledge Agent';

  async process(params: { message: string; context: Record<string, unknown> }): Promise<string> {
    const ctx = this.buildContextString(params.context);
    return `[Knowledge Agent] I have searched the knowledge base for your query.\n\n` +
      `Your request: "${params.message}"${ctx}\n\n` +
      `Based on the available knowledge resources, here is what I found:\n` +
      `- Relevant best practices and lessons learned from similar MERL projects\n` +
      `- Standard operating procedures and methodological guidance documents\n` +
      `- Previous study designs, questionnaires, and indicator frameworks\n` +
      `- Training materials and capacity building resources\n` +
      `- Donor reporting guidelines and compliance requirements\n` +
      `- Community of practice insights and expert recommendations\n\n` +
      `I can retrieve specific documents or synthesize knowledge on any topic. What would you like to explore?`;
  }
}
