import { Injectable } from '@nestjs/common';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class QualitativeAgent extends SpecialistAgent {
  readonly agentType = 'qualitative';
  readonly displayName = 'Qualitative Agent';

  async process(params: { message: string; context: Record<string, unknown> }): Promise<string> {
    const ctx = this.buildContextString(params.context);
    return `[Qualitative Agent] I have analyzed your qualitative research request.\n\n` +
      `Your request: "${params.message}"${ctx}\n\n` +
      `For robust qualitative research in MERL contexts, consider:\n` +
      `- Select appropriate methods: key informant interviews, focus group discussions, case studies\n` +
      `- Develop semi-structured discussion guides with probing questions\n` +
      `- Use purposive sampling to ensure diverse perspectives and saturation\n` +
      `- Record and transcribe sessions with informed consent\n` +
      `- Apply thematic analysis, grounded theory, or content analysis frameworks\n` +
      `- Use qualitative data analysis tools for coding and theme identification\n` +
      `- Triangulate findings with quantitative data for mixed-methods insights\n` +
      `- Document reflexivity and positionality to strengthen trustworthiness\n\n` +
      `Would you like guidance on specific qualitative methods or analysis approaches?`;
  }
}
