/**
 * Achievement / Trophy System
 */
'use strict';

const ACHIEVEMENTS = [
  { id: 'first_win',     name: 'First Win',          icon: '✅', desc: 'Win your first game' },
  { id: 'win_10',        name: 'On a Roll',           icon: '🔥', desc: 'Win 10 games in a season' },
  { id: 'win_50',        name: 'Contender',           icon: '⭐', desc: 'Win 50 games in a season' },
  { id: 'win_100',       name: 'Century Club',        icon: '💯', desc: 'Win 100 games in a season' },
  { id: 'world_series',  name: 'World Champions',     icon: '🏆', desc: 'Win the World Series' },
  { id: 'playoff_berth', name: 'October Baseball',    icon: '🍂', desc: 'Qualify for the playoffs' },
  { id: 'hr_30',         name: 'Power Surge',         icon: '💣', desc: 'A player hits 30 home runs' },
  { id: 'hr_40',         name: 'Long Ball Legend',    icon: '🚀', desc: 'A player hits 40 home runs' },
  { id: 'hr_50',         name: 'Sultan of Swat',      icon: '💥', desc: 'A player hits 50 home runs' },
  { id: 'hr_60',         name: 'Historic Slugger',    icon: '🌟', desc: 'A player hits 60 home runs' },
  { id: 'k_200',         name: 'Strikeout Machine',   icon: '🌀', desc: 'A pitcher records 200 Ks' },
  { id: 'w_20',          name: 'Ace',                 icon: '🎯', desc: 'A pitcher wins 20 games' },
  { id: 'rbi_100',       name: 'RBI Machine',         icon: '💪', desc: 'A player drives in 100 runs' },
  { id: 'no_hitter',     name: 'No-Hitter',           icon: '🔒', desc: 'Your pitcher throws a no-hitter' },
  { id: 'win_streak_10', name: 'Hot Streak',          icon: '🔴', desc: 'Win 10 games in a row' },
  { id: 'multi_season',  name: 'Dynasty Builder',     icon: '👑', desc: 'Complete 3 or more seasons' },
  { id: 'hof_inducted',  name: 'Hall of Fame',        icon: '🏛️', desc: 'A player from your franchise enters the HOF' },
  { id: 'waiver_pickup', name: 'Bargain Hunter',      icon: '🛒', desc: 'Sign a player off the waiver wire' },
  { id: 'rivalry_win',   name: 'Rival Slayer',        icon: '⚔️', desc: 'Beat a divisional rival 10+ times' },
];

/**
 * Check all achievement conditions against current state.
 * Mutates state.achievements.
 * @returns {Array} newly unlocked achievement objects
 */
function checkAchievements(state, playerMap) {
  if (!state.achievements) state.achievements = {};
  const newlyUnlocked = [];

  const rec    = state.teamRecords[state.userTeamId] || {};
  const wins   = rec.wins   || 0;
  const streak = rec.streak || {};
  const batStats  = Object.values(state.seasonStats?.batting  || {});
  const pitStats  = Object.values(state.seasonStats?.pitching || {});

  // Count divisional rivalry wins vs each opponent
  const rivalryWins = _countRivalryWins(state);

  const conditions = {
    first_win:     wins >= 1,
    win_10:        wins >= 10,
    win_50:        wins >= 50,
    win_100:       wins >= 100,
    world_series:  state.playoffs?.champion === state.userTeamId,
    playoff_berth: _madePlayoffs(state),
    hr_30:         batStats.some(s => (s.hr  || 0) >= 30),
    hr_40:         batStats.some(s => (s.hr  || 0) >= 40),
    hr_50:         batStats.some(s => (s.hr  || 0) >= 50),
    hr_60:         batStats.some(s => (s.hr  || 0) >= 60),
    k_200:         pitStats.some(s => (s.k   || 0) >= 200),
    w_20:          pitStats.some(s => (s.w   || 0) >= 20),
    rbi_100:       batStats.some(s => (s.rbi || 0) >= 100),
    no_hitter:     !!state.noHitter,
    win_streak_10: streak.type === 'W' && (streak.count || 0) >= 10,
    multi_season:  (state.season?.year || 2026) >= 2029,
    hof_inducted:  (state.hofMembers || []).some(m => m.previousTeam === state.userTeamId),
    waiver_pickup: !!state.waiverPickupDone,
    rivalry_win:   rivalryWins >= 10,
  };

  for (const ach of ACHIEVEMENTS) {
    if (state.achievements[ach.id]?.unlocked) continue;
    try {
      if (conditions[ach.id]) {
        state.achievements[ach.id] = {
          unlocked: true,
          season:   state.season?.year || 2026,
          day:      state.season?.currentDay || 0,
        };
        newlyUnlocked.push(ach);
      }
    } catch (e) { /* swallow eval errors */ }
  }

  return newlyUnlocked;
}

