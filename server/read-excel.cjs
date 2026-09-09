const xlsx = require('xlsx');
const fs = require('fs');
const workbook = xlsx.readFile("/Users/mangalam/Downloads/APFO/Check-in 2026-02-01 to 2026-09-10.xls");
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);
console.log("Total rows:", data.length);
console.log("First row:", data[0]);
console.log("Columns:", Object.keys(data[0] || {}));
