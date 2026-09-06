const fs = require('fs');
let txt = fs.readFileSync('src/app/pages/InvoiceGenerator.tsx', 'utf8');

txt = txt.replace(/const downloadPDF = \(\) => \{[\s\S]*?html2pdf\(\)\.set\(opt\)\.from\(element\)\.save\(\);\s*\};/,
  `const downloadPDF = () => {
    alert("Please select 'Save as PDF' from the destination in the print dialog.");
    window.print();
  };`
);

txt = txt.replace(/const downloadPDFArchive = \(\) => \{[\s\S]*?html2pdf\(\)\.set\(opt\)\.from\(element\)\.save\(\);\s*\};/,
  `const downloadPDFArchive = () => {
    alert("Please select 'Save as PDF' from the destination in the print dialog.");
    window.print();
  };`
);

fs.writeFileSync('src/app/pages/InvoiceGenerator.tsx', txt);
