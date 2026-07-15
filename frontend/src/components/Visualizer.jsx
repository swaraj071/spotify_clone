import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Activity, Disc } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

export default function Visualizer() {
  const { isPlaying, analyserRef } = useAudio();
  const canvasRef = useRef(null);
  const [visMode, setVisMode] = useState('bars'); // 'bars' | 'wave' | 'circle'
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set internal dimensions to match display dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      const displayWidth = canvas.width / window.devicePixelRatio;
      const displayHeight = canvas.height / window.devicePixelRatio;
      
      // Clear canvas with deep dark, slightly transparent background for trailing motion blur
      ctx.fillStyle = 'rgba(15, 15, 20, 0.2)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      const analyser = analyserRef.current;
      if (!analyser) {
        // Draw idle waves/circles
        drawIdleState(ctx, displayWidth, displayHeight);
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (visMode === 'wave') {
        // Waveform / Time Domain
        analyser.getByteTimeDomainData(dataArray);
        drawWaveform(ctx, displayWidth, displayHeight, dataArray, bufferLength);
      } else if (visMode === 'circle') {
        // Circular Bass Ripple
        analyser.getByteFrequencyData(dataArray);
        drawCircular(ctx, displayWidth, displayHeight, dataArray, bufferLength);
      } else {
        // Frequency Bars
        analyser.getByteFrequencyData(dataArray);
        drawBars(ctx, displayWidth, displayHeight, dataArray, bufferLength);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [visMode, isPlaying]);

  const drawIdleState = (ctx, w, h) => {
    ctx.strokeStyle = 'rgba(29, 185, 84, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    
    const time = Date.now() * 0.003;
    for (let x = 0; x < w; x++) {
      const y = h / 2 + Math.sin(x * 0.02 + time) * 10;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const drawBars = (ctx, w, h, dataArray, bufferLength) => {
    const barWidth = (w / (bufferLength * 0.65)) * 1.5;
    let x = 0;

    // Create glowing gradients
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, '#1db954'); // Spotify green
    gradient.addColorStop(0.5, '#00d2ff'); // Light Blue
    gradient.addColorStop(1, '#ff007f'); // Neon Pink

    for (let i = 0; i < bufferLength * 0.65; i++) {
      // Normalize value from 0-255 to fraction of height
      const barHeight = (dataArray[i] / 255) * h * 0.8;

      ctx.fillStyle = gradient;
      // Draw rounded rectangles
      const y = h - barHeight;
      const radius = barWidth / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth - 2, barHeight, [radius, radius, 0, 0]);
      ctx.fill();

      x += barWidth;
    }
  };

  const drawWaveform = (ctx, w, h, dataArray, bufferLength) => {
    ctx.lineWidth = 3;
    
    // Waveform gradient
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#00d2ff');
    gradient.addColorStop(0.5, '#ff007f');
    gradient.addColorStop(1, '#7928ca');
    ctx.strokeStyle = gradient;
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 210, 255, 0.5)';
    ctx.beginPath();

    const sliceWidth = w / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
  };

  const drawCircular = (ctx, w, h, dataArray, bufferLength) => {
    const centerX = w / 2;
    const centerY = h / 2;
    // Calculate average bass frequency (first 10 bins)
    let bassSum = 0;
    for (let i = 0; i < 10; i++) {
      bassSum += dataArray[i];
    }
    const bassAverage = bassSum / 10;
    const baseRadius = Math.min(w, h) * 0.2 + (bassAverage / 255) * 20;

    // Draw central spinning disc representation
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(29, 185, 84, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius - 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#121212';
    ctx.fill();
    ctx.restore();

    // Draw audio reactive ripples around it
    ctx.beginPath();
    for (let i = 0; i < bufferLength * 0.7; i += 2) {
      const angle = (i / (bufferLength * 0.7)) * Math.PI * 2;
      const amplitude = (dataArray[i] / 255) * 60;
      const r = baseRadius + amplitude;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    
    const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, baseRadius + 60);
    gradient.addColorStop(0, 'rgba(29, 185, 84, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 210, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 0, 127, 0)');
    
    ctx.strokeStyle = '#1db954';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = gradient;
    ctx.fill();
  };

  return (
    <div className="visualizer-card">
      <div className="vis-controls">
        <div className="vis-title">
          <Activity size={18} className="pulse-icon" />
          <span>Real-time Visualizer</span>
        </div>
        <div className="vis-buttons">
          <button
            onClick={() => setVisMode('bars')}
            className={`vis-btn ${visMode === 'bars' ? 'active' : ''}`}
          >
            Spectrum
          </button>
          <button
            onClick={() => setVisMode('wave')}
            className={`vis-btn ${visMode === 'wave' ? 'active' : ''}`}
          >
            Oscilloscope
          </button>
          <button
            onClick={() => setVisMode('circle')}
            className={`vis-btn-circle ${visMode === 'circle' ? 'active' : ''}`}
          >
            <Disc size={14} />
            <span>Mandala</span>
          </button>
        </div>
      </div>
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} className="vis-canvas" />
      </div>
    </div>
  );
}
