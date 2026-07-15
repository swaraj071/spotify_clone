import React, { useEffect, useRef, useState } from 'react';
import { Languages, Volume2, HelpCircle } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

export default function LyricsView() {
  const { currentSong, currentTime, seek } = useAudio();
  const [lyricsMode, setLyricsMode] = useState('dual'); // 'original' | 'translation' | 'dual'
  const containerRef = useRef(null);
  const lineRefs = useRef([]);

  const lyrics = currentSong?.lyrics || [];

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Scroll active line to center of lyrics container
  useEffect(() => {
    if (activeIndex !== -1 && lineRefs.current[activeIndex] && containerRef.current) {
      const activeElement = lineRefs.current[activeIndex];
      const container = containerRef.current;
      
      const elementOffsetTop = activeElement.offsetTop;
      const elementHeight = activeElement.clientHeight;
      const containerHeight = container.clientHeight;

      container.scrollTo({
        top: elementOffsetTop - containerHeight / 2 + elementHeight / 2,
        behavior: 'smooth',
      });
    }
  }, [activeIndex]);

  if (!currentSong) {
    return (
      <div className="lyrics-empty-state">
        <Volume2 size={48} className="empty-icon" />
        <h3>Play a song to view lyrics</h3>
        <p>Lyrics and translations will sync here automatically.</p>
      </div>
    );
  }

  if (lyrics.length === 0) {
    return (
      <div className="lyrics-empty-state">
        <HelpCircle size={48} className="empty-icon" />
        <h3>No lyrics available</h3>
        <p>Go to the Upload tab to add custom songs with bilingual timestamped lyrics!</p>
      </div>
    );
  }

  return (
    <div className="lyrics-container">
      <div className="lyrics-header">
        <div className="lyrics-title-info">
          <h4>LYRICS & TRANSLATIONS</h4>
          <span className="song-title">{currentSong.title}</span>
        </div>
        <div className="lyrics-mode-toggles">
          <button
            onClick={() => setLyricsMode('original')}
            className={`mode-btn ${lyricsMode === 'original' ? 'active' : ''}`}
            title="Original Only"
          >
            Orig
          </button>
          <button
            onClick={() => setLyricsMode('translation')}
            className={`mode-btn ${lyricsMode === 'translation' ? 'active' : ''}`}
            title="Translation Only"
          >
            Trans
          </button>
          <button
            onClick={() => setLyricsMode('dual')}
            className={`mode-btn-icon ${lyricsMode === 'dual' ? 'active' : ''}`}
            title="Dual Bilingual Mode"
          >
            <Languages size={16} />
            <span>Dual</span>
          </button>
        </div>
      </div>

      <div className="lyrics-scroller" ref={containerRef}>
        <div className="lyrics-list">
          {lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            const isPassed = index < activeIndex;

            return (
              <div
                key={index}
                ref={(el) => (lineRefs.current[index] = el)}
                onClick={() => seek(line.time)}
                className={`lyric-line-wrapper ${isActive ? 'active' : ''} ${
                  isPassed ? 'passed' : ''
                }`}
              >
                {lyricsMode !== 'translation' && (
                  <p className="lyric-text-original">{line.text}</p>
                )}
                {lyricsMode !== 'original' && (
                  <p className="lyric-text-translated">{line.translation}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