function _madePlayoffs(state) {
  const po = state.playoffs;
  if (!po) return false;
  for (const league of ['AL', 'NL']) {
    const lb = po[league];
    if (!lb) continue;
    const allSeries = [
      ...(lb.wildCard || []),
      ...(lb.divisionSeries || []),
      lb.championshipSeries,
    ].filter(Boolean);
    for (const s of allSeries) {
      if (s.team1 === state.userTeamId || s.team2 === state.userTeamId) return true;
    }
  }
  if (po.worldSeries) {
    const ws = po.worldSeries;
    if (ws.team1 === state.userTeamId || ws.team2 === state.userTeamId) return true;
  }
  return false;
}

function _countRivalryWins(state) {
  if (!state.schedule || !state.userTeamId) return 0;
  const userTeam = TEAMS_META?.find(t => t.id === state.userTeamId);
  if (!userTeam) return 0;
  let count = 0;
  for (const g of state.schedule) {
    if (g.status !== 'completed' || !g.result) continue;
    const isHome  = g.homeTeamId === state.userTeamId;
    const oppId   = isHome ? g.awayTeamId : g.homeTeamId;
    const oppMeta = TEAMS_META?.find(t => t.id === oppId);
    if (!oppMeta) continue;
    // Same division = rival
    if (oppMeta.league !== userTeam.league || oppMeta.division !== userTeam.division) continue;
    const myScore  = isHome ? g.result.homeScore : g.result.awayScore;
    const oppScore = isHome ? g.result.awayScore : g.result.homeScore;
    if (myScore > oppScore) count++;
  }
  return count;
}

/**
 * Check for season milestones (called each day).
 * @returns {Array} newly triggered milestone objects { pid, playerName, type, value }
 */
function checkMilestones(state, playerMap) {
  if (!state.triggeredMilestones) state.triggeredMilestones = {};
  const triggered = [];

  const batMilestones = [
    { stat: 'hr',  thresholds: [30, 40, 50, 60], fmt: (n, name) => `${name} has hit ${n} home runs! 💣` },
    { stat: 'rbi', thresholds: [100],             fmt: (n, name) => `${name} has 100 RBI! 💪` },
    { stat: 'sb',  thresholds: [40, 60],          fmt: (n, name) => `${name} has swiped ${n} bags! 🏃` },
  ];

  const pitMilestones = [
    { stat: 'k', thresholds: [150, 200, 250, 300], fmt: (n, name) => `${name} has struck out ${n} batters! 🌀` },
    { stat: 'w', thresholds: [15, 20],             fmt: (n, name) => `${name} has won ${n} games! 🎯` },
  ];

  // Batting milestones (user team only for immersion)
  for (const [pid, stats] of Object.entries(state.seasonStats?.batting || {})) {
    const p = playerMap[pid];
    if (!p || p.teamId !== state.userTeamId) continue;
    for (const ms of batMilestones) {
      for (const threshold of ms.thresholds) {
        const key = `${pid}_${ms.stat}_${threshold}`;
        if (state.triggeredMilestones[key]) continue;
        if ((stats[ms.stat] || 0) >= threshold) {
          state.triggeredMilestones[key] = true;
          triggered.push({ pid, playerName: p.name, msg: ms.fmt(threshold, p.name) });
        }
      }
    }
  }

  // Pitching milestones (user team only)
  for (const [pid, stats] of Object.entries(state.seasonStats?.pitching || {})) {
    const p = playerMap[pid];
    if (!p || p.teamId !== state.userTeamId) continue;
    for (const ms of pitMilestones) {
      for (const threshold of ms.thresholds) {
        const key = `${pid}_${ms.stat}_${threshold}`;
        if (state.triggeredMilestones[key]) continue;
        if ((stats[ms.stat] || 0) >= threshold) {
          state.triggeredMilestones[key] = true;
          triggered.push({ pid, playerName: p.name, msg: ms.fmt(threshold, p.name) });
        }
      }
    }
  }

  // AVG milestone (.400 mid-season, minimum 100 AB)
  for (const [pid, stats] of Object.entries(state.seasonStats?.batting || {})) {
    const p = playerMap[pid];
    if (!p || p.teamId !== state.userTeamId) continue;
    if ((stats.ab || 0) >= 100) {
      const avg = stats.h / stats.ab;
      const key = `${pid}_avg400`;
      if (!state.triggeredMilestones[key] && avg >= 0.400) {
        state.triggeredMilestones[key] = true;
        triggered.push({ pid, playerName: p.name, msg: `${p.name} is batting .400! 🔥` });
      }
    }
  }

  return triggered;
}
