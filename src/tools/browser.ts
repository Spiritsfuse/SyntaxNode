import open from 'open';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { Tool } from './registry';
import { Logger } from '../core/logger';

const GENERATED_DIR = path.join(process.cwd(), 'generated');

export const openBrowserTool: Tool = {
  name: 'open_browser',
  description: 'Open a file from the generated directory in the default web browser.',
  parameters: {
    path: 'Relative path from generated/ directory (e.g., index.html)',
  },
  execute: async ({ path: filePath }) => {
    const fullPath = path.join(GENERATED_DIR, filePath);
    Logger.info(`Opening ${filePath} in browser...`);
    await open(fullPath);
    return `Opened ${filePath} in browser.`;
  },
};

export const takeScreenshotTool: Tool = {
  name: 'take_screenshot',
  description: 'Take a screenshot of a generated HTML file using Puppeteer.',
  parameters: {
    path: 'Relative path of the HTML file from generated/ directory',
    outputName: 'Name of the output screenshot file (e.g., preview.png)',
  },
  execute: async ({ path: filePath, outputName = 'preview.png' }) => {
    const fullPath = `file://${path.join(GENERATED_DIR, filePath)}`;
    const outputPath = path.join(GENERATED_DIR, outputName);
    
    Logger.info(`Taking screenshot of ${filePath}...`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(fullPath, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: outputPath, fullPage: true });
    await browser.close();
    
    return `Screenshot saved as ${outputName} in generated directory.`;
  },
};
