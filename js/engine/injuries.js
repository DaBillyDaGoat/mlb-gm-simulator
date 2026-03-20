/**
 * Injury System
 * Rolls for injuries after each game, tracks IL stints, heals over time.
 */
'use strict';

// Injury type distribution (weight must sum to 1.0)
// DTD min=3 so that after same-day decrement, player misses at least 2 games.
const INJURY_TYPES = [
  { name: 'Day-to-Day', il: 'DTD',  min: 3,  max: 6,  weight: 0.55 },
  { name: '15-Day IL',  il: 'IL15', min: 15, max: 21, weight: 0.35 },
  { name: '60-Day IL',  il: 'IL60', min: 60, max: 75, weight: 0.10 },
];

// Chance per game that a player who appeared gets injured
const BATTER_INJURY_RATE  = 0.012; // ~1.2% per game appearance
const PITCHER_INJURY_RATE = 0.015; // ~1.5% per start/appearance

/**
 * Roll injuries for all players who appeared in a game.
 * Returns array of new injury objects.
 */
function rollGameInjuries(gameStats, playerMap, currentInjuries) {
  const newInjuries = [];

  // Check batters
  for (const pid of Object.keys(gameStats.batting)) {
    if (currentInjuries[pid]) continue; // already on IL
    const player = playerMap[pid];
    if (!player) continue;
    if (Math.random() < BATTER_INJURY_RATE) {
      const inj = _pickInjuryType(player);
      if (inj) newInjuries.push(inj);
    }
  }

  // Check pitchers (higher rate)
  for (const pid of Object.keys(gameStats.pitching)) {
    if (currentInjuries[pid]) continue;
    if (gameStats.batting[pid]) continue; // already checked above
    const player = playerMap[pid];
    if (!player) continue;
    if (Math.random() < PITCHER_INJURY_RATE) {
      const inj = _pickInjuryType(player);
      if (inj) newInjuries.push(inj);
    }
  }

  return newInjuries;
}

function _pickInjuryType(player) {
  const roll = Math.random();
  let cumul = 0;
  for (const type of INJURY_TYPES) {
    cumul += type.weight;
    if (roll < cumul) {
      const days = type.min + Math.floor(Math.random() * (type.max - type.min + 1));
      return {
        playerId: player.id,
        playerName: player.name,
        teamId: player.teamId,
        type: type.name,
        il: type.il,
        daysRemaining: days,
      };
    }
  }
  return null;
}

/**
 * Advance all injuries by one day.
 * Returns { injuries: updatedMap, healed: [playerId, ...] }
 */
function advanceInjuries(injuries) {
  const updated = {};
  const healed = [];
  for (const [pid, inj] of Object.entries(injuries)) {
    const rem = inj.daysRemaining - 1;
    if (rem <= 0) {
      healed.push(pid);
    } else {
      updated[pid] = { ...inj, daysRemaining: rem };
    }
  }
  return { injuries: updated, healed };
}

/**
 * Check if a player is currently on the IL.
 */
function isInjured(playerId, injuries) {
  return !!(injuries && injuries[playerId]);
}

/**
 * Get set of injured player IDs for a specific team.
 */
function getTeamInjuredIds(teamId, injuries, playerMap) {
  const ids = new Set();
  for (const [pid, inj] of Object.entries(injuries || {})) {
    if ((playerMap[pid]?.teamId === teamId) || inj.teamId === teamId) {
      ids.add(pid);
    }
  }
  return ids;
}

window.rollGameInjuries      = rollGameInjuries;
window.advanceInjuries       = advanceInjuries;
window.isInjured             = isInjured;
window.getTeamInjuredIds     = getTeamInjuredIds;
