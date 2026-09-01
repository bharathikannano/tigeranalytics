# Retail Pricing Feed Management System

This repository contains a full-stack web application for managing retail pricing feeds. It allows store managers to upload CSV pricing feeds, search, and edit records inline.

## Tech Stack
- **Frontend (Client):** React 18, Vite, TypeScript, TailwindCSS
- **Backend (Server):** Node.js, Express, SQLite3 (better-sqlite3)

## Prerequisites
- **Node.js**: v18 or newer
- **npm**: v9 or newer

## Getting Started

### 1. Backend Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure you have an `.env` file in the `server` directory. Example:
   ```env
   PORT=4000
   NODE_ENV=development
   DB_PATH=./data/pricing.db
   CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175
   UPLOAD_SIZE_LIMIT_MB=50
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX=200
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development client:
   ```bash
   npm run dev
   ```
4. The client will start on `http://localhost:5173` (or the next available port).

## Architecture Visualization
To view the architecture diagram directly within the app, ensure both the server and client are running, and navigate to the **Architecture** tab (`/architecture`) in the client UI.

Alternatively, you can manually open the `ARCHITECTURE_VISUAL.html` file in the root directory in any web browser.

## Database
The system uses a local SQLite database located by default at `server/data/pricing.db`. This file is ignored by Git to prevent data leakage and merge conflicts.
