const fs = require('fs');
const file = 'src/app/pages/Expenses.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(
  /<div style={{ position: 'absolute', left: '-9999px', top: 0 }}>/g,
  '<div style={{ position: \'fixed\', top: 0, left: 0, zIndex: -9999, opacity: 0, pointerEvents: \'none\' }}>'
);

fs.writeFileSync(file, txt);
