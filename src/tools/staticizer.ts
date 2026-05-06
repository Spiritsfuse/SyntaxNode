import { Tool } from './registry';
import { Logger } from '../core/logger';
import { SessionManager } from '../core/session';
import fs from 'fs';
import * as cheerio from 'cheerio';

export const cleanDomTool: Tool = {
  name: 'clean_dom',
  description: 'Clean the scraped DOM snapshot using a deterministic parser. Removes analytics, trackers, and normalizes structure without generating new content.',
  parameters: {
    prompt: 'Optional instructions (ignored, since cleaning is deterministic)',
  },
  execute: async () => {
    Logger.step('STATICIZER', `Cleaning DOM deterministically...`);
    
    const session = SessionManager.getInstance();
    const domPath = session.resolveOutputPath('debug/dom-snapshot.html');
    
    if (!fs.existsSync(domPath)) {
      throw new Error('DOM snapshot not found. Run scrape_website first.');
    }
    
    const rawDom = fs.readFileSync(domPath, 'utf8');
    const $ = cheerio.load(rawDom);

    // Safely stub analytics instead of removing inline scripts which might contain animation logic
    const stubScript = `
      <script>
        window.mixpanel = {
          track: function(){},
          init: function(){},
          people: { set: function(){} },
          identify: function(){}
        };
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
      </script>
    `;
    $('head').prepend(stubScript);

    // Only remove purely external tracking scripts to avoid deleting inline hydration/animation logic
    const trackerKeywords = [
      'google-analytics.com', 'gtm.js', 'facebook.net/en_US/fbevents.js', 
      'hotjar.com', 'clarity.ms', 'segment.com', 'mixpanel.com', 
      'px.ads.linkedin.com', 'licdn.com', 'bat.bing.com', 'taboola.com', 
      'googleadservices.com', 'connect.facebook.net'
    ];
    
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      const isTracker = trackerKeywords.some(kw => src.includes(kw));
      if (isTracker) {
        $(el).remove();
      }
    });

    $('iframe[src*="googletagmanager.com"]').remove();

    const cleanContent = $.html();
    const fullPath = session.resolveOutputPath('index.html');
    fs.writeFileSync(fullPath, cleanContent);
    session.addGeneratedFile('index.html');
    
    return `✔ Cleaned DOM deterministically written to index.html (0 LLM hallucination). Removed tracking scripts.`;
  },
};

