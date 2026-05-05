import puppeteer from 'puppeteer';
import path from 'path';

async function main() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const filePath = `file://${path.join(process.cwd(), 'generated', 'index.html')}`;
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'generated/preview.png', fullPage: true });
    await browser.close();
    console.log('Screenshot saved to generated/preview.png');
}

main().catch(console.error);
