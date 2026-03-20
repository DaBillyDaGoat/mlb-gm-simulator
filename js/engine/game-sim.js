/**
 * Game Simulation Engine
 * Simulates a full 9-inning baseball game at-bat by at-bat
 */
'use strict';

const PITCHER_POSITIONS = new Set(['SP', 'RP', 'TWP']);
const BATTER_POSITIONS  = new Set(['C','1B','2B','3B','SS','LF','CF','RF','DH','TWP']);

// ── Lineup / Rotation helpers ────────────────────────────────────────────────

/** Build a batting lineup (9 players) for a team vs. a pitcher's hand */
function buildLineup(teamId, playerMap, vsHand) {
  const posPlayers = Object.values(playerMap)
    .filter(p => p.teamId === teamId && BATTER_POSITIONS.has(p.position));

  // Score each batter for lineup construction
  function score(p) {
    const con = vsHand === 'L' ? p.batting.contactL : p.batting.contactR;
    const pow = vsHand === 'L' ? p.batting.powerL   : p.batting.powerR;
    return con * 0.6 + pow * 0.3 + p.batting.speed * 0.1;
  }

  const sorted = posPlayers.sort((a, b) => score(b) - score(a));
  return sorted.slice(0, 9).map(p => p.id);
}

/** Get starting pitcher for this game (cycle through rotation) */
function getStartingPitcher(teamId, playerMap, gamesBySeason, seasonStats) {
  // Cap each SP at 34 GS to prevent thin rotations (2-3 SPs) from getting 54+ starts.
  // When a pitcher has hit their GS limit, skip them; use next in rotation.
  const GS_CAP = 34;

  const starters = Object.values(playerMap)
    .filter(p =>
      p.teamId === teamId &&
      p.position === 'SP' &&
      (!seasonStats || (seasonStats.pitching[p.id]?.gs || 0) < GS_CAP)
    )
    .sort((a, b) => b.overall - a.overall);

  // Also allow TWP players (like Ohtani) to start
  const twp = Object.values(playerMap)
    .filter(p =>
      p.teamId === teamId &&
      p.position === 'TWP' &&
      p.pitching.velocity > 0 &&
      (!seasonStats || (seasonStats.pitching[p.id]?.gs || 0) < GS_CAP)
    );

  const rotation = [...starters, ...twp];
  if (rotation.length === 0) {
    // All SPs at GS cap: fall back to whoever has fewest starts (least overloaded)
    const allSPs = Object.values(playerMap)
      .filter(p => p.teamId === teamId && (p.position === 'SP' || p.position === 'TWP') && p.pitching?.velocity > 0)
      .sort((a, b) => (seasonStats?.pitching[a.id]?.gs || 0) - (seasonStats?.pitching[b.id]?.gs || 0));
    if (allSPs.length > 0) return allSPs[0];
    // Last resort: best available pitcher
    const rps = Object.values(playerMap)
      .filter(p => p.teamId === teamId && PITCHER_POSITIONS.has(p.position))
      .sort((a, b) => b.overall - a.overall);
    return rps[0] || null;
  }
  const idx = (gamesBySeason || 0) % Math.min(rotation.length, 5);
  return rotation[idx];
}

/**
 * Get next available bullpen pitcher.
 * Prefers pitchers under 70 appearances; falls back to any available.
 * Uses weighted random selection (via seeded rng) to spread appearances.
 * Falls back to bench SPs as "long relievers" when true bullpen is exhausted.
 */
