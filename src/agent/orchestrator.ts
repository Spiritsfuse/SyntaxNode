import { Logger } from '../core/logger';
import { Memory } from './memory';
import { Reasoner } from './reasoner';
import { ToolRegistry } from '../tools/registry';
import { createFileTool } from '../tools/filesystem';
import { executeCommandTool } from '../tools/shell';
import { cleanDomTool } from '../tools/staticizer';
import { openBrowserTool, scrapeWebsiteTool } from '../tools/browser';
import { SessionManager } from '../core/session';
import fs from 'fs';
import path from 'path';

export enum Phase {
  SCRAPE_RUNTIME_GRAPH = 'SCRAPE_RUNTIME_GRAPH',
  CLEAN_DOM = 'CLEAN_DOM',
  SANITIZE_TRACKERS = 'SANITIZE_TRACKERS',
  VERIFY_RUNTIME = 'VERIFY_RUNTIME',
  OPEN_BROWSER = 'OPEN_BROWSER',
  COMPLETE = 'COMPLETE'
}

export class Orchestrator {
  private memory: Memory;
  private reasoner: Reasoner;
  private maxLoops = 30;
  private lastActions: string[] = [];

  constructor() {
    this.memory = new Memory();
    this.reasoner = new Reasoner();
    
    ToolRegistry.register(createFileTool);
    ToolRegistry.register(executeCommandTool);
    ToolRegistry.register(cleanDomTool);
    ToolRegistry.register(openBrowserTool);
    ToolRegistry.register(scrapeWebsiteTool);
  }

  async run(userRequest: string) {
    Logger.header('SyntaxNode: Agent Loop Started');
    
    // Initialize Session
    const session = SessionManager.getInstance('https://www.scaler.com/');
    
    let currentLoop = 0;
    let status: 'CONTINUE' | 'DONE' = 'CONTINUE';

    while (status === 'CONTINUE' && currentLoop < this.maxLoops) {
      currentLoop++;
      
      const response = await this.reasoner.think(userRequest, this.memory);
      
      if (response.tool) {
        const actionKey = `${response.tool.name}:${JSON.stringify(response.tool.args)}`;
        this.lastActions.push(actionKey);

        // Dead loop protection
        if (this.lastActions.filter(a => a === actionKey).length > 3) {
           Logger.error(`Detected infinite loop on tool: ${actionKey}. Forcing exit.`);
           break;
        }

        // Pre-Execution Intercepts
        if (response.tool.name === 'open_browser') {
           // 1. Session Integrity Validation BEFORE browser open
           const currentDir = path.join(process.cwd(), 'generated', 'current');
           const latestRunDir = session.resolveOutputPath('');
           const currentIndex = path.join(currentDir, 'index.html');

           let needsRecovery = false;
           if (!fs.existsSync(currentDir) || !fs.existsSync(currentIndex)) {
             Logger.warn('⚠ Current session integrity failed. Missing files or manually deleted.');
             needsRecovery = true;
           }

           if (needsRecovery) {
              Logger.info('↺ Rebuilding generated/current from latest successful run...');
              if (fs.existsSync(currentDir)) {
                 fs.rmSync(currentDir, { recursive: true, force: true });
              }
              fs.cpSync(latestRunDir, currentDir, { recursive: true });
              Logger.success('✔ Recovery complete. Validation passed.');
           } else if (!fs.existsSync(currentDir)) {
              fs.cpSync(latestRunDir, currentDir, { recursive: true });
              Logger.success('✔ Output synced to generated/current');
           }

           // 2. Override Path Deterministically
           const absoluteTargetPath = path.resolve(currentDir);
           response.tool.args.path = absoluteTargetPath;
        }

        try {
          Logger.tool(response.tool.name);
          const result = await ToolRegistry.execute(response.tool.name, response.tool.args);
          
          this.memory.addEntry('assistant', `Thought: ${response.thought}\nPhase: ${response.currentPhase}\nAction: ${response.tool.name}`);
          
          // Explicitly save the result so the LLM doesn't hallucinate failure
          this.memory.addEntry('tool', result);
          
          if (response.currentPhase) {
            session.addCompletedPhase(response.currentPhase);
          }
        } catch (error: any) {
          Logger.error(`Error executing ${response.tool.name}: ${error.message}`);
          this.memory.addEntry('tool', `Error: ${error.message}`);
          this.lastActions.push(`ERROR:${response.tool.name}`);
          
          // Stop infinite retries on validation failure
          if (response.tool.name === 'open_browser') {
              Logger.warn('Validation returned structured diagnostics. Stopping agent loop to prevent infinite retry.');
              session.setStatus('failed');
              break;
          }
        }
      } else {
        this.memory.addEntry('assistant', `Thought: ${response.thought}\nPhase: ${response.currentPhase}`);
      }

      status = response.status;
      if (status === 'DONE' || response.currentPhase === Phase.VERIFY_RUNTIME || response.currentPhase === Phase.OPEN_BROWSER || response.currentPhase === Phase.COMPLETE) {
        
        if (response.currentPhase === Phase.VERIFY_RUNTIME || status === 'DONE') {
          const indexPath = session.resolveOutputPath('index.html');

          let valid = true;
          
          if (!fs.existsSync(indexPath) || fs.statSync(indexPath).size < 100) {
            Logger.error('✖ Validation failed: index.html is missing or empty.');
            valid = false;
          } else {
            Logger.success('✔ index.html exists and is valid size.');
            const content = fs.readFileSync(indexPath, 'utf8');
            if (!content.includes('<html')) { Logger.error('✖ HTML shell missing'); valid = false; } else { Logger.success('✔ HTML shell detected'); }
          }

          if (valid) {
            Logger.success('✔ Validation passed. Proceed to OPEN_BROWSER phase.');
            this.memory.addEntry('observation', 'Validation passed successfully. You MUST now proceed to OPEN_BROWSER phase and use the open_browser tool to boot the local replay server.');
            status = 'CONTINUE'; 
          } else {
            Logger.warn('⚠ Validation failed. Forcing agent to continue and fix errors.');
            this.memory.addEntry('observation', 'CRITICAL VALIDATION FAILED. Fix the missing files.');
            status = 'CONTINUE'; 
          }
        }
        
        if (response.currentPhase === Phase.OPEN_BROWSER) {
           if (response.tool && response.tool.name === 'open_browser') {
              Logger.success('✔ Browser opened successfully.');
              session.setStatus('completed');
              break; 
           } else {
              Logger.warn('⚠ Agent is in OPEN_BROWSER phase but did not call open_browser tool.');
              const fullIndexPath = session.resolveOutputPath('');
              this.memory.addEntry('observation', `CRITICAL: You MUST use the open_browser tool targeting ${fullIndexPath} before COMPLETE.`);
              status = 'CONTINUE';
           }
        }
        
        if (response.currentPhase === Phase.COMPLETE) {
           Logger.success('✔ Task completed');
           session.setStatus('completed');
           break;
        }
      }
    }

    if (currentLoop >= this.maxLoops) {
      Logger.warn('Reached maximum iteration limit.');
      session.setStatus('failed');
    }

    Logger.header('SyntaxNode: Agent Loop Finished');
  }
}
