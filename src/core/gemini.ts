import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import dotenv from 'dotenv';
import { Logger } from './logger';

dotenv.config();

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private chat: ChatSession | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'REPLACE_WITH_YOUR_KEY') {
      Logger.error('GEMINI_API_KEY not found in .env file.');
      process.exit(1);
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  async generate(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      Logger.error(`Gemini Error: ${error.message}`);
      throw error;
    }
  }

  async *generateStream(prompt: string): AsyncGenerator<string> {
    try {
      const result = await this.model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) yield chunkText;
      }
    } catch (error: any) {
      Logger.error(`Gemini Stream Error: ${error.message}`);
      throw error;
    }
  }

  startChat(history: any[] = []) {
    this.chat = this.model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    });
    return this.chat;
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.chat) {
      this.startChat();
    }

    try {
      const result = await this.chat!.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      Logger.error(`Gemini Chat Error: ${error.message}`);
      throw error;
    }
  }

  async generateStructured<T>(prompt: string, schema: any): Promise<T> {
    // Basic implementation of structured output via prompting
    // In a real prod app, we'd use response_mime_type if supported or strict JSON prompts
    const fullPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching this structure: ${JSON.stringify(
      schema
    )}`;
    
    const response = await this.generate(fullPrompt);
    try {
      // Find JSON block if LLM added markdown
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      Logger.error('Failed to parse structured response from Gemini.');
      throw new Error('Invalid JSON response');
    }
  }
}
