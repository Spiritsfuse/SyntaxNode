import { Logger } from '../core/logger';
import { Memory } from './memory';
import { Reasoner } from './reasoner';
import { ToolRegistry } from '../tools/registry';
import { createFileTool, readFileTool, listDirTool } from '../tools/filesystem';
import { executeCommandTool } from '../tools/shell';
import { generateHtmlTool, generateCssTool, generateJsTool } from '../tools/web-gen';
import { openBrowserTool, takeScreenshotTool } from '../tools/browser';

export class Orchestrator {
  private memory: Memory;
  private reasoner: Reasoner;
  private maxLoops = 15;

  constructor() {
    this.memory = new Memory();
    this.reasoner = new Reasoner();
    
    // Register all tools
    ToolRegistry.register(createFileTool);
    ToolRegistry.register(readFileTool);
    ToolRegistry.register(listDirTool);
    ToolRegistry.register(executeCommandTool);
    ToolRegistry.register(generateHtmlTool);
    ToolRegistry.register(generateCssTool);
    ToolRegistry.register(generateJsTool);
    ToolRegistry.register(openBrowserTool);
    ToolRegistry.register(takeScreenshotTool);
  }

  async run(userRequest: string) {
    Logger.header('SyntaxNode: Agent Loop Started');
    
    let currentLoop = 0;
    let status: 'CONTINUE' | 'DONE' = 'CONTINUE';

    while (status === 'CONTINUE' && currentLoop < this.maxLoops) {
      currentLoop++;
      Logger.step('LOOP', `Cycle ${currentLoop}`);

      const response = await this.reasoner.thinkStream(userRequest, this.memory);
      
      Logger.reason(response.thought);
      if (response.plan && response.plan.length > 0) {
        Logger.plan(response.plan);
      }

      if (response.tool) {
        try {
          const result = await ToolRegistry.execute(response.tool.name, response.tool.args);
          this.memory.addEntry('assistant', `Thought: ${response.thought}\nAction: ${response.tool.name}`);
          this.memory.addEntry('tool', `Result of ${response.tool.name}: ${result}`);
        } catch (error: any) {
          this.memory.addEntry('tool', `Error executing ${response.tool.name}: ${error.message}`);
        }
      } else {
        this.memory.addEntry('assistant', response.thought);
      }

      status = response.status;
      if (status === 'DONE') {
        Logger.success('Task completed successfully!');
        break;
      }
    }

    if (currentLoop >= this.maxLoops) {
      Logger.warn('Reached maximum iteration limit.');
    }

    Logger.header('SyntaxNode: Agent Loop Finished');
  }
}
