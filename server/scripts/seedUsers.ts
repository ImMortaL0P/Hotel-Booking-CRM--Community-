import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { connectDB } from '../db.js';

dotenv.config();

const users = [
  { _id: 'mangalam', name: 'Mangalam', email: 'mangalam@shardapalace.in', password: 'Kukku404#', role: 'superadmin', avatar: 'M' },
  { _id: 'harsh', name: 'Harsh Chandra', email: 'harsh@shardapalace.in', password: 'Harsh#123', role: 'owner', avatar: 'H' },
  { _id: 'arya', name: 'Arya Chandra', email: 'arya@shardapalace.in', password: 'Ekta#143', role: 'owner', avatar: 'A' },
  { _id: 'frontdesk1', name: 'Front Desk', email: 'frontdesk@shardapalace.in', password: 'sharda#321', role: 'front-desk', avatar: 'F' }
];

async function seedUsers() {
  try {
    await connectDB();
    console.log('Connected to DB');

    for (const u of users) {
      const existing = await User.findById(u._id).select('+password');
      if (existing) {
        existing.name = u.name;
        existing.email = u.email;
        existing.role = u.role;
        existing.avatar = u.avatar;

        // This will hash the password through our pre-save hook
        // @ts-ignore
        existing.password = u.password;
        await existing.save();
        console.log(`Updated user: ${u._id}`);
      } else {
        const newUser = new User(u);
        await newUser.save();
        console.log(`Created user: ${u._id}`);
      }
    }

    console.log('User seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
