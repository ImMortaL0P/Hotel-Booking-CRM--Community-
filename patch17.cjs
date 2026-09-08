const fs = require('fs');
const file = 'src/app/lib/api.ts';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(
`    if (!response.ok) {
      throw new Error(\`API error: \${response.status} \${response.statusText}\`);
    }`,
`    if (!response.ok) {
      if (response.status === 401) {
         localStorage.removeItem('token');
         localStorage.removeItem('user');
         window.location.href = '/login'; // Or just force a reload so App.tsx returns to login
      }
      throw new Error(\`API error: \${response.status} \${response.statusText}\`);
    }`
);

fs.writeFileSync(file, txt);