function getBullpenPitcher(teamId, playerMap, usedPitcherIds, seasonStats, rng) {
  const rpAvail = Object.values(playerMap)
    .filter(p =>
      p.teamId === teamId &&
      (p.position === 'RP' || p.position === 'TWP') &&
      !usedPitcherIds.has(p.id) &&
      p.pitching?.velocity > 0 &&
      // Hard IP cap: once an RP exceeds 90 IP, they're done for the season
      (seasonStats ? (seasonStats.pitching[p.id]?.ip || 0) < 90 : true)
    )
    .sort((a, b) => b.overall - a.overall);

  // Helper: pick a bench SP as a 2-inning "long reliever" (uses TWP threshold)
  function pickEmergencySP() {
    const bench = Object.values(playerMap)
      .filter(p =>
        p.teamId === teamId &&
        p.position === 'SP' &&
        !usedPitcherIds.has(p.id) &&
        p.pitching?.velocity > 0 &&
        // Cap: don't use a SP as emergency reliever if they already have 40+ appearances
        // (prevents bench SPs from accumulating excessive IP as emergency long relievers)
        (seasonStats ? (seasonStats.pitching[p.id]?.g || 0) < 40 : true)
      )
      .sort((a, b) => a.overall - b.overall); // worst first (preserve top starters)
    if (bench.length === 0) return null;
    const bpool = bench.slice(0, Math.min(3, bench.length));
    const pick = rng ? bpool[Math.floor(rng.next() * bpool.length)] : bpool[0];
    // Override position to TWP so calcThreshold gives ~2-inning limit
    return { ...pick, position: 'TWP' };
  }

  // If no RPs left in this game, use bench SP as emergency long reliever
  if (rpAvail.length === 0) return pickEmergencySP();

  // Prefer pitchers under the ~70-game appearance target
  const fresh = seasonStats
    ? rpAvail.filter(p => (seasonStats.pitching[p.id]?.g || 0) < 70)
    : rpAvail;

  // When all RPs are over cap, prefer emergency SP; otherwise distribute over-cap
  // RPs fairly rather than always picking the same one (rpAvail[0]).
  if (fresh.length === 0) {
    const emergSP = pickEmergencySP();
    if (emergSP) return emergSP;
    // No emergency SP available. Use an over-cap RP with 50% probability
    // ("rest day") to avoid one reliever accumulating 400+ IP.
    // Pick the least-used one for fair distribution.
    if (rpAvail.length === 0) return null;
    // Always use the least-used over-cap RP rather than a rest-day null,
    // which previously caused starters to pitch 9-11 innings when bullpen was thin.
    const byG = [...rpAvail].sort((a, b) =>
      (seasonStats?.pitching[a.id]?.g || 0) - (seasonStats?.pitching[b.id]?.g || 0));
    return byG[0];
  }

  const pool = fresh.slice(0, 3);

  // Weighted pick via game's seeded RNG so same game → same result
  if (rng && pool.length > 1) {
    const weights = [0.50, 0.30, 0.20];
    const r = rng.next();
    let cumul = 0;
    for (let i = 0; i < pool.length; i++) {
      cumul += weights[i] ?? (1 / pool.length);
      if (r < cumul) return pool[i];
    }
  }
  return pool[0];
}

// ── Half-inning simulation ───────────────────────────────────────────────────

/**
 * Simulate one half-inning.
 * Returns: { runs, playLog, nextLineupIdx, pitchCount }
 */
