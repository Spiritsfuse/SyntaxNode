import { Tool } from './registry';
import puppeteer from 'puppeteer';
import { Logger } from '../core/logger';
import { SessionManager } from '../core/session';
import path from 'path';
import fs from 'fs';
import http from 'http';
import * as cheerio from 'cheerio';

export const scrapeWebsiteTool: Tool = {
  name: 'scrape_website',
  description: 'Scrape a website to mirror its fully hydrated DOM structure, intercept all network assets, and rewrite URLs for local replay.',
  parameters: {
    url: 'The URL to scrape (e.g., https://www.scaler.com)',
  },
  execute: async ({ url }) => {
    Logger.step('SCRAPE', `Intercepting network graph and staticizing ${url}...`);
    
    const session = SessionManager.getInstance();
    const sessionDir = session.resolveOutputPath('');
    const debugDir = session.resolveOutputPath('debug');
    fs.mkdirSync(debugDir, { recursive: true });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const targetOrigin = new URL(url).origin;
    const assetManifest: any[] = [];

    // 1. Intercept All Network Responses
    page.on('response', async (response) => {
        const reqUrl = response.url();
        const status = response.status();
        
        // Only capture successful GET requests
        if (status >= 200 && status < 300 && reqUrl.startsWith('http')) {
            try {
                let parsedUrl;
                try { parsedUrl = new URL(reqUrl); } catch(e) { return; }
                
                // Construct the local mirror path cleanly
                let localFilepath = parsedUrl.pathname;
                if (localFilepath === '/' || localFilepath === '') return; // Skip root HTML, we save it later

                let saveDir = sessionDir;
                // If cross-origin, save under external/hostname/
                if (parsedUrl.origin !== targetOrigin) {
                    saveDir = path.join(sessionDir, 'external', parsedUrl.hostname);
                }

                // localFilepath already drops query params perfectly thanks to parsedUrl.pathname!
                const dest = path.join(saveDir, localFilepath);
                
                // Track manifest
                assetManifest.push({
                    remote: reqUrl,
                    local: `.${localFilepath}`,
                    saved: true
                });

                fs.mkdirSync(path.dirname(dest), { recursive: true });

                const buffer = await response.buffer();
                fs.writeFileSync(dest, buffer);
                
            } catch (e) {
                // Ignore buffer failure for streams
            }
        }
    });

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Full Page Interaction Simulation
      Logger.info('Activating lazy content and simulating user interactions...');
      await page.mouse.move(200, 200);
      await page.mouse.move(600, 600);

      await page.evaluate(async () => {
        // Modal Guard
        if (typeof HTMLDialogElement !== 'undefined') {
          HTMLDialogElement.prototype.showModal = function() {};
        }

        // Trigger viewport changes
        window.dispatchEvent(new Event('resize'));
        document.dispatchEvent(new Event('visibilitychange'));

        // Deep auto-scroll Down
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 150;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight - window.innerHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 50);
        });

        // Reverse scroll Upward
        await new Promise<void>((resolve) => {
          const distance = -150;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            if (window.scrollY <= 0) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve();
            }
          }, 50);
        });

        // Hover Simulation on CTAs
        const ctas = document.querySelectorAll('a, button, [role="button"]');
        ctas.forEach(cta => {
          // Dispatch hover
          cta.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          cta.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        });

        // Tab focus cycling simulation
        const focusables = document.querySelectorAll('a, button, input, [tabindex]');
        focusables.forEach(el => {
          if (el instanceof HTMLElement) {
             el.focus();
             el.dispatchEvent(new Event('focusin', { bubbles: true }));
             el.blur();
             el.dispatchEvent(new Event('focusout', { bubbles: true }));
          }
        });
      });

      Logger.info('Waiting for Hydration & Animation stabilization (MutationObserver quiet-period)...');
      await page.evaluate(async () => {
        // MutationObserver stability check
        await new Promise<void>((resolve) => {
          let timeoutId: any;
          let absoluteTimeoutId: any;

          const finish = () => {
            observer.disconnect();
            clearTimeout(timeoutId);
            clearTimeout(absoluteTimeoutId);
            resolve();
          };

          const observer = new MutationObserver(() => {
            clearTimeout(timeoutId);
            // 2 seconds quiet period
            timeoutId = setTimeout(finish, 2000);
          });

          observer.observe(document.body, { 
            childList: true, subtree: true, attributes: true, characterData: true 
          });

          // Trigger finish if 2s pass without mutations immediately
          timeoutId = setTimeout(finish, 2000);
          // Absolute fallback of 15 seconds to prevent infinite hang
          absoluteTimeoutId = setTimeout(finish, 15000);
        });

        // requestAnimationFrame settling
        await new Promise<void>((resolve) => {
          let frames = 0;
          const loop = () => {
            frames++;
            if (frames > 15) resolve();
            else requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
        });

        // STRICT VISUAL-ONLY CLEANUP: Force page back to normal state before snapshot
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
        document.body.removeAttribute('data-scroll-locked');
        document.documentElement.style.overflow = '';

        // Remove modal/dialog elements
        const modals = document.querySelectorAll('[role="dialog"], [data-radix-dialog-content], [data-state="open"]');
        modals.forEach(m => m.remove());

        // Remove inert/aria-hidden from body/html
        document.body.removeAttribute('inert');
        document.body.removeAttribute('aria-hidden');
        document.documentElement.removeAttribute('inert');
        document.documentElement.removeAttribute('aria-hidden');
      });

      // Get FULL Hydrated DOM shell
      let fullDom = await page.evaluate(() => {
          // Serialize document properly
          return document.documentElement.outerHTML;
      });

      Logger.info('Rewriting root-absolute URLs to local relative paths using Cheerio...');
      
      const $ = cheerio.load(fullDom);

      // Safe Path Rewriter Function
      const rewritePath = (p: string | undefined): string | undefined => {
          if (!p) return undefined;
          p = p.trim();
          if (p.startsWith('/') && !p.startsWith('//')) {
              return '.' + p;
          }
          return p;
      };

      // Rewrite href attributes
      $('link[href], a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
              $(el).attr('href', rewritePath(href));
          }
      });

      // Rewrite src attributes
      $('img[src], script[src], iframe[src], source[src]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) {
              $(el).attr('src', rewritePath(src));
          }
      });

      // Rewrite srcset attributes
      $('source[srcset], img[srcset]').each((_, el) => {
          const srcset = $(el).attr('srcset');
          if (srcset) {
              const parts = srcset.split(',').map(part => {
                  const [url, size] = part.trim().split(/\s+/);
                  return `${rewritePath(url)}${size ? ' ' + size : ''}`;
              });
              $(el).attr('srcset', parts.join(', '));
          }
      });

      // Rewrite CSS url(...) safely within explicit <style> tags ONLY
      $('style').each((_, el) => {
          const cssContent = $(el).html();
          if (cssContent) {
              const newCss = cssContent.replace(/url\(['"]?\/([^/][^'"\)]*)['"]?\)/g, 'url("./$1")');
              $(el).html(newCss);
          }
      });

      // Proactive Lazy Asset Walk
      Logger.info('Walking DOM for missed lazy assets...');
      const axios = require('axios');
      const lazyPromises: Promise<void>[] = [];
      const downloadedPaths = new Set<string>();
      assetManifest.forEach(m => downloadedPaths.add(m.local));
      
      const collectAsset = async (assetUrl: string | undefined) => {
          if (!assetUrl) return;
          assetUrl = assetUrl.trim();
          if (assetUrl.startsWith('data:') || assetUrl.startsWith('blob:') || assetUrl.startsWith('#')) return;
          
          try {
              const fullUrl = new URL(assetUrl, url).href;
              const parsed = new URL(fullUrl);
              const p = parsed.pathname;
              
              if (!downloadedPaths.has(p) && (fullUrl.includes('scaler.com') || fullUrl.includes('storyblok'))) {
                  downloadedPaths.add(p); // Mark immediately to prevent duplicate fetches
                  const dest = path.join(sessionDir, p);
                  if (!fs.existsSync(dest)) {
                      fs.mkdirSync(path.dirname(dest), { recursive: true });
                      const response = await axios.get(fullUrl, { responseType: 'arraybuffer', validateStatus: () => true });
                      if (response.status === 200) {
                          fs.writeFileSync(dest, response.data);
                          assetManifest.push({ remote: fullUrl, local: `.${p}`, saved: true, lazy: true });
                      }
                  }
              }
          } catch(e) {}
      };

      $('[src]').each((_, el) => { lazyPromises.push(collectAsset($(el).attr('src'))); });
      $('[href]').each((_, el) => { lazyPromises.push(collectAsset($(el).attr('href'))); });
      $('[data-src]').each((_, el) => { lazyPromises.push(collectAsset($(el).attr('data-src'))); });
      $('[poster]').each((_, el) => { lazyPromises.push(collectAsset($(el).attr('poster'))); });
      $('[srcset], [data-srcset]').each((_, el) => {
          const srcset = $(el).attr('srcset') || $(el).attr('data-srcset');
          if (srcset) {
              srcset.split(',').forEach(part => {
                  lazyPromises.push(collectAsset(part.trim().split(/\s+/)[0]));
              });
          }
      });
      
      const cssRegex = /url\(['"]?([^'"\)]+)['"]?\)/g;
      let match;
      while ((match = cssRegex.exec($.html())) !== null) {
          lazyPromises.push(collectAsset(match[1]));
      }

      await Promise.all(lazyPromises);

      // Export the modified DOM safely
      fullDom = $.html();

      // Save Debug and Data Files
      const domPath = path.join(debugDir, 'dom-snapshot.html');
      fs.writeFileSync(domPath, fullDom);

      const manifestPath = path.join(debugDir, 'asset-manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(assetManifest, null, 2));

      await browser.close();
      return `✔ Successfully intercepted network graph and mirrored assets to ${sessionDir}. DOM saved.`;
    } catch (error: any) {
      await browser.close();
      throw new Error(`Scrape failed: ${error.message}`);
    }
  },
};

