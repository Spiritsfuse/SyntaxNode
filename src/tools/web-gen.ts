import { Tool } from './registry';
import { GeminiClient } from '../core/gemini';
import { Logger } from '../core/logger';

export const generateHtmlTool: Tool = {
  name: 'generate_html',
  description: 'Generate high-fidelity HTML structure for a website section.',
  parameters: {
    section: 'e.g., Header, Hero, Footer',
    requirements: 'Specific design details to match (from scrape analysis)',
  },
  execute: async ({ section, requirements }) => {
    Logger.step('GENERATE', `Generating HTML for ${section}...`);
    const prompt = `Generate a production-ready HTML5 snippet for the ${section} section of a website.
Requirements: ${requirements}
Use semantic HTML5. Respond ONLY with the code block.`;
    
    const gemini = new GeminiClient();
    const content = await gemini.generate(prompt);
    return content;
  },
};

export const generateCssTool: Tool = {
  name: 'generate_css',
  description: 'Generate high-fidelity CSS for a website section.',
  parameters: {
    section: 'e.g., Header, Hero, Footer',
    htmlContext: 'The HTML structure this CSS should style',
    requirements: 'Specific colors, fonts, and layout rules',
  },
  execute: async ({ section, htmlContext, requirements }) => {
    Logger.step('GENERATE', `Generating CSS for ${section}...`);
    const prompt = `Generate premium CSS3 for the ${section} section.
HTML Context: ${htmlContext}
Requirements: ${requirements}
Use modern CSS (Flexbox/Grid). Respond ONLY with the code block.`;
    
    const gemini = new GeminiClient();
    const content = await gemini.generate(prompt);
    return content;
  },
};

export const generateJsTool: Tool = {
  name: 'generate_js',
  description: 'Generate JavaScript for interactive website components.',
  parameters: {
    section: 'The component or section requiring JS',
    requirements: 'Functional requirements (e.g., navbar toggle, animations)',
  },
  execute: async ({ section, requirements }) => {
    Logger.step('GENERATE', `Generating JS for ${section}...`);
    const prompt = `Generate modern JavaScript for the ${section}.
Requirements: ${requirements}
Respond ONLY with the code block.`;
    
    const gemini = new GeminiClient();
    const content = await gemini.generate(prompt);
    return content;
  },
};
