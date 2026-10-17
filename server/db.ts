import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || '');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`MongoDB Atlas connection note: ${error.message || error}`);
    console.log('Server continuing to run. Update server/.env with valid credentials for local DB operations.');
  }
};
