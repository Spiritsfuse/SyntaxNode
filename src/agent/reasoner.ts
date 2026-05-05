import { GeminiClient } from '../core/gemini';
import { PromptManager } from '../core/prompt-manager';
import { Logger } from '../core/logger';
import { Memory } from './memory';

export interface ReasoningResponse {
  thought: string;
  plan: string[];
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
    const prompt = PromptManager.getReasoningPrompt(userRequest, history);
    
    Logger.startSpinner('Thinking...');
    try {
      const response = await this.gemini.generateStructured<ReasoningResponse>(prompt, {
        thought: 'string',
        plan: ['string'],
        tool: { name: 'string', args: {} },
        status: 'CONTINUE | DONE'
      });
      
      Logger.stopSpinner();
      return response;
    } catch (error) {
      Logger.stopSpinner();
      throw error;
    }
  }

  async thinkStream(userRequest: string, memory: Memory): Promise<ReasoningResponse> {
    const history = memory.getFormattedHistory();
    const prompt = PromptManager.getReasoningPrompt(userRequest, history);
    
    Logger.step('THINK', 'Agent is reasoning...');
    let fullResponse = '';
    
    try {
      for await (const chunk of this.gemini.generateStream(prompt)) {
        fullResponse += chunk;
        process.stdout.write(chunk); // Stream raw output for "real" feel
      }
      process.stdout.write('\n');

      // Improved JSON extraction: find the first { and the last }
      const firstBrace = fullResponse.indexOf('{');
      const lastBrace = fullResponse.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('No JSON object found in response');
      }

      const jsonStr = fullResponse.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonStr) as ReasoningResponse;
    } catch (error) {
      Logger.error('Failed to parse streaming response. Raw output shown above.');
      throw error;
    }
  }
}
