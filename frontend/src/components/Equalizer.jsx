import React from 'react';
import { Sliders, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

export default function Equalizer() {
  const {
    eqBass,
    setEqBass,
    eqMid,
    setEqMid,
    eqTreble,
    setEqTreble,
    eqEnabled,
    setEqEnabled
  } = useAudio();

  const handleReset = () => {
    setEqBass(0);
    setEqMid(0);
    setEqTreble(0);
  };

  return (
    <div className="equalizer-card">
      <div className="eq-header">
        <div className="eq-title">
          <Sliders size={18} className="eq-icon" />
          <span>3-Band Studio EQ</span>
        </div>
        <div className="eq-controls-right">
          <button onClick={handleReset} className="eq-reset-btn">
            Reset
          </button>
          <button
            onClick={() => setEqEnabled(!eqEnabled)}
            className="eq-toggle-btn"
          >
            {eqEnabled ? (
              <ToggleRight size={28} className="text-spotify" />
            ) : (
              <ToggleLeft size={28} className="text-muted" />
            )}
          </button>
        </div>
      </div>

      <div className={`eq-sliders ${eqEnabled ? '' : 'disabled'}`}>
        {/* Bass Slider */}
        <div className="eq-slider-col">
          <div className="eq-slider-value">{eqBass > 0 ? `+${eqBass}` : eqBass} dB</div>
          <div className="eq-slider-input-wrapper">
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={eqBass}
              disabled={!eqEnabled}
              onChange={(e) => setEqBass(parseInt(e.target.value))}
              className="eq-slider-input vertical-slider"
              orient="vertical" // standard for vertical ranges
            />
          </div>
          <div className="eq-slider-label">BASS</div>
          <div className="eq-slider-freq">200 Hz</div>
        </div>

        {/* Mid Slider */}
        <div className="eq-slider-col">
          <div className="eq-slider-value">{eqMid > 0 ? `+${eqMid}` : eqMid} dB</div>
          <div className="eq-slider-input-wrapper">
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={eqMid}
              disabled={!eqEnabled}
              onChange={(e) => setEqMid(parseInt(e.target.value))}
              className="eq-slider-input vertical-slider"
              orient="vertical"
            />
          </div>
          <div className="eq-slider-label">MID</div>
          <div className="eq-slider-freq">1.0 kHz</div>
        </div>

        {/* Treble Slider */}
        <div className="eq-slider-col">
          <div className="eq-slider-value">{eqTreble > 0 ? `+${eqTreble}` : eqTreble} dB</div>
          <div className="eq-slider-input-wrapper">
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={eqTreble}
              disabled={!eqEnabled}
              onChange={(e) => setEqTreble(parseInt(e.target.value))}
              className="eq-slider-input vertical-slider"
              orient="vertical"
            />
          </div>
          <div className="eq-slider-label">TREBLE</div>
          <div className="eq-slider-freq">3.0 kHz</div>
        </div>
      </div>
      <p className="eq-description">
        {eqEnabled 
          ? "Equalizer active. Adjust sliders to tune high, mid, and low frequencies in real-time."
          : "Equalizer bypassed. Output is flat (unfiltered)."}
      </p>
    </div>
  );
}
