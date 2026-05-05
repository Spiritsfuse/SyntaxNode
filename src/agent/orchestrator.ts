import { Logger } from '../core/logger';
import { Memory } from './memory';
import { Reasoner } from './reasoner';
import { ToolRegistry } from '../tools/registry';
import { createFileTool, readFileTool, listDirTool } from '../tools/filesystem';
import { executeCommandTool } from '../tools/shell';
import { generateHtmlTool, generateCssTool, generateJsTool } from '../tools/web-gen';
import { openBrowserTool, scrapeWebsiteTool } from '../tools/browser';

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
    ToolRegistry.register(scrapeWebsiteTool);
  }

  async run(userRequest: string) {
    Logger.header('SyntaxNode: Agent Loop Started');
    
    let currentLoop = 0;
    let status: 'CONTINUE' | 'DONE' = 'CONTINUE';

    while (status === 'CONTINUE' && currentLoop < this.maxLoops) {
      currentLoop++;
      Logger.step('LOOP', `Cycle ${currentLoop}`);

      const response = await this.reasoner.think(userRequest, this.memory);
      
      if (response.tool) {
        try {
          Logger.tool(response.tool.name);
          const result = await ToolRegistry.execute(response.tool.name, response.tool.args);
          this.memory.addEntry('assistant', `Thought: ${response.thought}\nAction: ${response.tool.name}`);
          this.memory.addEntry('tool', `Result of ${response.tool.name}: ${result}`);
          Logger.success(`${response.tool.name} executed successfully.`);
        } catch (error: any) {
          Logger.error(`Error executing ${response.tool.name}: ${error.message}`);
          this.memory.addEntry('tool', `Error executing ${response.tool.name}: ${error.message}`);
        }
      } else {
        this.memory.addEntry('assistant', response.thought);
      }

      status = response.status;
      if (status === 'DONE') {
        Logger.success('Task completed successfully!');
        
        // Final Automation: Open in Browser
        Logger.step('FINAL', 'Opening in browser...');
        try {
          await ToolRegistry.execute('open_browser', { path: 'index.html' });
        } catch (e) {
          Logger.warn('Auto-open failed, but files were generated.');
        }
        break;
      }
    }

    if (currentLoop >= this.maxLoops) {
      Logger.warn('Reached maximum iteration limit.');
    }

    Logger.header('SyntaxNode: Agent Loop Finished');
  }
}
