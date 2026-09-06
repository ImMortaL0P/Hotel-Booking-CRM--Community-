const fs = require('fs');
const file = 'src/app/pages/Expenses.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(
  /html2canvas:  \{ scale: 2 \},/g,
  "html2canvas:  { scale: 2, useCORS: true, windowWidth: 800, logging: false },"
);

// also let's make sure the settimeout uses 500ms instead of 200ms to be perfectly safe for react render commits.
txt = txt.replace(
  /}, 200\);/g,
  "}, 500);"
);

fs.writeFileSync(file, txt);
