/**
 * Save Manager — 3-slot localStorage persistence
 */
'use strict';

const SAVE_KEYS    = ['bfs_save_1', 'bfs_save_2', 'bfs_save_3'];
const LEGACY_KEY   = 'bbsim_save_v1';
const MAX_BOX_SCORES = 25;

const SaveManager = {

  /**
   * One-time migration: moves the old single-save to slot 1.
   * Returns the slot number (1) if migrated, null otherwise.
   */
  migrateLegacy() {
    try {
      const old = localStorage.getItem(LEGACY_KEY);
      if (old && !localStorage.getItem(SAVE_KEYS[0])) {
        localStorage.setItem(SAVE_KEYS[0], old);
        localStorage.removeItem(LEGACY_KEY);
        return 1;
      }
    } catch (e) { /* ignore */ }
    return null;
  },

  save(state, slot = 1) {
    try {
      if (state.boxScores && state.boxScores.length > MAX_BOX_SCORES) {
        state.boxScores = state.boxScores.slice(-MAX_BOX_SCORES);
      }
      state.saveDate = new Date().toISOString();
      const slim = this._slimState(state);
      const json = JSON.stringify(slim);
      localStorage.setItem(SAVE_KEYS[slot - 1], json);
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      try {
        const backup = { ...state, boxScores: [] };
        localStorage.setItem(SAVE_KEYS[slot - 1], JSON.stringify(backup));
        return true;
      } catch (e2) {
        console.error('Backup save also failed:', e2);
        return false;
      }
    }
  },

  load(slot = 1) {
    try {
      const json = localStorage.getItem(SAVE_KEYS[slot - 1]);
      if (!json) return null;
      return JSON.parse(json);
    } catch (e) {
      console.error('Load failed:', e);
      return null;
    }
  },

  delete(slot = 1) {
    localStorage.removeItem(SAVE_KEYS[slot - 1]);
  },

  exists(slot = 1) {
    return !!localStorage.getItem(SAVE_KEYS[slot - 1]);
  },

  /**
   * Returns an array of 3 slot-info objects (or null for empty slots).
   * Parses only the metadata needed for slot display — fast, no TEAMS_META required.
   */
  getAllSlots() {
    return SAVE_KEYS.map((key, i) => {
      try {
        const json = localStorage.getItem(key);
        if (!json) return null;
        const data = JSON.parse(json);
        const teamId = data.userTeamId || '';
        // Try to resolve team name from TEAMS_META (available at call time)
        const teamMeta = typeof TEAMS_META !== 'undefined'
          ? TEAMS_META.find(t => t.id === teamId) : null;
        const rec = (data.teamRecords || {})[teamId] || { wins: 0, losses: 0 };
        const year = data.season?.year || 2026;
        const phase = data.season?.phase || 'regular_season';
        const phaseLabel = phase === 'offseason' ? 'Offseason'
          : phase === 'playoffs' ? 'Playoffs'
          : `Season ${year}`;
        return {
          slot:     i + 1,
          teamId,
          city:     teamMeta?.city    || teamId,
          name:     teamMeta?.name    || teamId,
          full:     teamMeta?.full    || teamId,
          primary:  teamMeta?.primary || '#4F8EF7',
          wins:     rec.wins    || 0,
          losses:   rec.losses  || 0,
          year,
          phase,
          phaseLabel,
          saveDate: data.saveDate || null,
        };
      } catch (e) {
        return null;
      }
    });
  },

  // Strip play-by-play from completed schedule games to save space
  _slimState(state) {
    const slim = { ...state };
    if (slim.schedule) {
      slim.schedule = slim.schedule.map(g => {
        if (g.status === 'completed' && g.result) {
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
