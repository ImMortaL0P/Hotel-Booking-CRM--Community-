const fs = require('fs');
const file = 'src/app/pages/Expenses.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(
  /<div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -9999, pointerEvents: 'none' }}>/g,
  '<div style={{ position: \'absolute\', top: 0, left: 0, zIndex: -100, pointerEvents: \'none\' }}>'
);

fs.writeFileSync(file, txt);