function simHalfInning(opts) {
  const {
    lineup,          // array of batter IDs (9)
    lineupStartIdx,  // current batting order position
    pitcher,         // pitcher player object
    bullpenFn,       // fn() → next reliever (or null)
    playerMap,       // id → player object
    rng,
    teamId,          // batting team
    inning,
    isBottom,
    gameStats,       // { batting: {pid: stats}, pitching: {pid: stats} }
  } = opts;

  let outs = 0;
  let runs = 0;
  let bases = [null, null, null]; // [1B, 2B, 3B]
  let lineupIdx = lineupStartIdx;
  let currentPitcher = pitcher;
  let pitchCount = opts.startPitchCount || 0;
  const usedPitchers = opts.usedPitchers || new Set();
  usedPitchers.add(currentPitcher.id);
  // Once a relief attempt fails (bullpen exhausted), stop re-checking every at-bat.
  // This prevents an over-extended RP from triggering the check on every pitch.
  let replacementAttempted = false;

  const playLog = [];

  // Track pitching stats for this half-inning
  function getPitStats(pid) {
    if (!gameStats.pitching[pid]) {
      gameStats.pitching[pid] = { ip: 0, h: 0, r: 0, er: 0, bb: 0, k: 0, hr: 0, pitches: 0, gamesStarted: 0 };
    }
    return gameStats.pitching[pid];
  }
  function getBatStats(pid) {
    if (!gameStats.batting[pid]) {
      gameStats.batting[pid] = { ab: 0, h: 0, '2b': 0, '3b': 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, hbp: 0, sac: 0, lob: 0 };
    }
    return gameStats.batting[pid];
  }

  // Pitcher stamina threshold — differentiated by role
  // Starters: ~65–75 pitches (5–6 innings). Relievers: ~12–16 pitches (1 inning).
  function calcThreshold(pitcher) {
    const isRP = pitcher.position === 'RP';
    const isTWP = pitcher.position === 'TWP';
    if (isRP)  return 8  + (pitcher.pitching.stamina || 50) * 0.08;  // ~12–16 pitches
    if (isTWP) return 15 + (pitcher.pitching.stamina || 60) * 0.12;  // ~22–27 pitches (2 inn)
    return       45 + (pitcher.pitching.stamina || 70) * 0.30;       // ~66–75 pitches (5–6 inn)
  }
  let staminaThreshold = calcThreshold(currentPitcher);

  while (outs < 3) {
    // ── Pitching change ──────────────────────────────────────────────────────
    // SP also pulled in the 7th inning or later if they've thrown 50+ pitches.
    // replacementAttempted: once bullpenFn returns null, stop retrying every at-bat.
    const spLateGame = currentPitcher.position === 'SP' && inning >= 7 && pitchCount >= 50;
    if (!replacementAttempted && (pitchCount >= staminaThreshold || spLateGame)) {
      const reliever = bullpenFn(usedPitchers);
      if (reliever) {
        currentPitcher = reliever;
        pitchCount = 0;
        staminaThreshold = calcThreshold(reliever);
        usedPitchers.add(reliever.id);
        replacementAttempted = false; // reset — new pitcher may need their own change later
      } else {
        replacementAttempted = true; // no one available — stop checking this inning
      }
    }

    const batterId = lineup[lineupIdx % 9];
    lineupIdx++;
    const batter = playerMap[batterId];
    if (!batter) { continue; }

    const li = runs === 0 ? 1.0 : Math.max(0.5, 3.0 / (Math.abs(runs) + 1));
    const result = resolveAtBat(batter, currentPitcher, rng, pitchCount, li);
    pitchCount += result.pitches || 3;

    const adv = advanceBases(bases, result, batterId, outs, rng);
    bases = adv.newBases;
    runs += adv.runsScored;
    outs += adv.outsAdded;

    // ── Update box score stats ───────────────────────────────────────────────
    const batStats = getBatStats(batterId);
    const pitStats = getPitStats(currentPitcher.id);

    pitStats.pitches += result.pitches || 3;

    switch (result.type) {
      case 'BB':
        batStats.bb++;
        pitStats.bb++;
        playLog.push(`${batter.name} walks`);
        break;
      case 'HBP':
        batStats.hbp++;
        pitStats.bb++; // treated as walk for ERA purposes
        playLog.push(`${batter.name} hit by pitch`);
        break;
      case 'K':
        batStats.ab++;
        batStats.k++;
        pitStats.k++;
        pitStats.ip += (1/3);
        playLog.push(`${batter.name} strikes out`);
        break;
      case 'HR':
        batStats.ab++;
        batStats.h++;
        batStats.hr++;
        batStats.rbi += adv.rbiCount;
        pitStats.h++;
        pitStats.r  += adv.runsScored;
        pitStats.er += adv.runsScored;
        pitStats.hr++;
        pitStats.ip += (1/3);
        playLog.push(`${batter.name} homers! (${adv.runsScored} run${adv.runsScored !== 1 ? 's' : ''})`);
        break;
      case '1B':
        batStats.ab++;
        batStats.h++;
        batStats.rbi += adv.rbiCount;
        pitStats.h++;
        pitStats.r  += adv.runsScored;
        pitStats.er += adv.runsScored;
        pitStats.ip += (1/3);
        playLog.push(`${batter.name} singles${adv.runsScored > 0 ? `, ${adv.runsScored} score` : ''}`);
        break;
      case '2B':
        batStats.ab++;
        batStats.h++;
        batStats['2b']++;
        batStats.rbi += adv.rbiCount;
        pitStats.h++;
        pitStats.r  += adv.runsScored;
        pitStats.er += adv.runsScored;
        pitStats.ip += (1/3);
        playLog.push(`${batter.name} doubles${adv.runsScored > 0 ? `, ${adv.runsScored} score` : ''}`);
        break;
      case '3B':
        batStats.ab++;
        batStats.h++;
        batStats['3b']++;
        batStats.rbi += adv.rbiCount;
        pitStats.h++;
        pitStats.r  += adv.runsScored;
        pitStats.er += adv.runsScored;
        pitStats.ip += (1/3);
        playLog.push(`${batter.name} triples! ${adv.runsScored} score`);
        break;
      case 'GO':
        batStats.ab++;
        if (adv.outsAdded === 2) {
          playLog.push(`${batter.name} into a double play`);
        } else {
          playLog.push(`${batter.name} grounds out${adv.runsScored > 0 ? ` (run scores)` : ''}`);
        }
        pitStats.ip += (adv.outsAdded / 3);
        if (adv.runsScored > 0) { pitStats.r += adv.runsScored; pitStats.er += adv.runsScored; }
        break;
      case 'FO':
        batStats.ab++;
        if (adv.rbiCount > 0) batStats.sac++;
        if (adv.rbiCount > 0) batStats.rbi++;
        pitStats.ip += (1/3);
        if (adv.runsScored > 0) { pitStats.r += adv.runsScored; pitStats.er += adv.runsScored; }
        playLog.push(`${batter.name} flies out${adv.runsScored > 0 ? ` (sac fly)` : ''}`);
        break;
      case 'LO':
        batStats.ab++;
        pitStats.ip += (1/3);
        playLog.push(`${batter.name} lines out`);
        break;
    }
  }

  return {
    runs,
    playLog,
    nextLineupIdx: lineupIdx % 9,
    pitchCount,
    usedPitchers,
    lastPitcherId: currentPitcher.id,
  };
}

