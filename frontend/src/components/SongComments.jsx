import React, { useState, useEffect } from 'react';
import { MessageSquare, Play, Send } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { BACKEND_URL } from '../context/AudioContext';

export default function SongComments() {
  const { currentSong, currentTime, seek, user } = useAudio();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('timestamped'); // 'timestamped' | 'all'

  // Fetch comments when current song changes
  const fetchComments = async () => {
    if (!currentSong) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/comments/${currentSong.id}`);
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [currentSong]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentSong) return;

    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (user) {
        headers['x-user-id'] = user.id;
        headers['x-user-name'] = user.name;
        headers['x-user-avatar'] = user.avatar_url;
      }

      const res = await fetch(`${BACKEND_URL}/api/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          songId: currentSong.id,
          text: newComment,
          timestamp: currentTime // Attach exact playing second
        })
      });

      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    }
  };

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentSong) {
    return (
      <div className="comments-panel empty">
        <MessageSquare size={36} className="text-muted" />
        <p>Select a track to join the listener community comments.</p>
      </div>
    );
  }

  // Filter comments for active tab
  // 'timestamped' tab: show comments left within +/- 5 seconds of current playing time
  const filteredComments = activeTab === 'timestamped'
    ? comments.filter(c => Math.abs(c.timestamp - currentTime) <= 5)
    : comments;

  return (
    <div className="comments-panel">
      <div className="comments-header">
        <div className="comments-heading">
          <MessageSquare size={16} />
          <span>Track Discussions</span>
        </div>
        <div className="comments-tab-toggles">
          <button
            onClick={() => setActiveTab('timestamped')}
            className={`tab-toggle ${activeTab === 'timestamped' ? 'active' : ''}`}
            title="Show comments matching the current audio timestamp (+/- 5s)"
          >
            Live Feed
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`tab-toggle ${activeTab === 'all' ? 'active' : ''}`}
          >
            All ({comments.length})
          </button>
        </div>
      </div>

      <div className="comments-scroller">
        {filteredComments.length === 0 ? (
          <div className="comments-empty-message">
            {activeTab === 'timestamped' ? (
              <p>No comments left at this moment. Be the first to share your thoughts at {formatTime(currentTime)}!</p>
            ) : (
              <p>No discussions yet. Leave your mark below!</p>
            )}
          </div>
        ) : (
          <div className="comments-list">
            {filteredComments.map((comment) => (
              <div key={comment.id} className="comment-card">
                <div className="comment-user-avatar">
                  <img
                    src={comment.user_avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
                    alt={comment.user_name}
                  />
                </div>
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="user-name">{comment.user_name}</span>
                    <button
                      onClick={() => seek(comment.timestamp)}
                      className="comment-timestamp-tag"
                      title="Jump to comment mark"
                    >
                      <Play size={10} />
                      <span>{formatTime(comment.timestamp)}</span>
                    </button>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="comment-form-box">
        <div className="comment-input-row">
          <div className="comment-timestamp-indicator" title="Your comment will pin to this song timestamp">
            {formatTime(currentTime)}
          </div>
          <input
            type="text"
            placeholder={user ? "Share your thoughts on this section..." : "Share thoughts (anonymous)..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="comment-input"
            maxLength={140}
          />
          <button type="submit" className="comment-submit-btn">
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
