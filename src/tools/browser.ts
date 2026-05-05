import open from 'open';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
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
    Logger.info(`Attempting to open ${filePath} in browser...`);
    try {
      await open(fullPath);
      return `Opened ${filePath} in browser.`;
    } catch (error: any) {
      Logger.error(`Failed to open browser: ${error.message}`);
      return `Error opening browser: ${error.message}`;
    }
  },
};

export const scrapeWebsiteTool: Tool = {
  name: 'scrape_website',
  description: 'Analyze a target website to extract its structure, content, and styling.',
  parameters: {
    url: 'The URL of the website to analyze',
  },
  execute: async ({ url }) => {
    Logger.info(`Analyzing website: ${url}...`);
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $ = cheerio.load(data);
      
      // Extract key info for cloning
      const title = $('title').text();
      const metaDescription = $('meta[name="description"]').attr('content');
      
      // Get a simplified view of the body structure
      const bodyPreview = $('body').html()?.substring(0, 5000) || 'No body content';
      
      return JSON.stringify({
        title,
        metaDescription,
        bodyStructure: 'Extracted first 5000 chars of body for analysis. Use this to understand the DOM tree.',
        rawHtml: bodyPreview
      }, null, 2);
    } catch (error: any) {
      return `Failed to scrape website: ${error.message}`;
    }
  },
};
