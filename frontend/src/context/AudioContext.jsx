import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AudioContextInstance = createContext();

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const useAudio = () => useContext(AudioContextInstance);

export const AudioProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  
  // Playback State
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none' | 'all' | 'one'

  // User auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('spotify_clone_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Equalizer settings
  const [eqBass, setEqBass] = useState(0);  // -12 to +12 dB
  const [eqMid, setEqMid] = useState(0);   // -12 to +12 dB
  const [eqTreble, setEqTreble] = useState(0); // -12 to +12 dB
  const [eqEnabled, setEqEnabled] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [jamendoSongs, setJamendoSongs] = useState([]);
  const JAMENDO_CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID || '';

  // Debounced search for Jamendo API
  useEffect(() => {
    if (!JAMENDO_CLIENT_ID || !searchQuery.trim()) {
      setJamendoSongs([]);
      return;
    }

    const fetchJamendo = async () => {
      try {
        const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=10&namesearch=${encodeURIComponent(searchQuery)}&audioformat=mp32&include=musicinfo`);
        if (!res.ok) throw new Error('Jamendo API error');
        const data = await res.json();
        
        if (data.results) {
          const formatted = data.results.map(track => ({
            id: 'jam_' + track.id,
            title: track.name,
            artist: track.artist_name,
            album: track.album_name || 'Jamendo Single',
            duration: track.duration,
            file_url: track.audio,
            cover_url: track.image || `${BACKEND_URL}/uploads/default-cover.jpg`,
            genre: track.musicinfo?.tags?.genres?.[0] || 'Jamendo Cloud',
            lyrics: track.lyrics ? [{ time: 0, text: track.lyrics, translation: '(Lyrics from Jamendo - no translation)' }] : [],
            isJamendo: true
          }));
          setJamendoSongs(formatted);
        }
      } catch (err) {
        console.error('Error searching Jamendo:', err);
      }
    };

    const debounceTimer = setTimeout(fetchJamendo, 400);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, JAMENDO_CLIENT_ID]);

  // HTML Audio reference
  const audioRef = useRef(new Audio());
  audioRef.current.crossOrigin = 'anonymous'; // Important for Web Audio CORS!

  // Web Audio Nodes references
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const bassFilterRef = useRef(null);
  const midFilterRef = useRef(null);
  const trebleFilterRef = useRef(null);
  const analyserRef = useRef(null);

  // Sync state between HTML5 Audio and React State
  useEffect(() => {
    const audio = audioRef.current;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => handleSongEnded();

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [queue, queueIndex, repeat, shuffle]);

  // Handle volume changes
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // Fetch initial songs and playlists
  const fetchSongs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/songs`);
      const data = await res.json();
      setSongs(data);
    } catch (err) {
      console.error('Error fetching songs:', err);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists`);
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
  };

  useEffect(() => {
    fetchSongs();
    fetchPlaylists();
  }, []);

  // Initialize Web Audio API nodes
  const initWebAudio = () => {
    if (audioContextRef.current) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Create nodes
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200; // Hz
      bassFilter.gain.value = eqEnabled ? eqBass : 0;
      bassFilterRef.current = bassFilter;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.Q.value = 1.0;
      midFilter.frequency.value = 1000; // Hz
      midFilter.gain.value = eqEnabled ? eqMid : 0;
      midFilterRef.current = midFilter;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 3000; // Hz
      trebleFilter.gain.value = eqEnabled ? eqTreble : 0;
      trebleFilterRef.current = trebleFilter;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Connect nodes in series: source -> filters -> analyser -> destination
      source.connect(bassFilter);
      bassFilter.connect(midFilter);
      midFilter.connect(trebleFilter);
      trebleFilter.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (err) {
      console.error('Web Audio API not supported or failed to initialize:', err);
    }
  };

  // Update EQ Node values
  useEffect(() => {
    if (bassFilterRef.current) {
      bassFilterRef.current.gain.setValueAtTime(eqEnabled ? eqBass : 0, audioContextRef.current.currentTime);
    }
  }, [eqBass, eqEnabled]);

  useEffect(() => {
    if (midFilterRef.current) {
      midFilterRef.current.gain.setValueAtTime(eqEnabled ? eqMid : 0, audioContextRef.current.currentTime);
    }
  }, [eqMid, eqEnabled]);

  useEffect(() => {
    if (trebleFilterRef.current) {
      trebleFilterRef.current.gain.setValueAtTime(eqEnabled ? eqTreble : 0, audioContextRef.current.currentTime);
    }
  }, [eqTreble, eqEnabled]);

  // User Actions
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('spotify_clone_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('spotify_clone_user');
  };

  const playSong = (song, customQueue = null) => {
    initWebAudio();
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const targetQueue = customQueue || songs;
    setQueue(targetQueue);
    const index = targetQueue.findIndex(s => s.id === song.id);
    setQueueIndex(index);
    setCurrentSong(song);
    
    audioRef.current.src = song.file_url;
    audioRef.current.play().catch(err => console.log('Autoplay blocked or stream fail:', err));
  };

  const togglePlay = () => {
    if (!currentSong && songs.length > 0) {
      playSong(songs[0]);
      return;
    }
    if (!currentSong) return;

    initWebAudio();
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.log(err));
    }
  };

  const nextSong = () => {
    if (queue.length === 0) return;
    
    let nextIdx = queueIndex + 1;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      nextIdx = repeat === 'all' ? 0 : -1;
    }

    if (nextIdx !== -1) {
      setQueueIndex(nextIdx);
      const song = queue[nextIdx];
      setCurrentSong(song);
      audioRef.current.src = song.file_url;
      audioRef.current.play().catch(err => console.log(err));
    } else {
      setIsPlaying(false);
    }
  };

  const prevSong = () => {
    if (queue.length === 0) return;

    let prevIdx = queueIndex - 1;
    if (shuffle) {
      prevIdx = Math.floor(Math.random() * queue.length);
    } else if (prevIdx < 0) {
      prevIdx = repeat === 'all' ? queue.length - 1 : 0;
    }

    setQueueIndex(prevIdx);
    const song = queue[prevIdx];
    setCurrentSong(song);
    audioRef.current.src = song.file_url;
    audioRef.current.play().catch(err => console.log(err));
  };

  const handleSongEnded = () => {
    if (repeat === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log(err));
    } else {
      nextSong();
    }
  };

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const addSongToQueue = (song) => {
    setQueue(prev => [...prev, song]);
  };

  return (
    <AudioContextInstance.Provider value={{
      songs,
      playlists,
      fetchSongs,
      fetchPlaylists,
      currentPlaylist,
      setCurrentPlaylist,
      currentSong,
      setCurrentSong,
      isPlaying,
      togglePlay,
      playSong,
      nextSong,
      prevSong,
      currentTime,
      duration,
      seek,
      volume,
      setVolume,
      queue,
      setQueue,
      queueIndex,
      shuffle,
      setShuffle,
      repeat,
      setRepeat,
      user,
      login,
      logout,
      eqBass,
      setEqBass,
      eqMid,
      setEqMid,
      eqTreble,
      setEqTreble,
      eqEnabled,
      setEqEnabled,
      searchQuery,
      setSearchQuery,
      jamendoSongs,
      jamendoClientId: JAMENDO_CLIENT_ID,
      analyserRef
    }}>
      {children}
    </AudioContextInstance.Provider>
  );
};
