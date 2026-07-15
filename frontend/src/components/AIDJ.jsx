import React, { useState } from 'react';
import { Sparkles, Play, MessageSquare, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAudio } from '../context/AudioContext';
import { BACKEND_URL } from '../context/AudioContext';

export default function AIDJ() {
  const { playSong, setQueue } = useAudio();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [djIntro, setDjIntro] = useState('');
  const [curatedSongs, setCuratedSongs] = useState([]);

  // Web Speech API for DJ speech synthesis
  const speakIntro = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a nice male or robotic voice if possible, or just default
      const voices = window.speechSynthesis.getVoices();
      const djVoice = voices.find(v => v.name.includes('Google') || v.lang.startsWith('en'));
      if (djVoice) utterance.voice = djVoice;
      
      utterance.pitch = 0.9; // Slightly lower pitch for radio DJ vibe
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setDjIntro('');
    setCuratedSongs([]);

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai-dj`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) throw new Error('AI DJ was unable to curate a mix.');

      const data = await res.json();
      setDjIntro(data.voiceIntro);
      setCuratedSongs(data.songs);

      // Play Curated Mix
      if (data.songs.length > 0) {
        // Set queue and play first
        setQueue(data.songs);
        playSong(data.songs[0], data.songs);

        // Speak the DJ Intro
        speakIntro(data.voiceIntro);

        // Fire particle effects
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }
    } catch (err) {
      console.error(err);
      setDjIntro("Connection error: AI DJ is resting. But here is standard radio host backup!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-dj-container">
      <div className="ai-dj-hero">
        <div className="dj-avatar-glow">
          <Sparkles className="spark-icon" size={32} />
        </div>
        <h2>AI Radio Host & Playlist Generator</h2>
        <p>Type what you are feeling, doing, or craving. Let DJ Antigravity spin a personalized vocal intro and tracklist!</p>
      </div>

      <form onSubmit={handleGenerate} className="ai-dj-form">
        <input
          type="text"
          placeholder="e.g. 'Chill lo-fi study loops', 'Cyberpunk synthwave hype', 'Ambient rainy afternoon'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="dj-prompt-input"
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading} className="dj-generate-btn">
          {loading ? 'Curating Mix...' : 'Launch AI Station'}
        </button>
      </form>

      {/* Voice Host Box */}
      {djIntro && (
        <div className="dj-speech-bubble">
          <div className="dj-bubble-header">
            <Volume2 size={16} className="text-spotify" />
            <span>DJ Antigravity (Live Broadcast)</span>
            <button onClick={() => speakIntro(djIntro)} className="replay-speech-btn" title="Re-speak Intro">
              Speak
            </button>
          </div>
          <p className="dj-speech-text">"{djIntro}"</p>
        </div>
      )}

      {/* Curated Song List */}
      {curatedSongs.length > 0 && (
        <div className="curated-tracks-section">
          <h3>Curated Station Lineup</h3>
          <div className="curated-list">
            {curatedSongs.map((song, i) => (
              <div key={song.id} className="curated-song-card" onClick={() => playSong(song, curatedSongs)}>
                <span className="curated-idx">#{i + 1}</span>
                <img src={song.cover_url} alt={song.title} className="curated-cover" />
                <div className="curated-meta">
                  <span className="curated-title">{song.title}</span>
                  <span className="curated-artist">{song.artist}</span>
                </div>
                <Play className="play-icon-hover" size={16} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
