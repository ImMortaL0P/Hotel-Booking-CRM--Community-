const fs = require('fs');
const file = 'src/app/pages/Expenses.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(
`      html2pdf().set(opt).from(element).save().then(() => {
        setIsGeneratingPDF(false);
        setIsExportMode(false);
      });`,
`      try {
        html2pdf().set(opt).from(element).save().then(() => {
          setIsGeneratingPDF(false);
          setIsExportMode(false);
        }).catch((err: any) => {
          console.error("PDF generation failed", err);
          setIsGeneratingPDF(false);
        });
      } catch (err) {
        console.error("PDF generation sync error", err);
        setIsGeneratingPDF(false);
      }`
)

fs.writeFileSync(file, txt);
