/**
 * Career Statistics Tracker
 * Multi-season history, Hall of Fame evaluation
 */
'use strict';

/**
 * Snapshot current season stats into career history.
 * Call at the start of a new season (before resetting seasonStats).
 * @param {object} careerStats - existing career stats object (mutated in place)
 * @param {object} seasonStats - current season stats
 * @param {number} year - season year being archived
 * @returns {object} updated careerStats
 */
function snapshotCareerStats(careerStats, seasonStats, year) {
  if (!careerStats) careerStats = {};

  // Batting
  for (const [pid, stats] of Object.entries(seasonStats.batting || {})) {
    if (!careerStats[pid]) careerStats[pid] = { batting: [], pitching: [] };
    if (!Array.isArray(careerStats[pid].batting)) careerStats[pid].batting = [];
    // Avoid duplicate snapshots
    if (!careerStats[pid].batting.find(s => s.year === year)) {
      careerStats[pid].batting.push({ year, ...stats });
    }
  }

  // Pitching
  for (const [pid, stats] of Object.entries(seasonStats.pitching || {})) {
    if (!careerStats[pid]) careerStats[pid] = { batting: [], pitching: [] };
    if (!Array.isArray(careerStats[pid].pitching)) careerStats[pid].pitching = [];
    if (!careerStats[pid].pitching.find(s => s.year === year)) {
      careerStats[pid].pitching.push({ year, ...stats });
    }
  }

  return careerStats;
}

/**
 * Get aggregated career totals for a single player.
 * @returns { batting: {seasons, ab, h, hr, rbi, r, bb, sb, ...}, pitching: {seasons, ip, w, l, k, ...}, history }
 */
function getCareerTotals(careerStats, playerId) {
  const history = careerStats?.[playerId] || { batting: [], pitching: [] };

  const batting = (history.batting || []).reduce((acc, s) => ({
    seasons: (acc.seasons || 0) + 1,
    ab:  (acc.ab  || 0) + (s.ab  || 0),
    h:   (acc.h   || 0) + (s.h   || 0),
    hr:  (acc.hr  || 0) + (s.hr  || 0),
    rbi: (acc.rbi || 0) + (s.rbi || 0),
    r:   (acc.r   || 0) + (s.r   || 0),
    bb:  (acc.bb  || 0) + (s.bb  || 0),
    sb:  (acc.sb  || 0) + (s.sb  || 0),
    k:   (acc.k   || 0) + (s.k   || 0),
  }), {});

  const pitching = (history.pitching || []).reduce((acc, s) => ({
    seasons: (acc.seasons || 0) + 1,
    ip:  (acc.ip  || 0) + (s.ip  || 0),
    w:   (acc.w   || 0) + (s.w   || 0),
    l:   (acc.l   || 0) + (s.l   || 0),
    k:   (acc.k   || 0) + (s.k   || 0),
    bb:  (acc.bb  || 0) + (s.bb  || 0),
    er:  (acc.er  || 0) + (s.er  || 0),
    h:   (acc.h   || 0) + (s.h   || 0),
    gs:  (acc.gs  || 0) + (s.gs  || 0),
    sv:  (acc.sv  || 0) + (s.sv  || 0),
  }), {});

  return {
    batting,
    pitching,
    battingHistory:  history.batting  || [],
    pitchingHistory: history.pitching || [],
  };
}

/**
 * Evaluate if a player qualifies for the Hall of Fame.
 * @returns { qualified: bool, reason: string }
 */
function evaluateHOF(careerStats, playerId, playerMap) {
  const player = playerMap[playerId];
  if (!player) return { qualified: false };

  const totals = getCareerTotals(careerStats, playerId);
  const isPitcher = ['SP', 'RP', 'TWP'].includes(player.position);

  if (isPitcher) {
    const { w = 0, k = 0, ip = 0 } = totals.pitching;
    const era = ip > 0 ? (totals.pitching.er * 9) / ip : 99;
    if (w >= 200) return { qualified: true, reason: `${w} career wins` };
    if (k >= 2500) return { qualified: true, reason: `${k} career strikeouts` };
    if (ip >= 2500 && w >= 160) return { qualified: true, reason: `${Math.round(ip)} IP, ${w}W` };
    if (w >= 150 && era <= 3.30 && ip >= 1500) return { qualified: true, reason: `${w}W, ${era.toFixed(2)} ERA` };
  } else {
    const { h = 0, hr = 0, ab = 0, rbi = 0, sb = 0 } = totals.batting;
    const avg = ab > 0 ? h / ab : 0;
    if (hr >= 400)  return { qualified: true, reason: `${hr} career HR` };
    if (h  >= 2500) return { qualified: true, reason: `${h} career hits` };
    if (rbi >= 1500) return { qualified: true, reason: `${rbi} career RBI` };
    if (avg >= 0.300 && ab >= 3000) return { qualified: true, reason: `.${Math.round(avg * 1000)} career AVG` };
    if (sb >= 500 && avg >= 0.270 && ab >= 3000) return { qualified: true, reason: `${sb} career SB` };
  }

  return { qualified: false };
}

/**
 * Check all recently retired players for HOF eligibility.
 * Returns array of newly inducted HOF member objects.
 */
function processHOFInductions(retiredPlayerIds, careerStats, playerMap, existingHof) {
  const hofSet = new Set((existingHof || []).map(m => m.playerId));
  const inducted = [];

  for (const pid of retiredPlayerIds) {
    if (hofSet.has(pid)) continue;
    const result = evaluateHOF(careerStats, pid, playerMap);
    if (result.qualified) {
      const player = playerMap[pid];
      inducted.push({
        playerId:     pid,
        name:         player?.name || pid,
        position:     player?.position || '?',
        previousTeam: player?.teamId || '?',
        age:          player?.age || 40,
        reason:       result.reason,
        year:         (player?.age ? player.age : 40), // reuse as inducted year placeholder
      });
    }
  }

  return inducted;
}
