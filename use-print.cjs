const fs = require('fs');

function replaceFile(path, replacements) {
    let txt = fs.readFileSync(path, 'utf8');
    for (let r of replacements) {
        txt = txt.replace(r.from, r.to);
    }
    fs.writeFileSync(path, txt);
}

// 1. Checkout.tsx
replaceFile('src/app/pages/Checkout.tsx', [
    {
        from: /import html2pdf from 'html2pdf\.js';\s*/g,
        to: ''
    },
    {
        from: /const handleDownloadPDF = \(\) => {[\s\S]*?html2pdf\(\)\.set\(opt\)\.from\(element\)\.save\(\);\s*};/g,
        to: `const handleDownloadPDF = () => {
    // Replaced with native print to avoid freezing on memory-constrained devices
    window.print();
  };`
    },
    {
        from: /Download PDF/g,
        to: "Save as PDF"
    }
]);

// 2. InvoiceGenerator.tsx
replaceFile('src/app/pages/InvoiceGenerator.tsx', [
    {
        from: /import html2pdf from 'html2pdf\.js';\s*/g,
        to: ''
    },
    {
        from: /const handleDownloadPDF = \(\) => {[\s\S]*?html2pdf\(\)\.set\(opt\)\.from\(element\)\.save\(\);\s*};/g,
        to: `const handleDownloadPDF = () => {
    window.print();
  };`
    },
    {
        from: /const handleDownloadArchivePDF = \(\) => {[\s\S]*?html2pdf\(\)\.set\(opt\)\.from\(element\)\.save\(\);\s*};/g,
        to: `const handleDownloadArchivePDF = () => {
    window.print();
  };`
    },
    {
        from: /Download PDF/g,
        to: "Save as PDF"
    }
]);

// 3. Payments.tsx
replaceFile('src/app/pages/Payments.tsx', [
    {
        from: /import html2pdf from 'html2pdf\.js';\s*/g,
        to: ''
    },
    {
        from: /html2pdf\(\)\.set\(\{[\s\S]*?\.save\(\);/g,
        to: `window.print();`
    },
    {
        from: /Download PDF/g,
        to: "Save as PDF"
    }
]);

// 4. Expenses.tsx
replaceFile('src/app/pages/Expenses.tsx', [
    {
        from: /import html2pdf from 'html2pdf\.js';\s*/g,
        to: ''
    },
    {
        from: /const handleExportPDF = \(\) => \{[\s\S]*?\}\, 500\)\;\s*\};/g,
        to: `const handleExportPDF = () => {
    setIsGeneratingPDF(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsGeneratingPDF(false);
        setIsExportMode(false);
      }, 1000);
    }, 500);
  };`
    }
]);

