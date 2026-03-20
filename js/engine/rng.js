/**
 * Seeded RNG — Mulberry32 algorithm
 * Allows reproducible simulation results for debugging
 */
'use strict';

class SeededRNG {
  constructor(seed) {
    this.seed = seed >>> 0;
    this._calls = 0;
  }

  /** Returns float in [0, 1) */
  next() {
    this._calls++;
    let s = (this.seed += 0x6D2B79F5);
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns integer in [min, max] inclusive */
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns float in [min, max) */
  float(min, max) {
    return this.next() * (max - min) + min;
  }

  /** Returns true with probability p */
  chance(p) {
    return this.next() < p;
  }

  /** Returns a random element from an array */
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Shuffles array in-place using Fisher-Yates */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/** Generate a seed from a string (team ID + game number, etc.) */
function makeSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

window.SeededRNG = SeededRNG;
window.makeSeed = makeSeed;
