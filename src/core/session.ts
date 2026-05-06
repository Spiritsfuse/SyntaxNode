import fs from 'fs';
import path from 'path';
import { Logger } from './logger';

export interface SessionMetadata {
  sessionId: string;
  target: string;
  status: 'running' | 'completed' | 'failed';
  completedPhases: string[];
  generatedFiles: string[];
}

export class SessionManager {
  private static instance: SessionManager;
  private sessionId: string;
  private runDir: string;
  private currentDir: string;
  private metadataPath: string;
  private metadata: SessionMetadata;

  private constructor(targetUrl: string = 'https://www.scaler.com/') {
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    const baseDir = path.resolve(process.cwd(), 'generated');
    this.runDir = path.join(baseDir, 'runs', this.sessionId);
    this.currentDir = path.join(baseDir, 'current');
    this.metadataPath = path.join(this.runDir, 'session.json');

    this.metadata = {
      sessionId: this.sessionId,
      target: targetUrl,
      status: 'running',
      completedPhases: [],
      generatedFiles: [],
    };

    this.initialize();
  }

  public static getInstance(targetUrl?: string): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(targetUrl);
    }
    return SessionManager.instance;
  }

  private initialize() {
    // Create run directory
    fs.mkdirSync(this.runDir, { recursive: true });
    
    // Components directory
    fs.mkdirSync(path.join(this.runDir, 'components'), { recursive: true });

    this.saveMetadata();
    this.cleanupOldRuns();
    
    Logger.success(`Session created: ${this.sessionId}`);
  }

  public getRunDir(): string {
    return this.runDir;
  }

  public resolveOutputPath(filename: string): string {
    return path.join(this.runDir, filename);
  }

  public resolveComponentPath(filename: string): string {
    return path.join(this.runDir, 'components', filename);
  }

  public addCompletedPhase(phase: string) {
    if (!this.metadata.completedPhases.includes(phase)) {
      this.metadata.completedPhases.push(phase);
      this.saveMetadata();
    }
  }

  public addGeneratedFile(filename: string) {
    if (!this.metadata.generatedFiles.includes(filename)) {
      this.metadata.generatedFiles.push(filename);
      this.saveMetadata();
    }
  }

  public setStatus(status: 'completed' | 'failed') {
    this.metadata.status = status;
    this.saveMetadata();

    if (status === 'completed') {
      this.updateCurrentSymlink();
    }
  }

  private saveMetadata() {
    fs.writeFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2));
  }

  private updateCurrentSymlink() {
    if (fs.existsSync(this.currentDir)) {
      fs.rmSync(this.currentDir, { recursive: true, force: true });
    }
    
    try {
      // Create a copy instead of symlink for Windows compatibility without admin rights
      fs.cpSync(this.runDir, this.currentDir, { recursive: true });
      Logger.success(`Session copied to generated/current/`);
    } catch (e: any) {
      Logger.error(`Failed to copy to generated/current/: ${e.message}`);
    }
  }

  private cleanupOldRuns() {
    const MAX_RUN_HISTORY = 10;
    const runsDir = path.resolve(process.cwd(), 'generated/runs');
    if (!fs.existsSync(runsDir)) return;

    const runs = fs.readdirSync(runsDir)
      .map(name => ({ name, time: fs.statSync(path.join(runsDir, name)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (runs.length > MAX_RUN_HISTORY) {
      const toDelete = runs.slice(MAX_RUN_HISTORY);
      for (const run of toDelete) {
        fs.rmSync(path.join(runsDir, run.name), { recursive: true, force: true });
      }
      Logger.info(`Cleaned up ${toDelete.length} old runs.`);
    }
  }
}
