import React from 'react';
import { Home, Sliders, Music, Sparkles, Upload, LogOut, Radio, User, Library } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout, playlists, setCurrentPlaylist } = useAudio();

  const handlePlaylistClick = (playlist) => {
    setCurrentPlaylist(playlist);
    setActiveTab('playlist');
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'studio', label: 'Studio (EQ & Visualizer)', icon: Sliders },
    { id: 'aidj', label: 'AI DJ Station', icon: Sparkles },
    { id: 'upload', label: 'Upload Creator', icon: Upload }
  ];

  return (
    <div className="sidebar">
      {/* App Logo */}
      <div className="sidebar-logo">
        <Radio className="logo-icon" size={28} />
        <span>AuraSound</span>
        <span className="logo-badge">Pro</span>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Playlists List Section */}
      <div className="sidebar-playlists">
        <div className="playlists-title">
          <Library size={16} />
          <span>YOUR PLAYLISTS</span>
        </div>
        <div className="playlists-list-scroller">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => handlePlaylistClick(playlist)}
              className="playlist-nav-link"
            >
              <span className="bullet">•</span>
              <span className="name">{playlist.name}</span>
              {playlist.is_collaborative === 1 && (
                <span className="collab-badge">Collab</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* User Session Footer */}
      <div className="sidebar-user-footer">
        {user ? (
          <div className="user-profile-widget">
            <img
              src={user.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
              alt={user.name}
              className="user-avatar"
            />
            <div className="user-meta">
              <span className="user-name">{user.name}</span>
              <span className="user-sub">Artist / Creator</span>
            </div>
            <button onClick={logout} className="logout-btn" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => setActiveTab('auth')} className="login-prompt-btn">
            <User size={16} />
            <span>Sign In / Create Account</span>
          </button>
        )}
      </div>
    </div>
  );
}
