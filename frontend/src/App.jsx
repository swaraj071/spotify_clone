import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, AlignLeft, MessageCircle, Sliders, Maximize2 } from 'lucide-react';
import { useAudio } from './context/AudioContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Equalizer from './components/Equalizer';
import Visualizer from './components/Visualizer';
import LyricsView from './components/LyricsView';
import SongComments from './components/SongComments';
import SongUpload from './components/SongUpload';
import AIDJ from './components/AIDJ';
import Auth from './components/Auth';

function AppContent() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'studio' | 'aidj' | 'upload' | 'auth' | 'playlist'
  const [showLyricsPanel, setShowLyricsPanel] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.5);

  const {
    currentSong,
    isPlaying,
    togglePlay,
    nextSong,
    prevSong,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    shuffle,
    setShuffle,
    repeat,
    setRepeat
  } = useAudio();

  // Handle Mute
  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Convert seconds to mm:ss format
  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Dynamic theme background class based on current playing song genre
  const getThemeClass = () => {
    if (!currentSong || !isPlaying) return 'theme-default';
    const genre = currentSong.genre?.toLowerCase() || '';
    if (genre.includes('lo-fi') || genre.includes('ambient')) return 'theme-chill';
    if (genre.includes('synth') || genre.includes('retro')) return 'theme-retro';
    if (genre.includes('pop') || genre.includes('electro')) return 'theme-energy';
    return 'theme-default';
  };

  return (
    <div className={`app-container ${getThemeClass()}`}>
      {/* Floating dynamic backdrop blur blobs */}
      <div className="dynamic-blob blob-1"></div>
      <div className="dynamic-blob blob-2"></div>

      <div className="app-main-layout">
        {/* Sidebar Left */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Central Main Viewport */}
        <main className="main-viewport">
          <div className="viewport-content">
            {activeTab === 'home' && <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />}
            {activeTab === 'playlist' && <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />}
            {activeTab === 'studio' && (
              <div className="studio-tab-view">
                <h2>Studio Control Center</h2>
                <p className="tab-subtitle">Adjust the acoustic properties and visual representation of your playing audio.</p>
                <div className="studio-grid">
                  <Equalizer />
                  <Visualizer />
                </div>
              </div>
            )}
            {activeTab === 'aidj' && <AIDJ />}
            {activeTab === 'upload' && <SongUpload />}
            {activeTab === 'auth' && <Auth setActiveTab={setActiveTab} />}
          </div>
        </main>

        {/* Side Panels Right (Lyrics / Comments) */}
        {(showLyricsPanel || showCommentsPanel) && (
          <aside className="side-collapsible-panel">
            {showLyricsPanel && <LyricsView />}
            {showCommentsPanel && <SongComments />}
          </aside>
        )}
      </div>

      {/* Bottom Audio Playback Controller */}
      <footer className="playback-bar-footer">
        {/* Track Metadata Card */}
        <div className="now-playing-metadata">
          {currentSong ? (
            <>
              <img
                src={currentSong.cover_url}
                alt={currentSong.title}
                className={`now-playing-cover ${isPlaying ? 'playing-spin' : ''}`}
              />
              <div className="now-playing-details">
                <span className="track-title">{currentSong.title}</span>
                <span className="track-artist">{currentSong.artist}</span>
              </div>
            </>
          ) : (
            <div className="no-track-selected">
              <div className="empty-cover-placeholder"></div>
              <span>No track selected</span>
            </div>
          )}
        </div>

        {/* Player Action Buttons and Timeline Slider */}
        <div className="playback-bar-controls-column">
          <div className="playback-bar-buttons-row">
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`player-btn ${shuffle ? 'active' : ''}`}
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>
            <button onClick={prevSong} className="player-btn" title="Previous">
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button onClick={togglePlay} className="player-play-btn-circle" title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <button onClick={nextSong} className="player-btn" title="Next">
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button
              onClick={() => setRepeat(repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none')}
              className={`player-btn ${repeat !== 'none' ? 'active' : ''}`}
              title={`Repeat: ${repeat}`}
            >
              <Repeat size={16} />
              {repeat === 'one' && <span className="repeat-one-indicator">1</span>}
            </button>
          </div>

          <div className="playback-bar-timeline-row">
            <span className="timeline-time">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="timeline-slider"
            />
            <span className="timeline-time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Auxiliary Controls (Visualizer toggle, volume, Lyrics drawer toggle, comments drawer toggle) */}
        <div className="playback-bar-aux-controls">
          <button
            onClick={() => setActiveTab('studio')}
            className={`aux-btn ${activeTab === 'studio' ? 'active' : ''}`}
            title="Studio Settings"
          >
            <Sliders size={16} />
          </button>
          <button
            onClick={() => {
              setShowLyricsPanel(!showLyricsPanel);
              setShowCommentsPanel(false);
            }}
            className={`aux-btn ${showLyricsPanel ? 'active' : ''}`}
            title="Bilingual Lyrics"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => {
              setShowCommentsPanel(!showCommentsPanel);
              setShowLyricsPanel(false);
            }}
            className={`aux-btn ${showCommentsPanel ? 'active' : ''}`}
            title="Discussions"
          >
            <MessageCircle size={16} />
          </button>

          <div className="volume-slider-group">
            <button onClick={handleMuteToggle} className="mute-btn">
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false);
              }}
              className="volume-slider"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppContent />
  );
}
