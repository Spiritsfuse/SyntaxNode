import { Tool } from './registry';
import fs from 'fs';
import { Logger } from '../core/logger';
import { SessionManager } from '../core/session';
import path from 'path';

export const assembleHtmlTool: Tool = {
  name: 'assemble_html',
  description: 'Assemble all generated components into the final index.html using the base template and scraped head data.',
  parameters: {},
  execute: async () => {
    Logger.step('ASSEMBLE', `Assembling final index.html...`);

    const session = SessionManager.getInstance();
    const manifestPath = session.resolveComponentPath('manifest.json');
    const scrapedDataPath = session.resolveOutputPath('scraped_data.json');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found at ${manifestPath}. Cannot assemble without components.`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const components: string[] = manifest.components || [];

    if (components.length === 0) {
      throw new Error('No components found in manifest to assemble.');
    }

    const templatePath = path.resolve(process.cwd(), 'src/templates/base.html');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found at ${templatePath}`);
    }

    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // Inject head tags
    if (fs.existsSync(scrapedDataPath)) {
      const scrapedData = JSON.parse(fs.readFileSync(scrapedDataPath, 'utf8'));
      if (scrapedData.head) {
        htmlTemplate = htmlTemplate.replace('{{title}}', scrapedData.head.title || 'SyntaxNode Clone');
        htmlTemplate = htmlTemplate.replace('{{meta}}', scrapedData.head.meta || '');
        htmlTemplate = htmlTemplate.replace('{{favicon}}', scrapedData.head.favicon || '');
      }
    } else {
      htmlTemplate = htmlTemplate.replace('{{title}}', 'SyntaxNode Clone');
      htmlTemplate = htmlTemplate.replace('{{meta}}', '');
      htmlTemplate = htmlTemplate.replace('{{favicon}}', '');
    }

    for (const component of components) {
      const compPath = session.resolveComponentPath(`${component}.html`);
      if (fs.existsSync(compPath)) {
        const content = fs.readFileSync(compPath, 'utf8');
        // Replace placeholder like {{header}}
        const regex = new RegExp(`{{${component}}}`, 'g');
        if (htmlTemplate.match(regex)) {
           htmlTemplate = htmlTemplate.replace(regex, `\n  <!-- Section: ${component} -->\n  ${content}\n`);
        } else {
           // If no placeholder, append before closing body
           htmlTemplate = htmlTemplate.replace('</body>', `\n  <!-- Section: ${component} -->\n  ${content}\n</body>`);
        }
      } else {
        Logger.warn(`Component file not found: ${component}.html`);
      }
    }

    // Clean up any unused placeholders
    htmlTemplate = htmlTemplate.replace(/{{[a-zA-Z0-9_-]+}}/g, '');

    const fullOutputPath = session.resolveOutputPath('index.html');
    fs.writeFileSync(fullOutputPath, htmlTemplate);
    
    session.addGeneratedFile('index.html');
    return `✔ Successfully assembled ${components.length} components into index.html`;
  },
};
