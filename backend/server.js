import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as musicMetadata from 'music-metadata';
import { OAuth2Client } from 'google-auth-library';
import { getDb, initDb } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB on startup
await initDb();

const app = express();
const PORT = process.env.PORT || 3001;

// Setup directories
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Google Auth client setup
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const client = new OAuth2Client(CLIENT_ID);

app.use(cors());
app.use(express.json());
// Serve uploads folder as static
app.use('/uploads', express.static(uploadsDir));

// Multer storage setup for song files and custom cover arts
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.mp3' || ext === '.wav' || ext === '.ogg' || ext === '.m4a' || ext === '.jpg' || ext === '.png' || ext === '.jpeg' || ext === '.webp') {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only audio files and images are allowed.'));
    }
  }
});

// Middleware for basic auth simulation
// In a real app we would use JWTs, but for local clone developer ease, we can pass user ID in the headers
app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  req.userId = userId || null;
  next();
});

// ---------------- AUTH ENDPOINTS ----------------

// Google Auth & Mock Auth Login
app.post('/api/auth/google', async (req, res) => {
  const { credential, mockUser } = req.body;

  try {
    let email, name, avatar_url, google_id;

    if (mockUser) {
      // Developer bypass / Mock Auth
      email = mockUser.email;
      name = mockUser.name;
      avatar_url = mockUser.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
      google_id = 'mock_' + email;
    } else if (credential && CLIENT_ID) {
      // Real Google Auth
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      avatar_url = payload.picture;
      google_id = payload.sub;
    } else {
      return res.status(400).json({ error: 'OAuth Client ID not configured or invalid credentials. Please use developer mock login.' });
    }

    const db = await getDb();
    
    // Check if user exists
    let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      // Generate standard unique user ID
      const newUserId = 'usr_' + Math.random().toString(36).substring(2, 11);
      await db.run(
        'INSERT INTO users (id, email, name, google_id, avatar_url) VALUES (?, ?, ?, ?, ?)',
        [newUserId, email, name, google_id, avatar_url]
      );
      user = { id: newUserId, email, name, google_id, avatar_url };
    } else {
      // Update avatar or name if changed
      await db.run(
        'UPDATE users SET name = ?, avatar_url = ? WHERE id = ?',
        [name, avatar_url, user.id]
      );
      user.name = name;
      user.avatar_url = avatar_url;
    }

    await db.close();
    res.json(user);
  } catch (error) {
    console.error('Authentication Error:', error);
    res.status(500).json({ error: 'Authentication failed. ' + error.message });
  }
});

// ---------------- SONGS ENDPOINTS ----------------

