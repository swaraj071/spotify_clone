import React, { useState, useEffect } from 'react';
import { Minimize2, Maximize2, X, Film, AlertCircle, Loader } from 'lucide-react';
import { BACKEND_URL } from '../context/AudioContext';

export default function CinemaMode({ currentSong, onClose }) {
  const [videoId, setVideoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!currentSong) return;

    const fetchVideoId = async () => {
      setLoading(true);
      setVideoId(null);
      try {
        const queryStr = `${currentSong.artist} - ${currentSong.title} official video`;
        const res = await fetch(`${BACKEND_URL}/api/youtube/search?query=${encodeURIComponent(queryStr)}`);
        
        if (!res.ok) throw new Error('Video not found');
        const data = await res.json();
        setVideoId(data.videoId);
      } catch (err) {
        console.error('Error fetching YouTube video:', err);
        setVideoId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoId();
  }, [currentSong]);

  if (!currentSong) return null;

  return (
    <div className={`cinema-mode-card ${isFullscreen ? 'fullscreen' : ''} ${isMinimized ? 'minimized' : ''}`}>
      {/* Header controls */}
      <div className="cinema-header">
        <div className="cinema-title">
          <Film size={14} className="cinema-icon" />
          <span>Cinema Mode: {currentSong.title}</span>
        </div>
        <div className="cinema-actions">
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="action-btn"
            title={isMinimized ? "Restore Panel" : "Minimize Panel"}
          >
            {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className="action-btn"
            title={isFullscreen ? "Exit Fullscreen Backdrop" : "Make Background Backdrop"}
          >
            <Maximize2 size={12} className={isFullscreen ? 'rotate-icon' : ''} />
          </button>
          <button onClick={onClose} className="action-btn close" title="Close Cinema Mode">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Video Content */}
      <div className="cinema-body">
        {loading ? (
          <div className="cinema-state-container">
            <Loader className="spinning-loader" size={24} />
            <span>Finding official video...</span>
          </div>
        ) : videoId ? (
          <div className="iframe-wrapper">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${videoId}&enablejsapi=1`}
              title="Official Music Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {isFullscreen && (
              <div className="backdrop-overlay-text">
                <h3>Cinema Background Active</h3>
                <p>Muted official video playing behind the scene. Audio equalizer & canvas active.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="cinema-state-container error">
            <AlertCircle size={24} />
            <span>No matching official video found.</span>
          </div>
        )}
      </div>
    </div>
  );
}
