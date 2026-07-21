import { Injectable } from '@nestjs/common';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class SurveyDesignAgent extends SpecialistAgent {
  readonly agentType = 'survey-design';
  readonly displayName = 'Survey Design Agent';

  async process(params: { message: string; context: Record<string, unknown> }): Promise<string> {
    const ctx = this.buildContextString(params.context);
    return `[Survey Design Agent] I have reviewed your questionnaire design request.\n\n` +
      `Your request: "${params.message}"${ctx}\n\n` +
      `For effective survey instrument design, here are my recommendations:\n` +
      `- Structure questions logically, grouping related topics into sections\n` +
      `- Use clear, simple language appropriate for the target respondents\n` +
      `- Include a mix of question types (multiple choice, Likert scale, open-ended)\n` +
      `- Implement skip logic to reduce respondent burden and improve data quality\n` +
      `- Add validation rules (range checks, required fields) at the question level\n` +
      `- Pilot test the questionnaire with a small sample before full deployment\n` +
      `- Consider translations and cultural adaptations for multilingual contexts\n\n` +
      `Let me know if you need help with specific question types or section structuring.`;
  }
}
