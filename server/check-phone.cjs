const xlsx = require('xlsx');
const workbook = xlsx.readFile("/Users/mangalam/Downloads/APFO/Check-in 2026-02-01 to 2026-09-10.xls");
const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
console.log(data.find(r => r['Phone'] || r['Mobile'] || r['Telephone'] || r['Email'] || r['Phone Number']));
const allKeys = new Set();
data.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
console.log("All columns present anywhere in the file:", Array.from(allKeys));
