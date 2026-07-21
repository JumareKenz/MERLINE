import { Injectable } from '@nestjs/common';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class TranslationAgent extends SpecialistAgent {
  readonly agentType = 'translation';
  readonly displayName = 'Translation Agent';

  async process(params: { message: string; context: Record<string, unknown> }): Promise<string> {
    const ctx = this.buildContextString(params.context);
    return `[Translation Agent] I have processed your translation request.\n\n` +
      `Your request: "${params.message}"${ctx}\n\n` +
      `For multilingual MERL content management, here is my guidance:\n` +
      `- Maintain parallel translations with source language tracking\n` +
      `- Ensure cultural adaptation beyond literal translation for questions and instruments\n` +
      `- Support for multiple locales with fallback to default language\n` +
      `- Review translated content for technical accuracy of MERL terminology\n` +
      `- Version control translations alongside questionnaire versions\n` +
      `- Enable field teams to work in their preferred language\n` +
      `- Generate reports and dashboards in multiple languages as needed\n\n` +
      `What content do you need translated or which locale would you like to work with?`;
  }
}
