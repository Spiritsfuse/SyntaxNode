import { Logger } from '../core/logger';

export interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<string>;
}

export class ToolRegistry {
  private static tools: Map<string, Tool> = new Map();

  static register(tool: Tool) {
    this.tools.set(tool.name, tool);
    Logger.step('TOOL', `Registered tool: ${tool.name}`);
  }

  static getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  static getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  static async execute(name: string, args: any): Promise<string> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    Logger.step('EXECUTE', `Running ${name}...`);
    try {
      const result = await tool.execute(args);
      Logger.success(`Successfully executed ${name}`);
      return result;
    } catch (error: any) {
      Logger.error(`Tool execution failed: ${name} - ${error.message}`);
      throw error;
    }
  }
}