// Get all songs
app.get('/api/songs', async (req, res) => {
  try {
    const db = await getDb();
    const songs = await db.all('SELECT * FROM songs ORDER BY created_at DESC');
    await db.close();

    // Map file paths to server URLs
    const formattedSongs = songs.map(song => ({
      ...song,
      file_url: `http://localhost:${PORT}/uploads/${path.basename(song.file_path)}`,
      cover_url: song.cover_path 
        ? (song.cover_path.startsWith('http') ? song.cover_path : `http://localhost:${PORT}/uploads/${path.basename(song.cover_path)}`)
        : `http://localhost:${PORT}/uploads/default-cover.jpg`,
      lyrics: song.lyrics ? JSON.parse(song.lyrics) : []
    }));

    res.json(formattedSongs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Upload song (audio file + optional cover image + optional metadata manual override)
app.post('/api/songs', upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0];

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required.' });
    }

    const { titleOverride, artistOverride, albumOverride, genre, lyrics } = req.body;

    // Parse audio metadata using music-metadata
    let metadata = {};
    try {
      metadata = await musicMetadata.parseFile(audioFile.path);
    } catch (metaErr) {
      console.warn('Metadata extraction failed, falling back to overrides/filename', metaErr);
    }

    const title = titleOverride || metadata.common?.title || path.basename(audioFile.originalname, path.extname(audioFile.originalname));
    const artist = artistOverride || metadata.common?.artist || 'Unknown Artist';
    const album = albumOverride || metadata.common?.album || 'Unknown Album';
    const songGenre = genre || metadata.common?.genre?.[0] || 'Unknown';
    const duration = metadata.format?.duration || 180; // default 3 min if fails

    let coverPath = null;

    // If a custom cover is uploaded, use it
    if (coverFile) {
      coverPath = coverFile.path;
    } else if (metadata.common?.picture?.[0]) {
      // Else try to extract embedded picture from the MP3
      const picture = metadata.common.picture[0];
      const ext = picture.format.split('/')[1] || 'jpg';
      const pictureFilename = `embedded-${Date.now()}.${ext}`;
      const picturePath = path.join(uploadsDir, pictureFilename);
      fs.writeFileSync(picturePath, picture.data);
      coverPath = picturePath;
    }

    const songId = 'sng_' + Math.random().toString(36).substring(2, 11);
    
    // Save to Database
    const db = await getDb();
    await db.run(`
      INSERT INTO songs (id, title, artist, album, duration, file_path, cover_path, genre, lyrics, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      songId,
      title,
      artist,
      album,
      duration,
      audioFile.path,
      coverPath,
      songGenre,
      lyrics || '[]', // Should be JSON format
      req.userId || 'system'
    ]);
    
    const song = await db.get('SELECT * FROM songs WHERE id = ?', [songId]);
    await db.close();

    res.status(201).json({
      ...song,
      file_url: `http://localhost:${PORT}/uploads/${path.basename(song.file_path)}`,
      cover_url: song.cover_path 
        ? `http://localhost:${PORT}/uploads/${path.basename(song.cover_path)}`
        : `http://localhost:${PORT}/uploads/default-cover.jpg`,
      lyrics: JSON.parse(song.lyrics)
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import remote/cloud song (e.g. from Jamendo)
app.post('/api/songs/import', async (req, res) => {
  const { id, title, artist, album, duration, file_url, cover_url, genre, lyrics } = req.body;
  if (!id || !title || !artist || !file_url) {
    return res.status(400).json({ error: 'Missing required parameters (id, title, artist, file_url).' });
  }

  try {
    const db = await getDb();
    
    // Check if song already exists in local DB
    const existing = await db.get('SELECT * FROM songs WHERE id = ?', [id]);
    if (!existing) {
      await db.run(`
        INSERT INTO songs (id, title, artist, album, duration, file_path, cover_path, genre, lyrics, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'system')
      `, [
        id,
        title,
        artist,
        album || 'Jamendo Cloud',
        duration || 180,
        file_url,
        cover_url || '',
        genre || 'Cloud',
        JSON.stringify(lyrics || []),
      ]);
    }
    
    await db.close();
    res.status(200).json({ success: true, message: 'Remote track imported successfully.' });
  } catch (error) {
    console.error('Import Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------- PLAYLISTS ENDPOINTS ----------------

// Get all playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const db = await getDb();
    const playlists = await db.all('SELECT * FROM playlists ORDER BY created_at DESC');
    await db.close();

    const formatted = playlists.map(p => ({
      ...p,
      cover_url: p.cover_path 
        ? (p.cover_path.startsWith('http') ? p.cover_path : `http://localhost:${PORT}/uploads/${path.basename(p.cover_path)}`)
        : `http://localhost:${PORT}/uploads/default-playlist.jpg`
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Playlist
app.post('/api/playlists', upload.single('cover'), async (req, res) => {
  try {
    const { name, description, is_collaborative } = req.body;
    const coverFile = req.file;

    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required.' });
    }

    const playlistId = 'ply_' + Math.random().toString(36).substring(2, 11);
    const coverPath = coverFile ? coverFile.path : null;
    const creator = req.userId || 'system';

    const db = await getDb();
    await db.run(`
      INSERT INTO playlists (id, name, description, cover_path, created_by, is_collaborative)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [playlistId, name, description || '', coverPath, creator, is_collaborative ? 1 : 0]);

    const playlist = await db.get('SELECT * FROM playlists WHERE id = ?', [playlistId]);
    await db.close();

    res.status(201).json({
      ...playlist,
      cover_url: playlist.cover_path 
        ? `http://localhost:${PORT}/uploads/${path.basename(playlist.cover_path)}`
        : `http://localhost:${PORT}/uploads/default-playlist.jpg`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get playlist details and its songs
app.get('/api/playlists/:id', async (req, res) => {
  try {
    const db = await getDb();
    const playlist = await db.get('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
    
    if (!playlist) {
      await db.close();
      return res.status(404).json({ error: 'Playlist not found.' });
    }

    // Get songs inside this playlist
    const songs = await db.all(`
      SELECT s.* FROM songs s
      JOIN playlist_songs ps ON s.id = ps.song_id
      WHERE ps.playlist_id = ?
      ORDER BY ps.position ASC
    `, [req.params.id]);

    await db.close();

    const formattedSongs = songs.map(song => ({
      ...song,
      file_url: `http://localhost:${PORT}/uploads/${path.basename(song.file_path)}`,
      cover_url: song.cover_path 
        ? (song.cover_path.startsWith('http') ? song.cover_path : `http://localhost:${PORT}/uploads/${path.basename(song.cover_path)}`)
        : `http://localhost:${PORT}/uploads/default-cover.jpg`,
      lyrics: song.lyrics ? JSON.parse(song.lyrics) : []
    }));

    res.json({
      ...playlist,
      cover_url: playlist.cover_path 
        ? (playlist.cover_path.startsWith('http') ? playlist.cover_path : `http://localhost:${PORT}/uploads/${path.basename(playlist.cover_path)}`)
        : `http://localhost:${PORT}/uploads/default-playlist.jpg`,
      songs: formattedSongs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Song to Playlist
app.post('/api/playlists/:id/songs', async (req, res) => {
  const { songId } = req.body;
  if (!songId) return res.status(400).json({ error: 'songId is required.' });

  try {
    const db = await getDb();

    // Check if playlist exists
    const playlist = await db.get('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
    if (!playlist) {
      await db.close();
      return res.status(404).json({ error: 'Playlist not found.' });
    }

    // Verify collaborator status
    if (playlist.created_by !== req.userId && playlist.is_collaborative === 0) {
      await db.close();
      return res.status(403).json({ error: 'Only the creator can add songs to this playlist.' });
    }

    // Check if already in playlist
    const existing = await db.get('SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?', [req.params.id, songId]);
    if (existing) {
      await db.close();
      return res.status(400).json({ error: 'Song is already in this playlist.' });
    }

    // Get max position
    const maxPos = await db.get('SELECT COALESCE(MAX(position), 0) as maxPos FROM playlist_songs WHERE playlist_id = ?', [req.params.id]);
    const nextPos = (maxPos?.maxPos || 0) + 1;

    await db.run('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)', [req.params.id, songId, nextPos]);
    await db.close();

    res.status(200).json({ success: true, message: 'Song added to playlist.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove Song from Playlist
app.delete('/api/playlists/:id/songs/:songId', async (req, res) => {
  try {
    const db = await getDb();
    const playlist = await db.get('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
    if (!playlist) {
      await db.close();
      return res.status(404).json({ error: 'Playlist not found.' });
    }

    if (playlist.created_by !== req.userId && playlist.is_collaborative === 0) {
      await db.close();
      return res.status(403).json({ error: 'Only the creator can edit this playlist.' });
    }

    await db.run('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?', [req.params.id, req.params.songId]);
    await db.close();

    res.json({ success: true, message: 'Song removed from playlist.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- COMMENTS ENDPOINTS ----------------

// Get comments for a song
app.get('/api/comments/:songId', async (req, res) => {
  try {
    const db = await getDb();
    const comments = await db.all('SELECT * FROM comments WHERE song_id = ? ORDER BY timestamp ASC, created_at DESC', [req.params.songId]);
    await db.close();
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment to a song
app.post('/api/comments', async (req, res) => {
  const { songId, text, timestamp } = req.body;
  if (!songId || !text) {
    return res.status(400).json({ error: 'songId and text are required.' });
  }

  const user_id = req.userId || 'anonymous';
  const name = req.headers['x-user-name'] || 'Anonymous User';
  const avatar = req.headers['x-user-avatar'] || '';

  try {
    const db = await getDb();
    const commentId = 'cmt_' + Math.random().toString(36).substring(2, 11);
    await db.run(`
      INSERT INTO comments (id, song_id, user_id, user_name, user_avatar, text, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [commentId, songId, user_id, name, avatar, text, timestamp || 0]);

    const newComment = await db.get('SELECT * FROM comments WHERE id = ?', [commentId]);
    await db.close();

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- AI DJ RECOMMENDATION ----------------

// Simulates an AI recommendation system that matches keywords and curates a personalized playlist
app.post('/api/ai-dj', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  try {
    const db = await getDb();
    const songs = await db.all('SELECT * FROM songs');
    await db.close();

    const normalizedPrompt = prompt.toLowerCase();
    
    // Basic fuzzy scoring of songs based on title, artist, genre, lyrics
    const scoredSongs = songs.map(song => {
      let score = 0;
      if (song.genre && normalizedPrompt.includes(song.genre.toLowerCase())) score += 10;
      if (song.title && normalizedPrompt.includes(song.title.toLowerCase())) score += 5;
      if (song.artist && normalizedPrompt.includes(song.artist.toLowerCase())) score += 5;
      if (song.album && normalizedPrompt.includes(song.album.toLowerCase())) score += 3;
      if (song.lyrics && normalizedPrompt.includes(song.lyrics.toLowerCase())) score += 2;
      
      // Mood mapping
      if (normalizedPrompt.includes('chill') || normalizedPrompt.includes('relax') || normalizedPrompt.includes('lofi') || normalizedPrompt.includes('slow')) {
        if (song.genre && (song.genre.toLowerCase().includes('lofi') || song.genre.toLowerCase().includes('ambient') || song.genre.toLowerCase().includes('chill'))) {
          score += 8;
        }
      }
      if (normalizedPrompt.includes('hype') || normalizedPrompt.includes('energy') || normalizedPrompt.includes('workout') || normalizedPrompt.includes('dance')) {
        if (song.genre && (song.genre.toLowerCase().includes('pop') || song.genre.toLowerCase().includes('rock') || song.genre.toLowerCase().includes('electro'))) {
          score += 8;
        }
      }

      return { song, score };
    });

    // Sort by score and take the best matches. If zero matches, shuffle/return random songs as base
    let recommendations = scoredSongs
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.song);

    if (recommendations.length === 0) {
      // Return 3 random songs as fallback
      recommendations = songs.sort(() => 0.5 - Math.random()).slice(0, 3);
    } else {
      recommendations = recommendations.slice(0, 5); // top 5 matches
    }

    const formattedRecs = recommendations.map(song => ({
      ...song,
      file_url: `http://localhost:${PORT}/uploads/${path.basename(song.file_path)}`,
      cover_url: song.cover_path 
        ? (song.cover_path.startsWith('http') ? song.cover_path : `http://localhost:${PORT}/uploads/${path.basename(song.cover_path)}`)
        : `http://localhost:${PORT}/uploads/default-cover.jpg`,
      lyrics: song.lyrics ? JSON.parse(song.lyrics) : []
    }));

    // AI DJ Voice Intro simulation
    const introPhrases = [
      `Hey there! DJ Antigravity here. I curated this special lineup for you based on "${prompt}". Let's start this groove!`,
      `Yo! You asked for "${prompt}", and I got exactly what you need. Tune in, sit back, and feel the vibe.`,
      `Greetings music lover. Here's a custom mix tailored for "${prompt}". Let the soundwaves take over.`,
      `Ready to power up? DJ Antigravity checking in. Playing your "${prompt}" playlist right... now!`
    ];
    const voiceIntro = introPhrases[Math.floor(Math.random() * introPhrases.length)];

    res.json({
      playlistName: `AI DJ: ${prompt.substring(0, 25)}${prompt.length > 25 ? '...' : ''}`,
      voiceIntro,
      songs: formattedRecs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// YouTube Search Scraper endpoint (returns first videoId for a search query)
app.get('/api/youtube/search', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter.' });
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();
    
    // Regex matches the first videoId entry inside YouTube's JSON page state payload
    const match = html.match(/"videoId":"([^"]+)"/);
    if (match && match[1]) {
      return res.json({ videoId: match[1] });
    }
    
    res.status(404).json({ error: 'No YouTube video found.' });
  } catch (error) {
    console.error('YouTube search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
