const fs = require('fs');
const file = 'src/app/pages/Expenses.tsx';
let txt = fs.readFileSync(file, 'utf8');

// Replace the grid container
txt = txt.replace(
  /<div className="grid grid-cols-2 gap-8">/g,
  '<div className="flex flex-col gap-8">'
);

// We should also remove absolute left:-9999px and replace it with something display:none-like but not quite.
// Actually, left: -9999px is fine for vertical blocks. But html2pdf fails if it's inside an absolute wrapper that doesn't expand properly or exceeds canvas limits.
// To fix clipping / canvas limits, html2pdf needs it to NOT be absolute sometimes.
// Actually, html2pdf requires the element to be visible when it captures. A better approach is to render it in a fixed full-screen overlay during capture, or just use absolute with wide height.

fs.writeFileSync(file, txt);