// Simple static file server
let localServer: http.Server | null = null;
const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.wasm': 'application/wasm'
};

export const openBrowserTool: Tool = {
  name: 'open_browser',
  description: 'Boot local replay server and validate runtime dependencies.',
  parameters: {
    path: 'The directory path to serve (ignored, orchestrator forces generated/current)',
  },
  execute: async ({ path: targetDir }) => {
    Logger.step('BROWSER', `Booting local replay server for ${targetDir}...`);
    
    // Stop existing server if running
    if (localServer) {
        localServer.close();
    }

    // Start static server
    await new Promise<void>((resolve, reject) => {
        localServer = http.createServer((req, res) => {
            let reqPath = req.url === '/' ? '/index.html' : req.url;
            // Remove query params
            reqPath = reqPath?.split('?')[0] || '/index.html';
            
            const filePath = path.join(targetDir, reqPath);
            const extname = String(path.extname(filePath)).toLowerCase();
            const contentType = MIME_TYPES[extname] || 'application/octet-stream';

            fs.readFile(filePath, (err, content) => {
                if (err) {
                    res.writeHead(404);
                    res.end(`File not found: ${reqPath}`);
                } else {
                    res.writeHead(200, { 
                        'Content-Type': contentType,
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    });
                    res.end(content, 'utf-8');
                }
            });
        }).listen(3000, () => resolve());
    });

    Logger.info('Server running on http://localhost:3000');
    Logger.info('Validating runtime dependencies via headless browser...');

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    let failedRequests = 0;
    let consoleErrors = 0;

    const OPTIONAL_DOMAINS = [
        'youtube.com', 'linkedin.com', 'google-analytics.com', 
        'googletagmanager.com', 'facebook.net', 'hotjar.com', 
        'clarity.ms', 'segment.com', 'stats', 'ptracking', 'ads',
        'googlevideo.com', 'vimeo.com', 'doubleclick.net', 'bing.com',
        'taboola.com', 'googleadservices.com', 'googletagservices.com',
        'amazon-adsystem.com', 'adnxs.com'
    ];

    const isOptional = (url: string) => {
        return OPTIONAL_DOMAINS.some(domain => url.includes(domain));
    };

    page.on('console', msg => {
        if (msg.type() === 'error') {
            Logger.warn(`[Browser Console Error] ${msg.text()}`);
            consoleErrors++;
        }
    });

    page.on('requestfailed', request => {
        const url = request.url();
        const errorText = request.failure()?.errorText;
        if (!isOptional(url) && errorText !== 'net::ERR_ABORTED') {
            Logger.error(`[Browser Network Error] ${url} failed: ${errorText}`);
            failedRequests++;
        }
    });

    page.on('response', response => {
        const rawUrl = response.url();
        const url = rawUrl.split('?')[0];
        if (response.status() >= 400 && url.startsWith('http://localhost')) {
            if (!isOptional(url)) {
                Logger.error(`[Browser Network 404] Missing asset: ${url}`);
                failedRequests++;
            }
        }
    });

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        
        const styleSheets = await page.evaluate(() => document.styleSheets.length);
        const scripts = await page.evaluate(() => document.querySelectorAll('script').length);
        
        Logger.info(`Runtime Diagnostics: Loaded ${styleSheets} stylesheets, ${scripts} scripts.`);
        
        if (failedRequests > 0) {
            await browser.close();
            throw new Error(`Runtime Replay Failed: ${failedRequests} CRITICAL dependencies failed to load. The session is incomplete.`);
        }
        
        if (styleSheets === 0) {
            await browser.close();
            throw new Error(`Runtime Replay Failed: 0 stylesheets loaded. CSS cascade is broken.`);
        }

        await browser.close();
        Logger.success('✔ Local runtime replay validated successfully.');

        // Open visible browser for user
        const open = (await import('open')).default;
        await open('http://localhost:3000');

        return `✔ Successfully started local server and validated runtime dependencies at http://localhost:3000`;
    } catch (e: any) {
        await browser.close();
        throw new Error(`Browser validation failed: ${e.message}`);
    }
  },
};
