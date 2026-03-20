/**
 * Sound Effects — Web Audio API
 * All sounds are synthesized — no external files needed.
 * Mobile-friendly: resumes AudioContext on user gesture.
 */
'use strict';

const Sound = (() => {
  let _ctx   = null;
  let _enabled = true;

  function _getCtx() {
    if (!_ctx) {
      try {
        _ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        _enabled = false;
        return null;
      }
    }
    // iOS Safari suspends context until user interaction
    if (_ctx.state === 'suspended') {
      _ctx.resume();
    }
    return _ctx;
  }

  /** Short noise burst (bat crack, thud) */
  function _noise(duration, bandFreq, gainVal, attackSec) {
    const c = _getCtx();
    if (!c) return;
    const sr  = c.sampleRate;
    const buf = c.createBuffer(1, Math.floor(sr * duration), sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * attackSec));
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const flt = c.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = bandFreq;
    flt.Q.value = 0.6;
    const g = c.createGain();
    g.gain.value = gainVal;
    src.connect(flt);
    flt.connect(g);
    g.connect(c.destination);
    src.start();
  }

  /** Simple oscillator tone */
  function _tone(freq, duration, gainVal, type, startOffset) {
    const c = _getCtx();
    if (!c) return;
    const now = c.currentTime + (startOffset || 0);
    const osc = c.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    g.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  return {
    get enabled() { return _enabled; },

    toggle() {
      _enabled = !_enabled;
      return _enabled;
    },

    /** Enable audio context after user gesture */
    unlock() {
      _getCtx();
    },

    /** Crack of the bat — regular hit */
    hit() {
      if (!_enabled) return;
      _noise(0.10, 1300, 0.5, 0.018);
    },

    /** Big crack + crowd roar — home run */
    homeRun() {
      if (!_enabled) return;
      _noise(0.13, 1600, 0.9, 0.012);

      // Crowd roar buildup
      const c = _getCtx();
      if (!c) return;
      setTimeout(() => {
        const sr  = c.sampleRate;
        const dur = 1.2;
        const buf = c.createBuffer(1, Math.floor(sr * dur), sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const env = Math.min(1, i / (sr * 0.12)) * Math.exp(-i / (sr * 0.6));
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = c.createBufferSource();
        src.buffer = buf;
        const flt = c.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.value = 1800;
        const g = c.createGain();
        g.gain.value = 0.28;
        src.connect(flt);
        flt.connect(g);
        g.connect(c.destination);
        src.start();
      }, 90);
    },

    /** Thud — strikeout */
    strikeout() {
      if (!_enabled) return;
      _noise(0.07, 500, 0.35, 0.004);
    },

    /** Ascending arpeggio — win */
    win() {
      if (!_enabled) return;
      [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
        _tone(f, 0.22, 0.20, 'sine', i * 0.1);
      });
    },

    /** Descending tones — loss */
    loss() {
      if (!_enabled) return;
      [392.00, 329.63, 261.63].forEach((f, i) => {
        _tone(f, 0.28, 0.16, 'sine', i * 0.13);
      });
    },

    /** Quick sparkle — milestone */
    milestone() {
      if (!_enabled) return;
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        _tone(f, 0.18, 0.17, 'triangle', i * 0.08);
      });
    },

    /** Achievement unlock — fanfare */
    achievement() {
      if (!_enabled) return;
      [392.00, 523.25, 659.25, 784.00, 1046.50].forEach((f, i) => {
        _tone(f, 0.25, 0.18, 'square', i * 0.09);
      });
    },
  };
})();
