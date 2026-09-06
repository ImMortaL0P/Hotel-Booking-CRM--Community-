import fs from 'fs';
let content = fs.readFileSync('src/app/pages/Expenses.tsx', 'utf8');

// Add roomNum to ledgerEntries
const ledgerEntriesRegex = /const ledgerEntries = useMemo\(\(\) => \{[\s\S]*?\}, \[payments, expenses, bookings, fromDate, toDate, filterRoom\]\);/;
const newLedgerEntries = `
  const ledgerEntries = useMemo(() => {
    const roomMap = new Map();
    rooms.forEach(r => roomMap.set(r.id, r.number));

    const bookingMap = new Map();
    bookings.forEach(b => bookingMap.set(b.id, b));

    const entries = [];

    const lenP = payments.length;
    for (let i = 0; i < lenP; i++) {
      const p = payments[i];
      if (p.status !== 'Completed') continue;
      const d = p.date.split('T')[0];
      if (d >= fromDate && d <= toDate) {
        const b = bookingMap.get(p.bookingId);
        if (!filterRoom || b?.roomId === filterRoom) {
          entries.push({
            type: 'INCOME',
            date: d,
            amount: p.amount,
            source: 'Room Booking',
            roomId: b?.roomId,
            roomNum: b?.roomId ? roomMap.get(b.roomId) : null,
            description: \`Payment for booking \${p.bookingId} via \${p.mode}\`,
            id: p.id
          });
        }
      }
    }

    const lenE = expenses.length;
    for (let i = 0; i < lenE; i++) {
        const e = expenses[i];
        if (e.date >= fromDate && e.date <= toDate) {
            if (!filterRoom || e.roomId === filterRoom) {
               entries.push({
                   type: 'EXPENSE',
                   date: e.date,
                   amount: e.amount,
                   source: e.category,
                   roomId: e.roomId,
                   roomNum: e.roomId ? roomMap.get(e.roomId) : null,
                   description: e.description,
                   category: e.category,
                   id: e.id
               });
            }
        }
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses, bookings, rooms, fromDate, toDate, filterRoom]);
`;
content = content.replace(ledgerEntriesRegex, newLedgerEntries.trim());

// replace rooms.find inside ledger table
content = content.replace(/\{entry\.roomId \? \`(Room \$\{rooms\.find\(r => r\.id === entry\.roomId\)\?\.number\})\` : 'Property Wide'\}/g, "{entry.roomNum ? `Room ${entry.roomNum}` : 'Property Wide'}");

// Now we need to defer rendering the hidden area
// Find the state variables and inject isGeneratingPDF
const stateRegex = /const \[isExportMode, setIsExportMode\] = useState\(false\);/;
content = content.replace(stateRegex, 'const [isExportMode, setIsExportMode] = useState(false);\n  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);');

// Alter handleExportPDF
const handleExportPDFRegex = /const handleExportPDF = \(\) => \{[\s\S]*? setIsExportMode\(false\);\n    \}\);\n  \};/;
const newHandleExportPDF = `
  const handleExportPDF = () => {
    setIsGeneratingPDF(true);
    // Wait for the next tick for React to render the table in DOM
    setTimeout(() => {
      const element = document.getElementById('export-pdf-area');
      if (!element) {
        setIsGeneratingPDF(false);
        return;
      }
  
      const opt = {
        margin:       0.5,
        filename:     \`Balance_Sheet_\${exportFrom}_to_\${exportTo}.pdf\`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
  
      html2pdf().set(opt).from(element).save().then(() => {
        setIsGeneratingPDF(false);
        setIsExportMode(false);
      });
    }, 200);
  };
`;
content = content.replace(handleExportPDFRegex, newHandleExportPDF.trim());

// And replace 'isExportMode && (' wrapping the Hidden Export Area with 'isGeneratingPDF && ('
const hiddenAreaRegex = /\{\/\* Hidden Export Area for PDF \*\/\}\n\s*<div style=\{\{ position: 'absolute', left: '-9999px', top: 0 \}\}>\n\s*\{isExportMode && \(/g;
content = content.replace(hiddenAreaRegex, "{/* Hidden Export Area for PDF */}\n      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>\n        {isGeneratingPDF && (");

// And add UI feedback to the Download PDF button
const downloadButtonRegex = /<button onClick=\{handleExportPDF\} className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md font-bold">\n\s*<Download className="w-4 h-4" \/> Download PDF \(Balance Sheet\)\n\s*<\/button>/;
const newDownloadButton = `<button onClick={handleExportPDF} disabled={isGeneratingPDF} className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md font-bold">
                   <Download className="w-4 h-4" /> {isGeneratingPDF ? 'Generating...' : 'Download PDF (Balance Sheet)'}
                 </button>`;
content = content.replace(downloadButtonRegex, newDownloadButton);                 

fs.writeFileSync('src/app/pages/Expenses.tsx', content);
