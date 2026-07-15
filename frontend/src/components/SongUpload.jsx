import React, { useState } from 'react';
import { Upload, Music, Image, Type, Save } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAudio } from '../context/AudioContext';
import { BACKEND_URL } from '../context/AudioContext';

export default function SongUpload() {
  const { fetchSongs, user } = useAudio();
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  
  // Custom format lyrics input
  // Example: 
  // [00:08] Caminando bajo la luna | Walking under the moon
  // [00:15] Buscando tu reflejo | Searching for your reflection
  const [rawLyrics, setRawLyrics] = useState(
    "[00:00] 🎵 (Instrumental Intro) | 🎵 (Instrumental Intro)\n" +
    "[00:05] Hello world, welcome to Spotify | Hola mundo, bienvenidos a Spotify\n" +
    "[00:10] Music connects us all | La música nos conecta a todos"
  );
  
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);

  // Helper to parse text into structured timestamp lyrics JSON
  const parseLyrics = (text) => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n');
    const parsed = [];
    
    // Pattern matches [mm:ss] or [ss]
    const timeReg = /\[(\d+):(\d+)\]/;
    const secReg = /\[(\d+)\]/;

    lines.forEach(line => {
      let seconds = 0;
      let textPart = line;

      const timeMatch = line.match(timeReg);
      if (timeMatch) {
        seconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
        textPart = line.replace(timeReg, '');
      } else {
        const secMatch = line.match(secReg);
        if (secMatch) {
          seconds = parseInt(secMatch[1]);
          textPart = line.replace(secReg, '');
        } else {
          // Check if it starts with a plain number/time format (e.g. 12: text)
          const colonSplit = line.indexOf(':');
          if (colonSplit !== -1) {
            const timeStr = line.substring(0, colonSplit).trim();
            const val = parseInt(timeStr);
            if (!isNaN(val)) {
              seconds = val;
              textPart = line.substring(colonSplit + 1);
            }
          }
        }
      }

      // Split by pipe for original | translation
      const pipeIndex = textPart.indexOf('|');
      let orig = textPart.trim();
      let trans = textPart.trim();

      if (pipeIndex !== -1) {
        orig = textPart.substring(0, pipeIndex).trim();
        trans = textPart.substring(pipeIndex + 1).trim();
      }

      if (orig) {
        parsed.push({
          time: seconds,
          text: orig,
          translation: trans
        });
      }
    });

    // Sort by timestamp asc
    return parsed.sort((a, b) => a.time - b.time);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      setMessage({ type: 'error', text: 'Audio file is required.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const parsedLyrics = parseLyrics(rawLyrics);

    const formData = new FormData();
    formData.append('audio', audioFile);
    if (coverFile) {
      formData.append('cover', coverFile);
    }
    formData.append('titleOverride', title);
    formData.append('artistOverride', artist);
    formData.append('albumOverride', album);
    formData.append('genre', genre);
    formData.append('lyrics', JSON.stringify(parsedLyrics));

    try {
      const headers = {};
      if (user) {
        headers['x-user-id'] = user.id;
        headers['x-user-name'] = user.name;
      }

      const res = await fetch(`${BACKEND_URL}/api/songs`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload song');
      }

      const newSong = await res.json();
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setMessage({ type: 'success', text: `Successfully uploaded "${newSong.title}"!` });
      setTitle('');
      setArtist('');
      setAlbum('');
      setGenre('');
      setAudioFile(null);
      setCoverFile(null);
      fetchSongs(); // Refresh global catalog
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>Upload Your Music Creation</h2>
        <p>Publish your songs with synchronized bilingual translations for global audiences.</p>
      </div>

      <form onSubmit={handleUpload} className="upload-form">
        <div className="form-grid">
          
          {/* File Upload Section */}
          <div className="file-upload-section">
            <div className="file-input-card">
              <label className="file-label">
                <Upload size={32} className="upload-icon" />
                <span className="file-title">Select Audio File (.mp3) *</span>
                <span className="file-subtitle">
                  {audioFile ? audioFile.name : 'Drag & drop or browse your local files'}
                </span>
                <input
                  type="file"
                  accept="audio/mp3, audio/wav, audio/m4a"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  required
                  className="hidden-file-input"
                />
              </label>
            </div>

            <div className="file-input-card cover-art">
              <label className="file-label">
                <Image size={32} className="upload-icon" />
                <span className="file-title">Select Cover Art (Optional)</span>
                <span className="file-subtitle">
                  {coverFile ? coverFile.name : 'Upload JPG, PNG, or extract from MP3'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                  className="hidden-file-input"
                />
              </label>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="metadata-form-section">
            <div className="form-group">
              <label>Song Title (Overrides MP3 info)</label>
              <input
                type="text"
                placeholder="e.g. Autumn Whispers"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Artist Name</label>
              <input
                type="text"
                placeholder="e.g. DJ Coding Lofi"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Album Name</label>
                <input
                  type="text"
                  placeholder="e.g. Coffee & Code"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Genre</label>
                <input
                  type="text"
                  placeholder="e.g. Lo-Fi / Electronic"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Synced Lyrics Editor */}
        <div className="lyrics-editor-section">
          <div className="section-title-wrapper">
            <Type size={18} className="title-icon" />
            <h3>Synchronized Bilingual Lyrics Editor</h3>
          </div>
          <p className="lyrics-format-tip">
            <strong>Format:</strong> <code>[minute:second] Original Lyric | Translated Lyric</code>. 
            One line per timestamp. E.g. <code>[00:15] Hola mi amigo | Hello my friend</code>
          </p>
          <textarea
            rows="6"
            placeholder="Type or paste timestamped lyrics here..."
            value={rawLyrics}
            onChange={(e) => setRawLyrics(e.target.value)}
            className="lyrics-textarea"
          />
        </div>

        {message && (
          <div className={`form-feedback ${message.type}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className={`submit-upload-btn ${isUploading ? 'uploading' : ''}`}
        >
          <Save size={18} />
          <span>{isUploading ? 'Uploading & Parsing Tags...' : 'Publish Song to Catalog'}</span>
        </button>
      </form>
    </div>
  );
}
