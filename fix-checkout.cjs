const fs = require('fs');

let txt = fs.readFileSync('src/app/pages/Checkout.tsx', 'utf8');
txt = txt.replace(/const downloadPDF = \(\) => \{[\s\S]*?html2pdf\(\)\.set\(opt\)\.from\(element\)\.save\(\);\s*\};/, 
  `const downloadPDF = () => {
    alert("Please select 'Save as PDF' from the destination dropdown natively for faster and better quality capture.");
    window.print();
  };`
);
fs.writeFileSync('src/app/pages/Checkout.tsx', txt);
