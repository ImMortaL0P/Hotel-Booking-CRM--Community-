import mongoose from 'mongoose';

// Disable query buffering so disconnected DB operations never hang for 10 seconds
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 2000);

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || '');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`MongoDB Atlas connection note: ${error.message || error}`);
    console.log('Server continuing to run. Update server/.env with valid credentials for local DB operations.');
  }
};
