import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import apiRoutes from './routes/api.js';
dotenv.config();
const PORT = process.env.PORT || 5000;
// Initialize express
const app = express();
// Middleware
app.use(cors());
app.use(express.json());
// Routes
app.use('/api', apiRoutes);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', msg: 'ShardaCRM Backend is running' });
});
// Start Server
if (process.env.NODE_ENV !== 'test') {
    connectDB().then(() => {
        // Listen on all network interfaces (0.0.0.0) so it's accessible over network
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Accessible on your local network/internet if exposed`);
        });
    });
}
export default app;
