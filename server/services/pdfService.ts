import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import path from 'path';

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
    const isLocal = process.env.NODE_ENV !== 'production' && !process.env.RENDER;
    
    // In local development, you might need to point to your local Chrome/Chromium
    // If it fails locally, ensure you have Chrome installed in the typical path or use regular 'puppeteer' locally.
    const executablePath = isLocal 
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' // Example Mac path
      : await chromium.executablePath();

    const browser = await puppeteer.launch({
        args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: isLocal ? true : chromium.headless,
    });

    try {
        const page = await browser.newPage();

        // Ensure Tailwind renders properly in the PDF context by waiting for network idle
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Generate PDF
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
        await browser.close();
    }
}
