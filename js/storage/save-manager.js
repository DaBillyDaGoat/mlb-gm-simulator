/**
 * Save Manager — localStorage persistence
 */
'use strict';

const SAVE_KEY = 'bbsim_save_v1';
const MAX_BOX_SCORES = 25; // Keep last 25 games in box score history

const SaveManager = {
  save(state) {
    try {
      // Prune box score history to avoid storage bloat
      if (state.boxScores && state.boxScores.length > MAX_BOX_SCORES) {
        state.boxScores = state.boxScores.slice(-MAX_BOX_SCORES);
      }

      // Prune schedule results — store only completed game metadata, not full play-by-play
      // Keep full box scores separate; schedule only needs outcome
      const slim = this._slimState(state);
      const json = JSON.stringify(slim);
      localStorage.setItem(SAVE_KEY, json);
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      // If storage is full, try saving without box scores
      try {
        const backup = { ...state, boxScores: [] };
        localStorage.setItem(SAVE_KEY, JSON.stringify(backup));
        return true;
      } catch (e2) {
        console.error('Backup save also failed:', e2);
        return false;
      }
    }
  },

  load() {
    try {
      const json = localStorage.getItem(SAVE_KEY);
      if (!json) return null;
      return JSON.parse(json);
    } catch (e) {
      console.error('Load failed:', e);
      return null;
    }
  },

  delete() {
    localStorage.removeItem(SAVE_KEY);
  },

  exists() {
    return !!localStorage.getItem(SAVE_KEY);
  },

  // Strip play-by-play from completed schedule games to save space
  _slimState(state) {
    const slim = { ...state };
    if (slim.schedule) {
      slim.schedule = slim.schedule.map(g => {
        if (g.status === 'completed' && g.result) {
          // Keep result but drop play-by-play (stored in boxScores separately)
          const { playByPlay, gameStats, ...slimResult } = g.result;
          return { ...g, result: slimResult };
        }
        return g;
      });
    }
    return slim;
  },
};

window.SaveManager = SaveManager;
