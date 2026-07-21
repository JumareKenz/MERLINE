import { Injectable } from '@nestjs/common';
import { ResearchDesignAgent } from './research-design-agent';
import { SurveyDesignAgent } from './survey-design-agent';
import { IndicatorAgent } from './indicator-agent';
import { DataQualityAgent } from './data-quality-agent';
import { ReportingAgent } from './reporting-agent';
import { KnowledgeAgent } from './knowledge-agent';
import { QualitativeAgent } from './qualitative-agent';
import { ExecutiveAgent } from './executive-agent';
import { TranslationAgent } from './translation-agent';
import { SpecialistAgent } from './specialist-agent';

@Injectable()
export class AgentOrchestratorService {
  private readonly agents: Map<string, SpecialistAgent>;

  constructor(
    private readonly researchDesignAgent: ResearchDesignAgent,
    private readonly surveyDesignAgent: SurveyDesignAgent,
    private readonly indicatorAgent: IndicatorAgent,
    private readonly dataQualityAgent: DataQualityAgent,
    private readonly reportingAgent: ReportingAgent,
    private readonly knowledgeAgent: KnowledgeAgent,
    private readonly qualitativeAgent: QualitativeAgent,
    private readonly executiveAgent: ExecutiveAgent,
    private readonly translationAgent: TranslationAgent,
  ) {
    this.agents = new Map<string, SpecialistAgent>();
    const agentList: SpecialistAgent[] = [
      researchDesignAgent,
      surveyDesignAgent,
      indicatorAgent,
      dataQualityAgent,
      reportingAgent,
      knowledgeAgent,
      qualitativeAgent,
      executiveAgent,
      translationAgent,
    ];
    for (const agent of agentList) {
      this.agents.set(agent.agentType, agent);
    }
  }

  classifyIntent(message: string): string {
    const lower = message.toLowerCase();

    const intentPatterns: { type: string; patterns: string[] }[] = [
      {
        type: 'research-design',
        patterns: ['study design', 'research design', 'methodology', 'sampling', 'sample size', 'study type', 'baseline', 'endline', 'cross-sectional', 'longitudinal'],
      },
      {
        type: 'survey-design',
        patterns: ['questionnaire', 'survey', 'question', 'section', 'skip logic', 'validation', 'form design', 'instrument'],
      },
      {
        type: 'indicator',
        patterns: ['indicator', 'kpi', 'metric', 'target', 'baseline', 'benchmark', 'measure', 'threshold'],
      },
      {
        type: 'data-quality',
        patterns: ['data quality', 'validation', 'cleaning', 'quality score', 'audit', 'outlier', 'duplicate', 'completeness'],
      },
      {
        type: 'reporting',
        patterns: ['report', 'dashboard', 'visualization', 'chart', 'graph', 'export', 'pdf', 'excel'],
      },
      {
        type: 'knowledge',
        patterns: ['knowledge', 'resource', 'document', 'best practice', 'guideline', 'learn', 'reference', 'search'],
      },
      {
        type: 'qualitative',
        patterns: ['qualitative', 'interview', 'focus group', 'fgd', 'kii', 'thematic', 'narrative', 'case study'],
      },
      {
        type: 'executive',
        patterns: ['executive', 'summary', 'overview', 'strategic', 'portfolio', 'program', 'performance'],
      },
      {
        type: 'translation',
        patterns: ['translation', 'translate', 'language', 'locale', 'multilingual', 'en to', 'fr to', 'es to', 'ar to'],
      },
    ];

    for (const { type, patterns } of intentPatterns) {
      for (const pattern of patterns) {
        if (lower.includes(pattern)) {
          return type;
        }
      }
    }

    return 'general';
  }

  getAgent(agentType: string): SpecialistAgent | undefined {
    return this.agents.get(agentType);
  }

  async dispatchToAgent(agentType: string, message: string, context: Record<string, unknown>): Promise<string> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      return `I'm not sure which specialist can best handle your request about "${message.substring(0, 100)}". Could you provide more details or rephrase? Available specialists: research design, survey design, indicators, data quality, reporting, knowledge, qualitative, executive, translation.`;
    }
    return agent.process({
      message,
      context,
      ...(context.organizationId ? { organizationId: context.organizationId as string } : {}),
      ...(context.studyId ? { studyId: context.studyId as string } : {}),
    });
  }

  async dispatchToMultipleAgents(agentTypes: string[], message: string, context: Record<string, unknown>): Promise<string> {
    const responses = await Promise.all(
      agentTypes.map((type) =>
        this.dispatchToAgent(type, message, context).catch(() => null),
      ),
    );
    return this.synthesizeResponses(responses.filter((r): r is string => r !== null));
  }

  synthesizeResponses(responses: string[]): string {
    if (responses.length === 0) {
      return 'No responses could be generated. Please try again.';
    }

    if (responses.length === 1) {
      return responses[0];
    }

    const sections = responses.map((r, i) => {
      const header = `--- Perspective ${i + 1} ---`;
      return `${header}\n${r}`;
    });

    return `I've gathered insights from multiple perspectives:\n\n${sections.join('\n\n')}\n\n--- Synthesis ---\nBased on the combined analysis above, here is the integrated recommendation:\n\n` +
      responses.map((r) => {
        const lines = r.split('\n').filter((l) => l.startsWith('- '));
        return lines.slice(0, 3).join('\n');
      }).filter(Boolean).join('\n');
  }
}
