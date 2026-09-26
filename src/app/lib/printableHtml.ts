/**
 * Self-contained HTML for server-side PDF rendering.
 *
 * Previously each document shipped `<script src="https://cdn.tailwindcss.com">`,
 * so headless Chrome on the server downloaded and JIT-compiled Tailwind for
 * every PDF (~1s+, and PDFs broke whenever the CDN was slow). The app's own
 * compiled stylesheet already contains every class the invoice/receipt
 * templates use, so it is inlined instead and the page renders on 'load'.
 */
let cachedCss: string | null = null;

function collectAppCss(): string {
  if (cachedCss !== null) return cachedCss;
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + '\n';
    } catch {
      // Cross-origin sheets (Google Fonts) can't be read; they aren't needed for layout
    }
  }
  // Don't cache an empty result (styles may not be attached yet in dev)
  if (css) cachedCss = css;
  return css;
}

export function buildPrintableHtml(bodyHtml: string, bodyClass = 'p-4 bg-white text-black print:m-0 w-[800px]'): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${collectAppCss()}</style></head><body class="${bodyClass}">${bodyHtml}</body></html>`;
}
