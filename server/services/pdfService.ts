import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Launching Chromium costs seconds and ~100 MB each time, so one browser is
// shared across exports and closed after a few idle minutes (Render's free
// tier has little memory to spare).
const IDLE_CLOSE_MS = 3 * 60_000;
let browserPromise: Promise<Browser> | null = null;
let idleTimer: NodeJS.Timeout | null = null;
let inFlight = 0;

async function launchBrowser(): Promise<Browser> {
    const isLocal = process.env.NODE_ENV !== 'production' && !process.env.RENDER;

    // In local development, point to a local Chrome/Chromium install
    const executablePath = isLocal
      ? (process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      : await chromium.executablePath();

    const browser = await puppeteer.launch({
        args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
        executablePath,
        // @sparticuz/chromium >= 1xx dropped `defaultViewport`/`headless`; they were
        // undefined here already, i.e. puppeteer's defaults (headless, 800x600).
        headless: true,
    });
    browser.on('disconnected', () => { browserPromise = null; });
    return browser;
}

function getBrowser(): Promise<Browser> {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (!browserPromise) {
        browserPromise = launchBrowser().catch(err => { browserPromise = null; throw err; });
    }
    return browserPromise;
}

function scheduleIdleClose() {
    if (inFlight > 0 || !browserPromise) return;
    idleTimer = setTimeout(async () => {
        const p = browserPromise;
        browserPromise = null;
        idleTimer = null;
        (await p?.catch(() => null))?.close().catch(() => {});
    }, IDLE_CLOSE_MS);
}

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
    inFlight++;
    let page: Page | undefined;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        // Self-contained HTML (CSS inlined by the app) renders on 'load'; only wait
        // for the network to go idle when the page pulls in external scripts/styles
        // (older clients still send the Tailwind CDN script, ~1s per PDF).
        const external = /<script[^>]+src=|<link[^>]+stylesheet/i.test(html);
        await page.setContent(html, { waitUntil: external ? 'networkidle0' as any : 'load' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        return Buffer.from(pdfBuffer);
    } finally {
        await page?.close().catch(() => {});
        inFlight--;
        scheduleIdleClose();
    }
}
