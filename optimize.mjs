import fs from 'fs';
let content = fs.readFileSync('src/app/pages/Expenses.tsx', 'utf8');

const exportEntriesRegex = /const exportEntries = useMemo\(\(\) => \{[\s\S]*?\}, \[payments, expenses, bookings, exportFrom, exportTo\]\);/;

const newExportEntries = `
  const exportEntries = useMemo(() => {
    // 1. Build O(1) lookups
    const roomMap = new Map();
    rooms.forEach(r => roomMap.set(r.id, r.number));
    
    const bookingMap = new Map();
    bookings.forEach(b => bookingMap.set(b.id, b));
    
    const entries = [];
    
    const lenP = payments.length;
    for(let i=0; i<lenP; i++) {
        const p = payments[i];
        if (p.status !== 'Completed') continue;
        const d = p.date.split('T')[0];
        if (d >= exportFrom && d <= exportTo) {
           const b = bookingMap.get(p.bookingId);
           const rNum = b?.roomId ? roomMap.get(b.roomId) : null;
           entries.push({
               type: 'INCOME',
               date: d,
               amount: p.amount,
               source: 'Room Booking',
               roomId: b?.roomId,
               roomNum: rNum,
               description: \`Payment for booking \${p.bookingId} via \${p.mode}\`,
               id: p.id
           });
        }
    }
    
    const lenE = expenses.length;
    for(let i=0; i<lenE; i++) {
        const e = expenses[i];
        if (e.date >= exportFrom && e.date <= exportTo) {
           const rNum = e.roomId ? roomMap.get(e.roomId) : null;
           entries.push({
               type: 'EXPENSE',
               date: e.date,
               amount: e.amount,
               source: e.category,
               roomId: e.roomId,
               roomNum: rNum,
               description: e.description,
               category: e.category,
               id: e.id
           });
        }
    }
    
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses, bookings, rooms, exportFrom, exportTo]);
`;

content = content.replace(exportEntriesRegex, newExportEntries.trim());

// Also remove `rooms.find` from the HTML table rows and conditionally render the PDF area
content = content.replace(/\{item\.roomId \? \`(Rm \$\{rooms\.find\(r => r\.id === item\.roomId\)\?\.number\})\` : ''\}/g, "{item.roomNum ? `(Rm ${item.roomNum})` : ''}");

content = content.replace(/\{\/\* Hidden Export Area for PDF \*\/\}\n\s*<div style=\{\{ position: 'absolute', left: '-9999px', top: 0 \}\}>/g, "{/* Hidden Export Area for PDF */}\n      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>\n        {isExportMode && (");
content = content.replace(/<div className="mt-16 text-center text-xs text-gray-500">System Generated Balance Sheet • Sharda Palace<\/div>\n\s*<\/div>\n\s*<\/div>/g, '<div className="mt-16 text-center text-xs text-gray-500">System Generated Balance Sheet • Sharda Palace</div>\n        </div>\n        )}\n      </div>');

const ledgerEntriesRegex = /const ledgerEntries = useMemo\(\(\) => \{[\s\S]*?\}, \[payments, expenses, bookings, fromDate, toDate, filterRoom\]\);/;
const newLedgerEntries = `
  const ledgerEntries = useMemo(() => {
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
                   description: e.description,
                   category: e.category,
                   id: e.id
               });
            }
        }
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses, bookings, fromDate, toDate, filterRoom]);
`;
content = content.replace(ledgerEntriesRegex, newLedgerEntries.trim());

fs.writeFileSync('src/app/pages/Expenses.tsx', content);
