# AuraSound Pro - Premium Spotify Clone

A high-fidelity Spotify Clone built with **React, Vite, Express, and SQLite**. It features standard player controls, Google OAuth, and unique premium features: a real-time audio visualizer, a 3-band studio equalizer, custom audio file uploads with metadata parsing, scroll-synced translation lyrics, an interactive AI Radio Host (AI DJ), and a **Jamendo Cloud API Integration** for searching and streaming thousands of free tracks.

---

## Features

1.  **Jamendo Cloud Integration**: Search and stream the entire Jamendo catalog dynamically directly within the player. Seamlessly add Jamendo tracks to your local playlists (which are automatically imported to the local DB).
2.  **3-Band Graphic Equalizer**: True real-time audio filtering (Bass, Mid, Treble) using Web Audio API nodes. Works for both local and Jamendo tracks!
3.  **Interactive Canvas Visualizers**: Real-time frequency spectrum, oscilloscope waves, or a pulsing circular Mandala responsive to playback.
4.  **Bilingual Synced Lyrics**: Timed lyrics that highlight automatically as the song plays, with dual-language display options (Original, Translation, or Dual Side-by-Side).
5.  **AI DJ / Radio Station**: Prompt-based playlist generator that simulates a voice intro utilizing the Web Speech API (synthesized radio voice!).
6.  **Community Time-pin Comments**: Social comment threads that link comments to exact timestamps in a track. Click on any comment to seek to that moment.
7.  **Local Audio Uploads**: Publish your own audio tracks. Multer and `music-metadata` automatically extract ID3 tags, cover art, and title details, with a visual timestamp editor for lyrics.
8.  **Google OAuth & Mock Authentication**: Easy sign-in. Runs in an offline Sandbox Demo mode out-of-the-box if no Google Client ID is configured.

---

## Configuration & API Setup

### 1. Configure Jamendo API Key (Recommended)
By adding a Jamendo Client ID, you can search and stream thousands of actual songs inside the app:
1. Go to the [Jamendo Developer Portal](https://developer.jamendo.com/).
2. Create an account and register a new Application to obtain a **Client ID** (API Key).
3. Open `frontend/.env` and paste it:
   ```env
   VITE_JAMENDO_CLIENT_ID=your_client_id_here
   ```
4. Open `backend/.env` and paste it (optional, for reference):
   ```env
   JAMENDO_CLIENT_ID=your_client_id_here
   ```
5. Restart your servers. Now, when you search in the search bar, a new **Jamendo Cloud Search Results** section will populate with real tracks!

### 2. Configure Google Authentication (Optional)
To use real Google Sign-In:
1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Setup OAuth Credentials (choose Web Application) and add `http://localhost:5173` as an Authorized Origin.
3. Copy the Client ID.
4. Add it to `frontend/.env`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
   ```
5. Add it to `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
   ```

---

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- npm

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Seed the database (downloads the real tracks of Ed Sheeran, Kabira, and Dil Diyan Gallan, and sets up bilingual synced lyrics):
   ```bash
   npm run seed
   ```
4. Start the Express server (starts on `http://localhost:3001`):
   ```bash
   npm start
   ```

### 2. Frontend Setup
1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.
