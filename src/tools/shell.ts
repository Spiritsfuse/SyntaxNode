import execa from 'execa';
import { Tool } from './registry';

export const executeCommandTool: Tool = {
  name: 'execute_command',
  description: 'Execute a shell command safely.',
  parameters: {
    command: 'The command to execute',
  },
  execute: async ({ command }) => {
    try {
      const { stdout, stderr } = await execa(command, { shell: true });
      return stdout || stderr;
    } catch (error: any) {
      return `Command failed: ${error.message}\n${error.stderr}`;
    }
  },
};
