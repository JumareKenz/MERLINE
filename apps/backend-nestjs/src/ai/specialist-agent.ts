export abstract class SpecialistAgent {
  abstract readonly agentType: string;
  abstract readonly displayName: string;

  abstract process(params: { message: string; context: Record<string, unknown> }): Promise<string>;

  protected buildContextString(context: Record<string, unknown>): string {
    if (!context || Object.keys(context).length === 0) return '';
    return `\nContext: ${JSON.stringify(context, null, 2)}`;
  }
}
