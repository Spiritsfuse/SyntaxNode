import fs from 'fs/promises';
import path from 'path';
import { Tool } from './registry';

const GENERATED_DIR = path.join(process.cwd(), 'generated');

async function ensureGeneratedDir() {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
}

export const createFileTool: Tool = {
  name: 'create_file',
  description: 'Create a new file with specified content in the generated directory.',
  parameters: {
    path: 'Relative path from generated/ directory',
    content: 'Content to write to the file',
  },
  execute: async ({ path: filePath, content }) => {
    await ensureGeneratedDir();
    const fullPath = path.join(GENERATED_DIR, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    return `File created successfully at: ${filePath}`;
  },
};

export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file from the generated directory.',
  parameters: {
    path: 'Relative path from generated/ directory',
  },
  execute: async ({ path: filePath }) => {
    const fullPath = path.join(GENERATED_DIR, filePath);
    return await fs.readFile(fullPath, 'utf8');
  },
};

export const listDirTool: Tool = {
  name: 'list_dir',
  description: 'List the contents of a directory in the generated directory.',
  parameters: {
    path: 'Relative path from generated/ directory (empty for root)',
  },
  execute: async ({ path: filePath = '' }) => {
    const fullPath = path.join(GENERATED_DIR, filePath);
    const files = await fs.readdir(fullPath);
    return files.join('\n');
  },
};
