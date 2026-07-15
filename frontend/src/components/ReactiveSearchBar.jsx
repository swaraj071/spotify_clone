import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

export default function ReactiveSearchBar() {
  const { searchQuery, setSearchQuery } = useAudio();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Debounce the search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localQuery);
    }, 250); // 250ms debounce time

    return () => clearTimeout(handler);
  }, [localQuery, setSearchQuery]);

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
  };

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          placeholder="What do you want to listen to? (Songs, artists, albums, genres...)"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="search-input"
        />
        {localQuery && (
          <button onClick={handleClear} className="clear-search-btn">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="search-pill-container">
        {['All', 'Lo-Fi', 'Ambient', 'Synthwave', 'Chillout'].map((pill) => (
          <button
            key={pill}
            onClick={() => setLocalQuery(pill === 'All' ? '' : pill)}
            className={`search-pill ${
              (pill === 'All' && !localQuery) || (localQuery.toLowerCase() === pill.toLowerCase()) ? 'active' : ''
            }`}
          >
            {pill}
          </button>
        ))}
      </div>
    </div>
  );
}
