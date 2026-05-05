export interface MemoryEntry {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export class Memory {
  private history: MemoryEntry[] = [];

  addEntry(role: 'user' | 'assistant' | 'system' | 'tool', content: string) {
    this.history.push({ role, content });
  }

  getHistory(): MemoryEntry[] {
    return this.history;
  }

  getFormattedHistory(): string {
    return this.history
      .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
      .join('\n\n');
  }

  clear() {
    this.history = [];
  }
}
