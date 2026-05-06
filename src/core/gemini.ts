import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import dotenv from 'dotenv';
import { Logger } from './logger';

dotenv.config();

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private fallbackModel: GenerativeModel | null = null;
  private currentModelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'REPLACE_WITH_YOUR_KEY') {
      Logger.error('GEMINI_API_KEY not found in .env file.');
      process.exit(1);
    }

    this.currentModelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
    const fallbackName = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.currentModelName });
    
    if (fallbackName) {
      this.fallbackModel = this.genAI.getGenerativeModel({ model: fallbackName });
    }
  }

  async generate(prompt: string, useFallback = false): Promise<string> {
    const modelToUse = useFallback && this.fallbackModel ? this.fallbackModel : this.model;
    const modelName = useFallback && this.fallbackModel ? process.env.GEMINI_FALLBACK_MODEL : this.currentModelName;

    try {
      const result = await modelToUse.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      // Handle Rate Limiting (429) or other failures
      if (!useFallback && this.fallbackModel && (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota'))) {
        Logger.warn(`Primary model ${this.currentModelName} rate limited or unavailable.`);
        Logger.info(`↺ Falling back to ${process.env.GEMINI_FALLBACK_MODEL}...`);
        return this.generate(prompt, true);
      }
      
      Logger.error(`Gemini generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Specifically for code generation: non-streaming, direct file writing handled by tool
   */
  async generateCode(prompt: string): Promise<string> {
    // Code generation should be robust and non-streaming
    return this.generate(prompt);
  }

  /**
   * Specifically for reasoning: streaming is allowed for better UX
   */
  async *generateStream(prompt: string, useFallback = false): AsyncGenerator<string> {
    const modelToUse = useFallback && this.fallbackModel ? this.fallbackModel : this.model;

    try {
      const result = await modelToUse.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error: any) {
      if (!useFallback && this.fallbackModel && (error.status === 429 || error.message?.includes('429'))) {
        Logger.warn(`↺ Falling back to ${process.env.GEMINI_FALLBACK_MODEL} for stream...`);
        for await (const chunk of this.generateStream(prompt, true)) {
          yield chunk;
        }
        return;
      }
      throw error;
    }
  }

  async generateStructured<T>(prompt: string, schema: any): Promise<T> {
    const fullPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching this structure: ${JSON.stringify(
      schema
    )}`;
    
    const response = await this.generate(fullPrompt);
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      Logger.error('Failed to parse structured response from Gemini.');
      throw new Error('Invalid JSON response');
    }
  }
}
