const fs = require('fs');
let txt = fs.readFileSync('src/app/pages/Expenses.tsx', 'utf8');

txt = txt.replace(/<div className="flex flex-col h-full space-y-6">/, '<div className="flex flex-col h-full space-y-6 print:hidden">');

txt = txt.replace(/<div style={{ position: 'absolute', top: 0, left: 0, zIndex: -100, pointerEvents: 'none' }}>/, 
   '<div className="hidden print:block print:w-full print:m-0 print:p-0">');

fs.writeFileSync('src/app/pages/Expenses.tsx', txt);