// ── Full game simulation ─────────────────────────────────────────────────────

/**
 * Simulate a full game between two teams.
 * @param {string} homeId - home team ID
 * @param {string} awayId - away team ID
 * @param {object} playerMap - id → player object
 * @param {object} teamGameCounts - teamId → number of games played (for rotation)
 * @param {string} gameId
 * @returns {object} GameResult
 */
function simulateGame(homeId, awayId, playerMap, teamGameCounts, gameId, seasonStats) {
  const seed = makeSeed(gameId || `${homeId}_${awayId}_${Date.now()}`);
  const rng = new SeededRNG(seed);

  // Build lineups
  const homeStarter = getStartingPitcher(homeId, playerMap, teamGameCounts[homeId] || 0, seasonStats);
  const awayStarter = getStartingPitcher(awayId, playerMap, teamGameCounts[awayId] || 0, seasonStats);

  if (!homeStarter || !awayStarter) {
    // Fallback if no pitchers
    const homeScore = rng.int(2, 7);
    const awayScore = rng.int(2, 7);
    return buildFallbackResult(homeId, awayId, homeScore, awayScore, gameId);
  }

  const homeLineup = buildLineup(homeId, playerMap, awayStarter.throws);
  const awayLineup = buildLineup(awayId, playerMap, homeStarter.throws);

  if (homeLineup.length < 9 || awayLineup.length < 9) {
    const homeScore = rng.int(2, 7);
    const awayScore = rng.int(2, 7);
    return buildFallbackResult(homeId, awayId, homeScore, awayScore, gameId);
  }

  let homeScore = 0, awayScore = 0;
  let homeLineupIdx = 0, awayLineupIdx = 0;

  // Track current pitcher + accumulated pitch count across innings
  // HOME team pitches in TOP half (vs away batters)
  // AWAY team pitches in BOTTOM half (vs home batters)
  let homePitcher = homeStarter;   // home team's current pitcher
  let awayPitcher = awayStarter;   // away team's current pitcher
  let homePitchCount = 0;          // pitch count for home pitcher (carries across innings)
  let awayPitchCount = 0;          // pitch count for away pitcher
  const homeUsedPitchers = new Set([homeStarter.id]);
  const awayUsedPitchers = new Set([awayStarter.id]);

  const gameStats = { batting: {}, pitching: {} };
  // Mark starters
  if (!gameStats.pitching[homeStarter.id]) gameStats.pitching[homeStarter.id] = { ip:0,h:0,r:0,er:0,bb:0,k:0,hr:0,pitches:0,gamesStarted:1 };
  else gameStats.pitching[homeStarter.id].gamesStarted = 1;
  if (!gameStats.pitching[awayStarter.id]) gameStats.pitching[awayStarter.id] = { ip:0,h:0,r:0,er:0,bb:0,k:0,hr:0,pitches:0,gamesStarted:1 };
  else gameStats.pitching[awayStarter.id].gamesStarted = 1;

  const inningScores = []; // [{top, bot}]
  const playByPlay = [];

  // Hard per-game IP cap: prevents any pitcher from throwing an unrealistic
  // number of innings in a single game regardless of bullpen availability.
  // Starters: 8 IP max. Non-starters (RP/TWP emergency): 3 IP max.
  // Checked between innings so a reliever can't quietly accumulate 5+ innings.
  function capPitcherBetweenInnings(pitcher, usedPitchers, teamId) {
    const curIP = gameStats.pitching[pitcher.id]?.ip || 0;
    // Use gamesStarted (set only for the actual game starter) to distinguish
    // true starters from emergency SPs. When an SP is used as an emergency
    // reliever, playerMap lookup restores their SP position but gamesStarted=0,
    // so they correctly get the 3-IP relief cap, not the 8-IP starter cap.
    const startedThisGame = (gameStats.pitching[pitcher.id]?.gamesStarted || 0) === 1;
    const maxIP = startedThisGame ? 8.0 : 3.0;
    if (curIP < maxIP) return pitcher; // still within limit
    const relief = getBullpenPitcher(teamId, playerMap, usedPitchers, seasonStats, rng);
    if (relief) {
      usedPitchers.add(relief.id);
      return relief;
    }
    return pitcher; // no one available — accept the overage
  }

  for (let inning = 1; inning <= 9 || homeScore === awayScore; inning++) {
    // Safety valve — cap extra innings at 12
    if (inning > 12) break;

    const inningObj = { top: 0, bot: 0 };

    // Between-inning cap check for home pitcher (pitches top half)
    if (inning > 1) {
      const prevHomeId = homePitcher.id;
      homePitcher = capPitcherBetweenInnings(homePitcher, homeUsedPitchers, homeId);
      if (homePitcher.id !== prevHomeId) homePitchCount = 0;
    }

    // ── Top half — AWAY bats, HOME team PITCHES ──────────────────────────────
    const topResult = simHalfInning({
      lineup:          awayLineup,
      lineupStartIdx:  awayLineupIdx,
      pitcher:         homePitcher,        // ← HOME pitcher faces away batters
      bullpenFn:       (used) => getBullpenPitcher(homeId, playerMap, used, seasonStats, rng),
      playerMap,
      rng,
      teamId:          awayId,
      inning,
      isBottom:        false,
      gameStats,
      startPitchCount: homePitchCount,     // ← carry pitch count across innings
      usedPitchers:    homeUsedPitchers,
    });

    awayScore += topResult.runs;
    awayLineupIdx = topResult.nextLineupIdx;
    // Update home pitcher state — topResult.pitchCount already reflects the
    // new pitcher's count since entering (simHalfInning resets to 0 on change)
    homePitchCount = topResult.pitchCount;
    if (topResult.lastPitcherId !== homePitcher.id) {
      homePitcher = playerMap[topResult.lastPitcherId] || homePitcher;
      // NOTE: do NOT reset homePitchCount here — topResult.pitchCount already
      // tracks only the new pitcher's pitches since they entered
    }
    homeUsedPitchers.add(topResult.lastPitcherId);
    inningObj.top = topResult.runs;

    for (const p of topResult.playLog) playByPlay.push(`T${inning}: ${p}`);

    // Walk-off check: if home is winning after bottom of 9+, skip bottom
    if (inning >= 9 && homeScore > awayScore) {
      inningScores.push(inningObj);
      break;
    }

    // Between-inning cap check for away pitcher (pitches bottom half)
    const prevAwayId = awayPitcher.id;
    awayPitcher = capPitcherBetweenInnings(awayPitcher, awayUsedPitchers, awayId);
    if (awayPitcher.id !== prevAwayId) awayPitchCount = 0;

    // ── Bottom half — HOME bats, AWAY team PITCHES ───────────────────────────
    const botResult = simHalfInning({
      lineup:          homeLineup,
      lineupStartIdx:  homeLineupIdx,
      pitcher:         awayPitcher,        // ← AWAY pitcher faces home batters
      bullpenFn:       (used) => getBullpenPitcher(awayId, playerMap, used, seasonStats, rng),
      playerMap,
      rng,
      teamId:          homeId,
      inning,
      isBottom:        true,
      gameStats,
      startPitchCount: awayPitchCount,     // ← carry pitch count across innings
      usedPitchers:    awayUsedPitchers,
    });

    homeScore += botResult.runs;
    homeLineupIdx = botResult.nextLineupIdx;
    awayPitchCount = botResult.pitchCount;
    if (botResult.lastPitcherId !== awayPitcher.id) {
      awayPitcher = playerMap[botResult.lastPitcherId] || awayPitcher;
      // NOTE: do NOT reset awayPitchCount — already reflects new pitcher's count
    }
    awayUsedPitchers.add(botResult.lastPitcherId);
    inningObj.bot = botResult.runs;

    for (const p of botResult.playLog) playByPlay.push(`B${inning}: ${p}`);

    inningScores.push(inningObj);

    // Walk-off: home leads after their half of inning 9+
    if (inning >= 9 && homeScore > awayScore) break;
  }

  // Ensure no tie (extra-innings edge case)
  if (homeScore === awayScore) {
    if (rng.chance(0.5)) homeScore++; else awayScore++;
  }

  // Determine WP/LP
  const homeWin = homeScore > awayScore;
  const winningTeam = homeWin ? homeId : awayId;
  const losingTeam  = homeWin ? awayId : homeId;

  // WP: give win to the starter if they pitched >= 5 innings (15 outs = ip >= 5.0),
  //     otherwise give it to the first reliever used.
  // LP: give loss to the starter if they pitched >=1 inning, else the last reliever.
  function pickWinningPitcher(starterObj, usedSet) {
    const starterId = starterObj.id;
    const starterStats = gameStats.pitching[starterId];
    if (starterStats && starterStats.ip >= 5.0) return starterId;
    // Otherwise credit the first reliever (non-starter) used
    for (const pid of usedSet) {
      if (pid !== starterId) return pid;
    }
    return starterId; // fallback
  }
  function pickLosingPitcher(starterObj, usedSet) {
    const starterId = starterObj.id;
    const starterStats = gameStats.pitching[starterId];
    if (starterStats && starterStats.ip >= 1.0) return starterId;
    for (const pid of usedSet) {
      if (pid !== starterId) return pid;
    }
    return starterId;
  }

  const wpId = homeWin
    ? pickWinningPitcher(homeStarter, homeUsedPitchers)
    : pickWinningPitcher(awayStarter, awayUsedPitchers);
  const lpId = homeWin
    ? pickLosingPitcher(awayStarter, awayUsedPitchers)
    : pickLosingPitcher(homeStarter, homeUsedPitchers);

  if (wpId && gameStats.pitching[wpId]) gameStats.pitching[wpId].wins = 1;
  if (lpId && gameStats.pitching[lpId]) gameStats.pitching[lpId].losses = 1;

  // Mark batters who scored
  // (RBIs tracked during advanceBases; runs tracked here)
  for (const teamLineup of [homeLineup, awayLineup]) {
    for (const pid of teamLineup) {
      if (!gameStats.batting[pid]) gameStats.batting[pid] = { ab: 0, h: 0, '2b': 0, '3b': 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, hbp: 0, sac: 0 };
    }
  }

  return {
    gameId,
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore,
    awayScore,
    inningScores,
    winningTeam,
    losingTeam,
    wpId,
    lpId,
    playByPlay: playByPlay.slice(0, 80), // cap for storage
    gameStats, // { batting: {pid: {...}}, pitching: {pid: {...}} }
    innings: inningScores.length,
    status: 'completed',
  };
}

function buildFallbackResult(homeId, awayId, homeScore, awayScore, gameId) {
  return {
    gameId,
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore,
    awayScore,
    inningScores: [],
    winningTeam: homeScore >= awayScore ? homeId : awayId,
    losingTeam:  homeScore >= awayScore ? awayId : homeId,
    wpId: null, lpId: null,
    playByPlay: ['Game simulated (no pitchers found)'],
    gameStats: { batting: {}, pitching: {} },
    innings: 9,
    status: 'completed',
  };
}

window.simulateGame         = simulateGame;
window.buildLineup          = buildLineup;
window.getStartingPitcher   = getStartingPitcher;
window.getBullpenPitcher    = getBullpenPitcher;
