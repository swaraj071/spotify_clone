import React, { useEffect, useRef, useState } from 'react';
import { Languages, Volume2, HelpCircle, Loader } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

export default function LyricsView() {
  const { currentSong, currentTime, seek } = useAudio();
  const [lyricsMode, setLyricsMode] = useState('dual'); // 'original' | 'translation' | 'dual'
  const [liveTranslations, setLiveTranslations] = useState({});
  const [translatingIndex, setTranslatingIndex] = useState(null);
  const [targetLang, setTargetLang] = useState('hi'); // Default: Translate to Hindi
  
  const containerRef = useRef(null);
  const lineRefs = useRef([]);

  const lyrics = currentSong?.lyrics || [];

  // Reset live translations if the song changes
  useEffect(() => {
    setLiveTranslations({});
    setTranslatingIndex(null);
  }, [currentSong]);

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Translate active line if missing pre-translation
  useEffect(() => {
    if (activeIndex === -1 || !lyrics[activeIndex]) return;
    
    const activeLine = lyrics[activeIndex];
    const hasPreTranslated = activeLine.translation && 
      activeLine.translation.trim() !== '' && 
      !activeLine.translation.includes('no translation') && 
      !activeLine.translation.includes('from Jamendo');

    if (!hasPreTranslated && !liveTranslations[activeIndex] && translatingIndex !== activeIndex) {
      const translateLine = async () => {
        setTranslatingIndex(activeIndex);
        try {
          const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(activeLine.text)}&langpair=autodetect|${targetLang}`);
          if (res.ok) {
            const data = await res.json();
            if (data.responseData?.translatedText) {
              setLiveTranslations(prev => ({
                ...prev,
                [activeIndex]: data.responseData.translatedText
              }));
            }
          }
        } catch (err) {
          console.error('Live translation fetch error:', err);
        } finally {
          setTranslatingIndex(null);
        }
      };
      translateLine();
    }
  }, [activeIndex, targetLang, lyrics, liveTranslations, translatingIndex]);

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
          <h4>LYRICS DRAWER</h4>
          <span className="song-title">{currentSong.title}</span>
        </div>
        
        {/* Target language selector for live translation */}
        <div className="lyrics-translate-selector">
          <Languages size={14} className="selector-icon" />
          <select 
            value={targetLang} 
            onChange={(e) => {
              setTargetLang(e.target.value);
              setLiveTranslations({}); // Reset translation cache
            }}
            className="lang-dropdown"
            title="Select Live Translation Language"
          >
            <option value="hi">🇮🇳 Hindi</option>
            <option value="en">🇺🇸 English</option>
            <option value="es">🇪🇸 Spanish</option>
            <option value="fr">🇫🇷 French</option>
            <option value="de">🇩🇪 German</option>
            <option value="it">🇮🇹 Italian</option>
          </select>
        </div>
      </div>

      <div className="lyrics-mode-bar">
        <button
          onClick={() => setLyricsMode('original')}
          className={`mode-btn ${lyricsMode === 'original' ? 'active' : ''}`}
          title="Original Only"
        >
          Original
        </button>
        <button
          onClick={() => setLyricsMode('translation')}
          className={`mode-btn ${lyricsMode === 'translation' ? 'active' : ''}`}
          title="Translation Only"
        >
          Translation
        </button>
        <button
          onClick={() => setLyricsMode('dual')}
          className={`mode-btn ${lyricsMode === 'dual' ? 'active' : ''}`}
          title="Dual Bilingual Mode"
        >
          Dual View
        </button>
      </div>

      <div className="lyrics-scroller" ref={containerRef}>
        <div className="lyrics-list">
          {lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            const isPassed = index < activeIndex;

            const preTranslated = line.translation && 
              line.translation.trim() !== '' &&
              !line.translation.includes('no translation') && 
              !line.translation.includes('from Jamendo')
                ? line.translation 
                : null;
            
            const liveTranslationText = liveTranslations[index];
            const displayTranslation = preTranslated || liveTranslationText;
            const isLoading = translatingIndex === index;

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
                  <div className="lyric-translation-container">
                    {displayTranslation ? (
                      <p className="lyric-text-translated">{displayTranslation}</p>
                    ) : isLoading ? (
                      <div className="live-translate-loader">
                        <Loader className="spinning-loader" size={12} />
                        <span>Live translating...</span>
                      </div>
                    ) : (
                      <p className="lyric-text-translated empty-note">No translation available</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
