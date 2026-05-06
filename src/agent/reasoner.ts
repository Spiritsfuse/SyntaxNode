import { GeminiClient } from '../core/gemini';
import { PromptManager } from '../core/prompt-manager';
import { Logger } from '../core/logger';
import { Memory } from './memory';

export interface ReasoningResponse {
  thought: string;
  plan: string[];
  currentPhase: string;
  tool: {
    name: string;
    args: any;
  } | null;
  status: 'CONTINUE' | 'DONE';
}

export class Reasoner {
  private gemini: GeminiClient;

  constructor() {
    this.gemini = new GeminiClient();
  }

  async think(userRequest: string, memory: Memory): Promise<ReasoningResponse> {
    const history = memory.getFormattedHistory();
    const systemPrompt = PromptManager.getSystemPrompt();
    const prompt = `${systemPrompt}\n\n${PromptManager.getReasoningPrompt(userRequest, history)}`;
    
    Logger.startSpinner('Reasoning...');
    
    try {
      const response = await this.gemini.generate(prompt);
      Logger.stopSpinner();

      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('No JSON object found in response');
      }

      const jsonStr = response.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr) as ReasoningResponse;
      
      // Update state in memory
      memory.updateState({
        currentPhase: parsed.currentPhase,
        completedSteps: memory.getState().completedSteps,
      });

      Logger.reason(parsed.thought);
      if (parsed.plan && parsed.plan.length > 0) {
        Logger.plan(parsed.plan);
      }
      
      return parsed;
    } catch (error: any) {
      Logger.stopSpinner();
      Logger.error(`Reasoning failed: ${error.message}`);
      throw error;
    }
  }
}
