import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GatewayResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    latencyMs: number;
  };
}

interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
}

@Injectable()
export class AiGatewayService {
  private readonly providers: ProviderConfig[];

  constructor(private readonly configService: ConfigService) {
    this.providers = [
      {
        name: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: this.configService.get<string>('ai.openaiKey', ''),
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        defaultModel: 'gpt-4o-mini',
      },
      {
        name: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: this.configService.get<string>('ai.anthropicKey', ''),
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        defaultModel: 'claude-3-haiku',
      },
      {
        name: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com/v1',
        apiKey: this.configService.get<string>('ai.googleKey', ''),
        models: ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        defaultModel: 'gemini-1.5-flash',
      },
      {
        name: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: this.configService.get<string>('ai.openrouterKey', ''),
        models: ['openai/gpt-4o', 'anthropic/claude-3-sonnet', 'google/gemini-pro'],
        defaultModel: 'openai/gpt-4o',
      },
    ];
  }

  async sendMessage(params: {
    message: string;
    systemPrompt?: string;
    model?: string;
    provider?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<GatewayResponse> {
    const startTime = Date.now();
    const provider = this.resolveProvider(params.provider);
    const model = params.model ?? provider.defaultModel;

    const errors: Error[] = [];

    const providers = params.provider
      ? [this.getProviderByName(params.provider)]
      : this.providers.filter((p) => p.apiKey);

    for (const prov of providers) {
      if (!prov.apiKey) continue;
      try {
        const result = await this.callProvider(prov, model, params);
        return {
          ...result,
          usage: {
            ...result.usage,
            latencyMs: Date.now() - startTime,
          },
        };
      } catch (err) {
        errors.push(err as Error);
      }
    }

    const simulatedTokens = Math.ceil(params.message.length / 4);
    return {
      content: this.generateSimulatedResponse(params.message, params.systemPrompt),
      model: 'simulated',
      provider: 'fallback',
      usage: {
        inputTokens: simulatedTokens,
        outputTokens: simulatedTokens,
        cost: 0,
        latencyMs: Date.now() - startTime,
      },
    };
  }

  private resolveProvider(provider?: string): ProviderConfig {
    if (provider) {
      const found = this.providers.find((p) => p.name === provider);
      if (found) return found;
    }
    const available = this.providers.find((p) => p.apiKey);
    return available ?? this.providers[0];
  }

  private getProviderByName(name: string): ProviderConfig {
    const found = this.providers.find((p) => p.name === name);
    if (!found) throw new Error(`Provider "${name}" not found`);
    return found;
  }

  private async callProvider(
    provider: ProviderConfig,
    model: string,
    params: { message: string; systemPrompt?: string; temperature?: number; maxTokens?: number },
  ): Promise<GatewayResponse> {
    const startTime = Date.now();

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
        ...(provider.name === 'anthropic' ? { 'anthropic-version': '2023-06-01' } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
          { role: 'user', content: params.message },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Provider ${provider.name} returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? model,
      provider: provider.name,
      usage: {
        inputTokens,
        outputTokens,
        cost: this.calculateCost(provider.name, model, inputTokens, outputTokens),
        latencyMs,
      },
    };
  }

  private calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
    const rates: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.01, output: 0.03 },
      'gpt-4o-mini': { input: 0.0015, output: 0.006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'gemini-pro': { input: 0.001, output: 0.002 },
      'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
      'gemini-1.5-flash': { input: 0.0005, output: 0.0015 },
    };

    const rate = rates[model] ?? { input: 0.002, output: 0.008 };
    return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
  }

  private generateSimulatedResponse(message: string, systemPrompt?: string): string {
    const lines = [
      `I understand your query about "${message.substring(0, 100)}".`,
      '',
      'Based on the available information and best practices in MERL:',
      '',
      '1. I have analyzed the key aspects of your request',
      '2. Consider the specific context and requirements of your monitoring and evaluation framework',
      '3. Ensure alignment with established indicators and data collection protocols',
      '',
      systemPrompt ? `Following the guidance: ${systemPrompt.substring(0, 200)}` : '',
      '',
      'Would you like me to elaborate on any specific aspect or provide more detailed recommendations?',
    ];

    return lines.filter(Boolean).join('\n');
  }
}
