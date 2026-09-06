const fs = require('fs');
const file = 'src/app/pages/Expenses.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(
  /jsPDF:\s+\{ unit: 'in', format: 'letter', orientation: 'portrait' \}/g,
  "jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },\n        pagebreak:    { mode: ['css', 'legacy'], avoid: 'tr' }"
);

fs.writeFileSync(file, txt);
