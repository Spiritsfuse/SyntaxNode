import { Tool } from './registry';
import { GeminiClient } from '../core/gemini';
import { Logger } from '../core/logger';
import { SessionManager } from '../core/session';
import fs from 'fs';
import path from 'path';

export const generateHtmlTool: Tool = {
  name: 'generate_html',
  description: 'Generate HTML component and save to session components directory.',
  parameters: {
    section: 'e.g., header, hero, footer',
    prompt: 'Specific design details to match (from scrape analysis)',
  },
  execute: async ({ section, prompt }) => {
    Logger.step('GENERATE', `Generating HTML for ${section}...`);
    
    // Provide full page context
    const fullPrompt = `Generate a production-ready HTML5 snippet for the '${section}' section of the website.
Context: You are building ONE cohesive page. Ensure this section aligns with global design systems.
Requirements: ${prompt}
Use semantic HTML5. Respond ONLY with the code block.`;
    
    const gemini = new GeminiClient();
    const content = await gemini.generateCode(fullPrompt);
    
    const codeMatch = content.match(/```html\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const cleanContent = codeMatch ? codeMatch[1] : content;

    const session = SessionManager.getInstance();
    const filename = `${section.toLowerCase()}.html`;
    const fullPath = session.resolveComponentPath(filename);

    fs.writeFileSync(fullPath, cleanContent);
    
    // Update manifest
    const manifestPath = session.resolveComponentPath('manifest.json');
    let manifest = { components: [] as string[] };
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
    if (!manifest.components.includes(section.toLowerCase())) {
      manifest.components.push(section.toLowerCase());
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }
    
    session.addGeneratedFile(`components/${filename}`);
    return `✔ ${section} HTML written to components/${filename}`;
  },
};

export const generateCssTool: Tool = {
  name: 'generate_css',
  description: 'Generate global cohesive CSS for the entire page.',
  parameters: {
    prompt: 'Specific colors, fonts, and layout rules for the whole page',
  },
  execute: async ({ prompt }) => {
    Logger.step('GENERATE', `Generating Global CSS...`);
    const fullPrompt = `Generate premium, cohesive CSS3 for the ENTIRE website.
Context: This is a global stylesheet. It must support the header, hero, and footer sections harmoniously.
Requirements: ${prompt}
Use modern CSS (Flexbox/Grid), CSS variables for theming. Respond ONLY with the code block.`;
    
    const gemini = new GeminiClient();
    const content = await gemini.generateCode(fullPrompt);
    
    const codeMatch = content.match(/```css\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const cleanContent = codeMatch ? codeMatch[1] : content;

    const session = SessionManager.getInstance();
    const fullPath = session.resolveOutputPath('style.css');

    // Overwrite for global css
    fs.writeFileSync(fullPath, cleanContent);
    session.addGeneratedFile('style.css');
    
    return `✔ Global CSS generated at style.css`;
  },
};

export const generateJsTool: Tool = {
  name: 'generate_js',
  description: 'Generate global JavaScript for the entire page.',
  parameters: {
    prompt: 'Functional requirements (e.g., navbar toggle, animations)',
  },
  execute: async ({ prompt }) => {
    Logger.step('GENERATE', `Generating Global JS...`);
    const fullPrompt = `Generate modern JavaScript for the ENTIRE website.
Context: This script handles interactions for all components globally.
Requirements: ${prompt}
Respond ONLY with the code block.`;
    
    const gemini = new GeminiClient();
    const content = await gemini.generateCode(fullPrompt);
    
    const codeMatch = content.match(/```javascript\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const cleanContent = codeMatch ? codeMatch[1] : content;

    const session = SessionManager.getInstance();
    const fullPath = session.resolveOutputPath('script.js');

    fs.writeFileSync(fullPath, cleanContent);
    session.addGeneratedFile('script.js');
    
    return `✔ Global JS generated at script.js`;
  },
};
