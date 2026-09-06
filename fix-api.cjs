const fs = require('fs');
const file = 'src/app/lib/api.ts';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(
  /const baseUrl = import.meta.env.VITE_API_BASE_URL \|\| '';/,
  `// Use local vite proxy during development, use production URL when deployed
  const baseUrl = import.meta.env.DEV 
    ? '' 
    : (import.meta.env.VITE_API_BASE_URL || 'https://sharda-crm.onrender.com');`
);

fs.writeFileSync(file, txt);
