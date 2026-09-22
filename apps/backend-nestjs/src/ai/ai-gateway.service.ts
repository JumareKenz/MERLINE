import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly providers: ProviderConfig[];

  constructor(private readonly configService: ConfigService) {
    // PHASE 1: only OpenAI-compatible providers are registered.
    //
    // `callProvider` speaks one dialect: POST /chat/completions with a Bearer
    // token. The previous list also registered Anthropic and Google against
    // that same shape, but neither accepts it — Anthropic uses /v1/messages
    // with an `x-api-key` header and a different body, Gemini uses
    // `:generateContent`. Both therefore failed on every call and fell through
    // to the fabricated response, which is partly how that fallback went
    // unnoticed.
    //
    // Now that failures are surfaced, registering a provider that cannot work
    // would just guarantee an error. OpenRouter proxies Anthropic and Google
    // models over the OpenAI dialect, so nothing is lost. Native adapters can
    // be added later behind a per-provider request/response mapper.
    this.providers = [
      {
        name: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: this.configService.get<string>('ai.openaiKey', ''),
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        defaultModel: 'gpt-4o-mini',
      },
      {
        name: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: this.configService.get<string>('ai.openrouterKey', ''),
        models: [
          'openai/gpt-4o',
          'anthropic/claude-3-sonnet',
          'google/gemini-pro',
        ],
        defaultModel: 'openai/gpt-4o',
      },
      {
        // Groq's inference API is OpenAI-compatible (same /chat/completions
        // dialect), so it needs no separate client — just another entry here.
        name: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: this.configService.get<string>('ai.groqKey', ''),
        models: [
          this.configService.get<string>('ai.groqModel', 'openai/gpt-oss-120b'),
        ],
        defaultModel: this.configService.get<string>(
          'ai.groqModel',
          'openai/gpt-oss-120b',
        ),
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

    const errors: string[] = [];

    const providers = params.provider
      ? [this.getProviderByName(params.provider)]
      : this.providers.filter((p) => p.apiKey);

    const usable = providers.filter((p) => p.apiKey);

    if (usable.length === 0) {
      throw new ServiceUnavailableException(
        'No AI provider is configured. Set an API key for at least one provider.',
      );
    }

    for (const prov of usable) {
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
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`AI provider "${prov.name}" failed: ${message}`);
        errors.push(`${prov.name}: ${message}`);
      }
    }

    // PHASE 1: fail loudly.
    //
    // This previously returned `generateSimulatedResponse()` — a hand-written
    // block of MERL-flavoured filler — through the normal success path,
    // labelled `model: 'simulated'`, `provider: 'fallback'`, `cost: 0`. No
    // inspected UI surfaced that distinction, so invented text was
    // indistinguishable from a real model answer.
    //
    // For a product whose output informs decisions about real programme
    // participants, a visible outage is strictly better than silent
    // fabrication. Do not reintroduce a fallback that returns content.
    throw new ServiceUnavailableException(
      `All configured AI providers failed. ${errors.join('; ')}`,
    );
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
    params: {
      message: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<GatewayResponse> {
    const startTime = Date.now();

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
        ...(provider.name === 'anthropic'
          ? { 'anthropic-version': '2023-06-01' }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(params.systemPrompt
            ? [{ role: 'system', content: params.systemPrompt }]
            : []),
          { role: 'user', content: params.message },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Provider ${provider.name} returned ${response.status}: ${await response.text()}`,
      );
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
        cost: this.calculateCost(
          provider.name,
          model,
          inputTokens,
          outputTokens,
        ),
        latencyMs,
      },
    };
  }

  private calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
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
    return (
      (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output
    );
  }
}
