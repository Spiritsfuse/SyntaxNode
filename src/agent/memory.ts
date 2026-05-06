export interface MemoryEntry {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'observation';
  content: string;
}

export interface AgentState {
  currentPhase: string;
  completedSteps: string[];
  generatedFiles: string[];
  failedStrategies: string[];
  retries: Record<string, number>;
}

export class Memory {
  private history: MemoryEntry[] = [];
  private state: AgentState = {
    currentPhase: 'INITIALIZING',
    completedSteps: [],
    generatedFiles: [],
    failedStrategies: [],
    retries: {},
  };

  addEntry(role: 'user' | 'assistant' | 'system' | 'tool' | 'observation', content: string) {
    this.history.push({ role, content });
  }

  updateState(update: Partial<AgentState>) {
    this.state = { ...this.state, ...update };
  }

  getState(): AgentState {
    return this.state;
  }

  getHistory(): MemoryEntry[] {
    return this.history;
  }

  getFormattedHistory(): string {
    const stateStr = `[STATE] Phase: ${this.state.currentPhase} | Completed: ${this.state.completedSteps.join(', ') || 'None'}`;
    return stateStr + '\n\n' + this.history
      .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
      .join('\n\n');
  }

  clear() {
    this.history = [];
    this.state = {
      currentPhase: 'INITIALIZING',
      completedSteps: [],
      generatedFiles: [],
      failedStrategies: [],
      retries: {},
    };
  }
}
