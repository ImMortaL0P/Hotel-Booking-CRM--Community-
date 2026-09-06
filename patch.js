const fs = require('fs');
const file = '/Users/mangalam/Downloads/Hotel Booking CRM (Community)/src/app/data/DataContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const logs = \[[\s\S]*?\];[\s\S]*?React\.useEffect\(\(\) => \{[\s\S]*?const intervals = \[.*?\];/g,
  `const logs = [
    "Connecting to ShardaCRM Platform...",
    "Render backend is sleeping. Sending wake-up signal...",
    "Container provisioning initialized...",
    "Starting Node.js + Express.js process...",
    "Establishing secure connection to MongoDB Atlas...",
    "Preparing collections for Rooms, Guests, and Bookings...",
    "Verifying Google Drive integration tokens...",
    "Almost there! Server is finalizing boot...",
    "Hold tight, this may take up to 60s on the free tier..."
  ];

  React.useEffect(() => {
    const intervals = [2500, 8000, 16000, 25000, 35000, 45000, 55000, 65000];`
);

fs.writeFileSync(file, content);
