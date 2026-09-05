# ShardaCRM Express Backend

This directory contains the Express + Mongoose REST API backend to support data persistence for ShardaCRM.

## Prerequisites
1. A MongoDB Atlas cluster (or local MongoDB database).

## Setup
1. Create a `.env` file in this directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your `MONGODB_URI`.

## Scripts
- **Start server**: `npm run dev`
- **Seed database**: `npm run seed` (Clears current DB and initializes with project mock data)
