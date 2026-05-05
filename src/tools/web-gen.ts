import { Tool } from './registry';
import { GeminiClient } from '../core/gemini';
import { Logger } from '../core/logger';

const gemini = new GeminiClient();

export const generateHtmlTool: Tool = {
  name: 'generate_html',
  description: 'Generate high-quality HTML structure for a specific section.',
  parameters: {
    section: 'The section to generate (e.g., hero, header, footer)',
    requirements: 'Additional requirements for the section',
  },
  execute: async ({ section, requirements }) => {
    Logger.info(`Generating HTML for ${section}...`);
    const prompt = `Generate semantic HTML5 code for the '${section}' section of a website cloning Scaler Academy.
Requirements: ${requirements}
Use modern tags, include classes for styling, and ensure accessibility.
Return ONLY the HTML code block.`;
    
    return await gemini.generate(prompt);
  },
};

export const generateCssTool: Tool = {
  name: 'generate_css',
  description: 'Generate professional CSS for a specific section or component.',
  parameters: {
    section: 'The section to style',
    htmlContext: 'The HTML structure this CSS should apply to',
    requirements: 'Additional styling requirements',
  },
  execute: async ({ section, htmlContext, requirements }) => {
    Logger.info(`Generating CSS for ${section}...`);
    const prompt = `Generate premium CSS3 code for the following HTML structure:
${htmlContext}

Section: ${section}
Requirements: ${requirements}
Use modern CSS features (Flexbox, Grid, Variables), premium color palettes (gradients, dark mode support), and smooth animations.
Follow ui-ux-pro-max principles: elegant spacing, clean typography, responsive design.
Return ONLY the CSS code block.`;
    
    return await gemini.generate(prompt);
  },
};

export const generateJsTool: Tool = {
  name: 'generate_js',
  description: 'Generate high-quality JavaScript for interactivity and animations.',
  parameters: {
    section: 'The section or feature to script',
    requirements: 'Additional logic requirements',
  },
  execute: async ({ section, requirements }) => {
    Logger.info(`Generating JS for ${section}...`);
    const prompt = `Generate modern, efficient JavaScript code for the '${section}' section of a website cloning Scaler Academy.
Requirements: ${requirements}
Use ES6+ features, ensure performance, and handle interactions/animations smoothly.
Return ONLY the JavaScript code block.`;
    
    return await gemini.generate(prompt);
  },
};

