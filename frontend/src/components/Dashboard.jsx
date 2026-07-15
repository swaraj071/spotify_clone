import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash2, Clock, Music, Heart, PlusCircle, Check, Users } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { BACKEND_URL } from '../context/AudioContext';
import ReactiveSearchBar from './ReactiveSearchBar';

export default function Dashboard({ activeTab, setActiveTab }) {
  const {
    songs,
    playlists,
    playSong,
    currentPlaylist,
    setCurrentPlaylist,
    searchQuery,
    fetchPlaylists,
    user,
    jamendoSongs
  } = useAudio();

  const [playlistDetail, setPlaylistDetail] = useState(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [showAddToPlaylistDropdown, setShowAddToPlaylistDropdown] = useState(null); // songId

  // Fetch full playlist detail (with songs inside it)
  useEffect(() => {
    if (activeTab === 'playlist' && currentPlaylist) {
      const getPlaylistDetail = async () => {
        setPlaylistLoading(true);
        try {
          const res = await fetch(`${BACKEND_URL}/api/playlists/${currentPlaylist.id}`);
          const data = await res.json();
          setPlaylistDetail(data);
        } catch (err) {
          console.error(err);
        } finally {
          setPlaylistLoading(false);
        }
      };
      getPlaylistDetail();
    }
  }, [activeTab, currentPlaylist]);

  const handleCreatePlaylist = async () => {
    const playlistName = prompt('Enter new playlist name:');
    if (!playlistName) return;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${BACKEND_URL}/api/playlists`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: playlistName,
          description: 'A custom curated playlist.',
          is_collaborative: 1
        })
      });

      if (res.ok) {
        fetchPlaylists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSongToPlaylist = async (playlistId, song) => {
    try {
      // If it's a Jamendo cloud track, import/register it to local DB first
      if (song.isJamendo) {
        const importRes = await fetch(`${BACKEND_URL}/api/songs/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            duration: song.duration,
            file_url: song.file_url,
            cover_url: song.cover_url,
            genre: song.genre,
            lyrics: song.lyrics
          })
        });
        if (!importRes.ok) throw new Error('Failed to import Jamendo song to local database.');
      }

      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${BACKEND_URL}/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ songId: song.id })
      });

      if (res.ok) {
        alert('Song added successfully!');
        setShowAddToPlaylistDropdown(null);
        // Refresh playlist detail if we are currently looking at it
        if (activeTab === 'playlist' && currentPlaylist && currentPlaylist.id === playlistId) {
          const detailRes = await fetch(`${BACKEND_URL}/api/playlists/${currentPlaylist.id}`);
          const detailData = await detailRes.json();
          setPlaylistDetail(detailData);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add song.');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error occurred.');
    }
  };

  const handleRemoveSongFromPlaylist = async (songId) => {
    if (!playlistDetail) return;
    try {
      const headers = {};
      if (user) {
        headers['x-user-id'] = user.id;
      }
      const res = await fetch(`${BACKEND_URL}/api/playlists/${playlistDetail.id}/songs/${songId}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        setPlaylistDetail(prev => ({
          ...prev,
          songs: prev.songs.filter(s => s.id !== songId)
        }));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove song.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDuration = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filtering songs for Search
  const filteredSongs = songs.filter(song => {
    const query = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query) ||
      (song.album && song.album.toLowerCase().includes(query)) ||
      (song.genre && song.genre.toLowerCase().includes(query))
    );
  });

  // Render Playlist Detail View
  if (activeTab === 'playlist') {
    if (playlistLoading || !playlistDetail) {
      return <div className="dashboard-loading">Curating playlist views...</div>;
    }

    return (
      <div className="playlist-detail-container">
        <div className="playlist-detail-header">
          <img src={playlistDetail.cover_url} alt={playlistDetail.name} className="playlist-detail-cover" />
          <div className="playlist-detail-info">
            <span className="playlist-tag">PLAYLIST</span>
            <h1>{playlistDetail.name}</h1>
            <p className="playlist-desc">{playlistDetail.description}</p>
            <div className="playlist-stats">
              <span className="creator">Created by <strong>{playlistDetail.created_by}</strong></span>
              <span className="bullet">•</span>
              <span>{playlistDetail.songs?.length || 0} songs</span>
              {playlistDetail.is_collaborative === 1 && (
                <>
                  <span className="bullet">•</span>
                  <span className="collab-info">
                    <Users size={14} /> Collaborative
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="playlist-actions-row">
          <button
            onClick={() => playlistDetail.songs?.length > 0 && playSong(playlistDetail.songs[0], playlistDetail.songs)}
            disabled={!playlistDetail.songs || playlistDetail.songs.length === 0}
            className="play-playlist-btn"
          >
            <Play size={20} fill="currentColor" />
            <span>Play Mix</span>
          </button>
        </div>

        {/* Tracks List */}
        <div className="playlist-tracks-list">
          <div className="track-list-header">
            <span className="idx">#</span>
            <span className="title">TITLE</span>
            <span className="album">ALBUM</span>
            <span className="actions"></span>
            <span className="time"><Clock size={16} /></span>
          </div>

          {playlistDetail.songs?.length === 0 ? (
            <div className="empty-playlist-state">
              <Music size={48} />
              <p>This playlist is empty. Add songs from the Home tab!</p>
            </div>
          ) : (
            playlistDetail.songs?.map((song, i) => (
              <div key={song.id} className="track-row" onClick={() => playSong(song, playlistDetail.songs)}>
                <span className="idx">{i + 1}</span>
                <div className="track-title-cell">
                  <img src={song.cover_url} alt={song.title} className="track-cover" />
                  <div className="track-meta">
                    <span className="title-text">{song.title}</span>
                    <span className="artist-text">{song.artist}</span>
                  </div>
                </div>
                <span className="album-text">{song.album || 'Unknown'}</span>
                
                {/* Delete button (only if owner or collab) */}
                <div className="track-actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleRemoveSongFromPlaylist(song.id)} className="row-delete-btn">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <span className="time-text">{formatDuration(song.duration)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Render Home Dashboard View
  return (
    <div className="dashboard-home">
      {/* Header bar */}
      <div className="dashboard-top-row">
        <ReactiveSearchBar />
      </div>

      {/* Hero Banner */}
      {!searchQuery && (
        <div className="hero-banner">
          <div className="hero-content">
            <span className="hero-badge">NEW RELEASES</span>
            <h2>Experience Music in 3D Real-time</h2>
            <p>Listen with studio graphic equalizers, scroll-synced bilingual translations, and real-time audio visualizers.</p>
          </div>
          <div className="hero-glow-sphere"></div>
        </div>
      )}

      {/* Playlists grid */}
      {!searchQuery && (
        <section className="dashboard-section">
          <div className="section-header">
            <h3>Featured Playlists</h3>
            <button onClick={handleCreatePlaylist} className="create-playlist-btn">
              <Plus size={16} />
              <span>Create Playlist</span>
            </button>
          </div>
          <div className="playlists-grid">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => {
                  setCurrentPlaylist(playlist);
                  setActiveTab('playlist');
                }}
                className="playlist-card"
              >
                <div className="cover-wrapper">
                  <img src={playlist.cover_url} alt={playlist.name} />
                  <button className="card-play-btn">
                    <Play size={20} fill="currentColor" />
                  </button>
                </div>
                <h4>{playlist.name}</h4>
                <p>{playlist.description || 'Custom collection.'}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Songs catalog */}
      <section className="dashboard-section">
        <h3>{searchQuery ? `Search Results for "${searchQuery}"` : 'All Available Tracks'}</h3>
        <div className="tracks-list">
          <div className="track-list-header">
            <span className="idx">#</span>
            <span className="title">TITLE</span>
            <span className="album">ALBUM</span>
            <span className="actions"></span>
            <span className="time"><Clock size={16} /></span>
          </div>

          {filteredSongs.length === 0 ? (
            <div className="no-tracks-state">
              <Music size={48} className="text-muted" />
              <p>No tracks match your query.</p>
            </div>
          ) : (
            filteredSongs.map((song, i) => (
              <div key={song.id} className="track-row" onClick={() => playSong(song, filteredSongs)}>
                <span className="idx">{i + 1}</span>
                <div className="track-title-cell">
                  <img src={song.cover_url} alt={song.title} className="track-cover" />
                  <div className="track-meta">
                    <span className="title-text">{song.title}</span>
                    <span className="artist-text">{song.artist}</span>
                  </div>
                </div>
                <span className="album-text">{song.album || 'Unknown'}</span>
                
                {/* Actions column (Add to playlist dropdown) */}
                <div className="track-actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowAddToPlaylistDropdown(showAddToPlaylistDropdown === song.id ? null : song.id)}
                    className="add-to-playlist-trigger"
                    title="Add to playlist"
                  >
                    <PlusCircle size={18} />
                  </button>

                  {showAddToPlaylistDropdown === song.id && (
                    <div className="playlist-select-dropdown">
                      <div className="dropdown-title">Add to Playlist:</div>
                      {playlists.map(pl => (
                        <button
                          key={pl.id}
                          onClick={() => handleAddSongToPlaylist(pl.id, song)}
                          className="dropdown-item"
                        >
                          {pl.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="time-text">{formatDuration(song.duration)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Jamendo Cloud Search Results */}
      {searchQuery && jamendoSongs && jamendoSongs.length > 0 && (
        <section className="dashboard-section" style={{ marginTop: '48px' }}>
          <div className="section-header">
            <h3>Jamendo Cloud Search Results</h3>
            <span className="logo-badge" style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' }}>API Live</span>
          </div>
          <div className="tracks-list">
            <div className="track-list-header">
              <span className="idx">#</span>
              <span className="title">TITLE</span>
              <span className="album">ALBUM</span>
              <span className="actions"></span>
              <span className="time"><Clock size={16} /></span>
            </div>

            {jamendoSongs.map((song, i) => (
              <div key={song.id} className="track-row" onClick={() => playSong(song, jamendoSongs)}>
                <span className="idx">{i + 1}</span>
                <div className="track-title-cell">
                  <img src={song.cover_url} alt={song.title} className="track-cover" />
                  <div className="track-meta">
                    <span className="title-text" style={{ color: 'var(--accent-blue)' }}>{song.title}</span>
                    <span className="artist-text">{song.artist}</span>
                  </div>
                </div>
                <span className="album-text">{song.album}</span>
                
                {/* Actions column (Add to playlist dropdown) */}
                <div className="track-actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowAddToPlaylistDropdown(showAddToPlaylistDropdown === song.id ? null : song.id)}
                    className="add-to-playlist-trigger"
                    title="Add to playlist"
                  >
                    <PlusCircle size={18} />
                  </button>

                  {showAddToPlaylistDropdown === song.id && (
                    <div className="playlist-select-dropdown">
                      <div className="dropdown-title">Add to Playlist:</div>
                      {playlists.map(pl => (
                        <button
                          key={pl.id}
                          onClick={() => handleAddSongToPlaylist(pl.id, song)}
                          className="dropdown-item"
                        >
                          {pl.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="time-text">{formatDuration(song.duration)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
