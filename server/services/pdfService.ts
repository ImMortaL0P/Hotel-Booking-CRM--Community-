import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Ensure Tailwind renders properly in the PDF context by waiting for network idle
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Generate PDF
        // Using A4 format, but adapting width dynamically for optimal display
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
