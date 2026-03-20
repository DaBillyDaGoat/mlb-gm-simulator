/**
 * Season Engine
 * Schedule generation, standings, stats accumulation
 */
'use strict';

// ── Team metadata ────────────────────────────────────────────────────────────
const TEAMS_META = [
  { id:'NYY', name:'Yankees',       city:'New York',       full:'New York Yankees',       league:'AL', division:'East',    primary:'#003087', secondary:'#FFFFFF', budget:280000 },
  { id:'BOS', name:'Red Sox',       city:'Boston',         full:'Boston Red Sox',          league:'AL', division:'East',    primary:'#BD3039', secondary:'#0C2340', budget:200000 },
  { id:'BAL', name:'Orioles',       city:'Baltimore',      full:'Baltimore Orioles',        league:'AL', division:'East',    primary:'#DF4601', secondary:'#000000', budget:150000 },
  { id:'TBR', name:'Rays',          city:'Tampa Bay',      full:'Tampa Bay Rays',           league:'AL', division:'East',    primary:'#092C5C', secondary:'#8FBCE6', budget:100000 },
  { id:'TOR', name:'Blue Jays',     city:'Toronto',        full:'Toronto Blue Jays',        league:'AL', division:'East',    primary:'#134A8E', secondary:'#E8291C', budget:180000 },
  { id:'CWS', name:'White Sox',     city:'Chicago',        full:'Chicago White Sox',        league:'AL', division:'Central', primary:'#27251F', secondary:'#C4CED4', budget:120000 },
  { id:'CLE', name:'Guardians',     city:'Cleveland',      full:'Cleveland Guardians',      league:'AL', division:'Central', primary:'#E31937', secondary:'#0C2340', budget:130000 },
  { id:'DET', name:'Tigers',        city:'Detroit',        full:'Detroit Tigers',           league:'AL', division:'Central', primary:'#0C2340', secondary:'#FA4616', budget:140000 },
  { id:'KCR', name:'Royals',        city:'Kansas City',    full:'Kansas City Royals',       league:'AL', division:'Central', primary:'#004687', secondary:'#C09A5B', budget:110000 },
  { id:'MIN', name:'Twins',         city:'Minnesota',      full:'Minnesota Twins',          league:'AL', division:'Central', primary:'#002B5C', secondary:'#D31145', budget:145000 },
  { id:'OAK', name:'Athletics',     city:'Oakland',        full:'Athletics',                league:'AL', division:'West',    primary:'#003831', secondary:'#EFB21E', budget:80000  },
  { id:'HOU', name:'Astros',        city:'Houston',        full:'Houston Astros',           league:'AL', division:'West',    primary:'#002D62', secondary:'#EB6E1F', budget:210000 },
  { id:'LAA', name:'Angels',        city:'Los Angeles',    full:'Los Angeles Angels',       league:'AL', division:'West',    primary:'#BA0021', secondary:'#003263', budget:170000 },
  { id:'SEA', name:'Mariners',      city:'Seattle',        full:'Seattle Mariners',         league:'AL', division:'West',    primary:'#0C2C56', secondary:'#005C5C', budget:160000 },
  { id:'TEX', name:'Rangers',       city:'Texas',          full:'Texas Rangers',            league:'AL', division:'West',    primary:'#003278', secondary:'#C0111F', budget:190000 },
  { id:'ATL', name:'Braves',        city:'Atlanta',        full:'Atlanta Braves',           league:'NL', division:'East',    primary:'#CE1141', secondary:'#13274F', budget:220000 },
  { id:'MIA', name:'Marlins',       city:'Miami',          full:'Miami Marlins',            league:'NL', division:'East',    primary:'#00A3E0', secondary:'#EF3340', budget:90000  },
  { id:'NYM', name:'Mets',          city:'New York',       full:'New York Mets',            league:'NL', division:'East',    primary:'#002D72', secondary:'#FF5910', budget:260000 },
  { id:'PHI', name:'Phillies',      city:'Philadelphia',   full:'Philadelphia Phillies',    league:'NL', division:'East',    primary:'#E81828', secondary:'#002D72', budget:240000 },
  { id:'WSN', name:'Nationals',     city:'Washington',     full:'Washington Nationals',     league:'NL', division:'East',    primary:'#AB0003', secondary:'#14225A', budget:120000 },
  { id:'CHC', name:'Cubs',          city:'Chicago',        full:'Chicago Cubs',             league:'NL', division:'Central', primary:'#0E3386', secondary:'#CC3433', budget:190000 },
  { id:'CIN', name:'Reds',          city:'Cincinnati',     full:'Cincinnati Reds',          league:'NL', division:'Central', primary:'#C6011F', secondary:'#000000', budget:120000 },
  { id:'MIL', name:'Brewers',       city:'Milwaukee',      full:'Milwaukee Brewers',        league:'NL', division:'Central', primary:'#12284B', secondary:'#FFC52F', budget:130000 },
  { id:'PIT', name:'Pirates',       city:'Pittsburgh',     full:'Pittsburgh Pirates',       league:'NL', division:'Central', primary:'#27251F', secondary:'#FDB827', budget:90000  },
  { id:'STL', name:'Cardinals',     city:'St. Louis',      full:'St. Louis Cardinals',      league:'NL', division:'Central', primary:'#C41E3A', secondary:'#FEDB00', budget:180000 },
  { id:'ARI', name:'Diamondbacks',  city:'Arizona',        full:'Arizona Diamondbacks',     league:'NL', division:'West',    primary:'#A71930', secondary:'#E3D4AD', budget:155000 },
  { id:'COL', name:'Rockies',       city:'Colorado',       full:'Colorado Rockies',         league:'NL', division:'West',    primary:'#333366', secondary:'#C4CED4', budget:130000 },
  { id:'LAD', name:'Dodgers',       city:'Los Angeles',    full:'Los Angeles Dodgers',      league:'NL', division:'West',    primary:'#005A9C', secondary:'#EF3E42', budget:350000 },
  { id:'SDP', name:'Padres',        city:'San Diego',      full:'San Diego Padres',         league:'NL', division:'West',    primary:'#2F241D', secondary:'#FFC425', budget:200000 },
  { id:'SFG', name:'Giants',        city:'San Francisco',  full:'San Francisco Giants',     league:'NL', division:'West',    primary:'#FD5A1E', secondary:'#27251F', budget:165000 },
];

// ── Schedule Generation ──────────────────────────────────────────────────────

/**
 * Generate a 162-game schedule for all 30 teams.
 * Uses series-based scheduling:
 *  - Division rivals: 13 games each (4 opponents = 52)
 *  - Same-league, diff-division: 7 games each (10 opponents = 70) -- ~66 in reality
 *  - Interleague: 3-4 games each (fills to ~162)
 *
 * Returns an array of game objects assigned to days 1–183.
 */
function generateSchedule(teams) {
  const teamIds = teams.map(t => t.id);

  // Build matchup list { t1, t2, gamesLeft, home1 }
  const matchups = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const t1 = teams[i], t2 = teams[j];
      let totalGames;

      if (t1.league === t2.league && t1.division === t2.division) {
        totalGames = 13;
      } else if (t1.league === t2.league) {
        totalGames = 7;
      } else {
        totalGames = 3; // Interleague
      }

      // Alternate which team is home for the series
      matchups.push({ t1: t1.id, t2: t2.id, total: totalGames, gamesLeft: totalGames, homeIsT1: true });
    }
  }

  // Build team game counts and assign days
  const teamDayAssigned = {}; // teamId → Set of days assigned
  for (const id of teamIds) teamDayAssigned[id] = new Set();

  const games = [];
  let gameNum = 1;
  let day = 1;

  // Series structure: play games in 3-game or 4-game series
  const pendingMatchups = [...matchups];

  // Shuffle matchups for variety
  for (let i = pendingMatchups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pendingMatchups[i], pendingMatchups[j]] = [pendingMatchups[j], pendingMatchups[i]];
  }

  // Sort division games first for early-season realism
  pendingMatchups.sort((a, b) => {
    const aDiv = getRelType(a.t1, a.t2, teams);
    const bDiv = getRelType(b.t1, b.t2, teams);
    return aDiv - bDiv;
  });

  // Assign games to days greedily
  let maxDay = 182; // ~6 months of season

  for (const m of pendingMatchups) {
    let seriesStart = day;
    let remaining = m.total;
    let homeTeam = m.homeIsT1 ? m.t1 : m.t2;
    let awayTeam = m.homeIsT1 ? m.t2 : m.t1;

    while (remaining > 0) {
      const seriesLen = Math.min(remaining, 3);

      // Find a run of 'seriesLen' consecutive days where both teams are free
      let placed = false;
      for (let d = seriesStart; d <= maxDay - seriesLen + 1 && !placed; d++) {
        let canPlace = true;
        for (let k = 0; k < seriesLen; k++) {
          if (teamDayAssigned[homeTeam].has(d + k) || teamDayAssigned[awayTeam].has(d + k)) {
            canPlace = false;
            break;
          }
        }
        if (canPlace) {
          for (let k = 0; k < seriesLen; k++) {
            const gDay = d + k;
            teamDayAssigned[homeTeam].add(gDay);
            teamDayAssigned[awayTeam].add(gDay);
            games.push({
              gameId:     `2026_${String(gameNum).padStart(4,'0')}`,
              day:        gDay,
              week:       Math.ceil(gDay / 7),
              homeTeamId: homeTeam,
              awayTeamId: awayTeam,
              status:     'scheduled',
              result:     null,
            });
            gameNum++;
          }
          seriesStart = d + seriesLen + 1; // Leave a gap
          placed = true;
          remaining -= seriesLen;

          // Flip home/away for next series
          [homeTeam, awayTeam] = [awayTeam, homeTeam];
        }
      }
      if (!placed) {
        // Just assign to any available day (fallback)
        for (let d = 1; d <= maxDay && remaining > 0; d++) {
          if (!teamDayAssigned[homeTeam].has(d) && !teamDayAssigned[awayTeam].has(d)) {
            teamDayAssigned[homeTeam].add(d);
            teamDayAssigned[awayTeam].add(d);
            games.push({
              gameId:     `2026_${String(gameNum).padStart(4,'0')}`,
              day:        d,
              week:       Math.ceil(d / 7),
              homeTeamId: homeTeam,
              awayTeamId: awayTeam,
              status:     'scheduled',
              result:     null,
            });
            gameNum++;
            remaining--;
          }
        }
        break;
      }
    }
  }

  // Sort by day
  games.sort((a, b) => a.day - b.day);
  return games;
}

function getRelType(t1Id, t2Id, teams) {
  const t1 = teams.find(t => t.id === t1Id);
  const t2 = teams.find(t => t.id === t2Id);
  if (!t1 || !t2) return 2;
  if (t1.league === t2.league && t1.division === t2.division) return 0;
  if (t1.league === t2.league) return 1;
  return 2;
}

// ── Standings ────────────────────────────────────────────────────────────────

/**
 * Calculate division standings from team records.
 * teamRecords: { teamId: { wins, losses, runsFor, runsAgainst, streak } }
 */
function calculateStandings(teamRecords, teams) {
  const standingsMap = {};

  for (const team of teams) {
    const rec = teamRecords[team.id] || { wins: 0, losses: 0, runsFor: 0, runsAgainst: 0, streak: { type: 'W', count: 0 } };
    const gp = rec.wins + rec.losses;
    standingsMap[team.id] = {
      teamId:    team.id,
      name:      team.name,
      full:      team.full,
      league:    team.league,
      division:  team.division,
      wins:      rec.wins,
      losses:    rec.losses,
      pct:       gp > 0 ? rec.wins / gp : 0,
      gb:        0,
      rs:        rec.runsFor    || 0,
      ra:        rec.runsAgainst || 0,
      rdiff:     (rec.runsFor || 0) - (rec.runsAgainst || 0),
      streak:    rec.streak || { type: 'W', count: 0 },
      gamesPlayed: gp,
    };
  }

  // Calculate GB per division
  const divisions = [
    { league: 'AL', div: 'East' },
    { league: 'AL', div: 'Central' },
    { league: 'AL', div: 'West' },
    { league: 'NL', div: 'East' },
    { league: 'NL', div: 'Central' },
    { league: 'NL', div: 'West' },
  ];

  for (const { league, div } of divisions) {
    const divTeams = Object.values(standingsMap)
      .filter(t => t.league === league && t.division === div)
      .sort((a, b) => b.pct - a.pct || b.wins - a.wins);

    if (divTeams.length === 0) continue;
    const leader = divTeams[0];
    leader.gb = 0;

    for (let i = 1; i < divTeams.length; i++) {
      const t = divTeams[i];
      t.gb = ((leader.wins - t.wins) + (t.losses - leader.losses)) / 2;
    }
  }

  return standingsMap;
}

// ── Stats Accumulation ───────────────────────────────────────────────────────

function initSeasonStats() {
  return {
    batting: {},   // playerId → BattingStats
    pitching: {},  // playerId → PitchingStats
  };
}

function emptyBattingStats() {
  return { g:0, ab:0, h:0, '2b':0, '3b':0, hr:0, rbi:0, r:0, bb:0, k:0, hbp:0, sac:0, sb:0, cs:0 };
}

function emptyPitchingStats() {
  return { g:0, gs:0, w:0, l:0, sv:0, ip:0, h:0, r:0, er:0, bb:0, k:0, hr:0, pitches:0 };
}

/**
 * Merge game stats into cumulative season stats.
 */
function applyGameStats(seasonStats, gameResult) {
  const { gameStats } = gameResult;

  // Batting
  for (const [pid, gs] of Object.entries(gameStats.batting)) {
    if (!seasonStats.batting[pid]) seasonStats.batting[pid] = emptyBattingStats();
    const s = seasonStats.batting[pid];
    s.g++;
    s.ab  += gs.ab  || 0;
    s.h   += gs.h   || 0;
    s['2b'] += gs['2b'] || 0;
    s['3b'] += gs['3b'] || 0;
    s.hr  += gs.hr  || 0;
    s.rbi += gs.rbi || 0;
    s.r   += gs.r   || 0;
    s.bb  += gs.bb  || 0;
    s.k   += gs.k   || 0;
    s.hbp += gs.hbp || 0;
    s.sac += gs.sac || 0;
    s.sb  += gs.sb  || 0;
    s.cs  += gs.cs  || 0;
  }

  // Pitching
  for (const [pid, gs] of Object.entries(gameStats.pitching)) {
    if (!seasonStats.pitching[pid]) seasonStats.pitching[pid] = emptyPitchingStats();
    const s = seasonStats.pitching[pid];
    s.g++;
    if (gs.gamesStarted) s.gs++;
    s.w   += gs.wins   || 0;
    s.l   += gs.losses || 0;
    s.sv  += gs.sv     || 0;
    s.ip  += gs.ip  || 0;
    s.h   += gs.h   || 0;
    s.r   += gs.r   || 0;
    s.er  += gs.er  || 0;
    s.bb  += gs.bb  || 0;
    s.k   += gs.k   || 0;
    s.hr  += gs.hr  || 0;
    s.pitches += gs.pitches || 0;
  }
}

// ── Computed stat helpers ────────────────────────────────────────────────────

function calcAVG(s)  { return s.ab > 0 ? (s.h / s.ab).toFixed(3).replace('0.', '.') : '.000'; }
function calcOBP(s)  { const pa = s.ab + s.bb + s.hbp + s.sac; return pa > 0 ? ((s.h + s.bb + s.hbp) / pa).toFixed(3).replace('0.', '.') : '.000'; }
function calcSLG(s)  { if (s.ab === 0) return '.000'; const tb = s.h + s['2b'] + s['3b']*2 + s.hr*3; return (tb / s.ab).toFixed(3).replace('0.', '.'); }
function calcOPS(s)  { const obp = parseFloat('0' + calcOBP(s)); const slg = parseFloat('0' + calcSLG(s)); return (obp + slg).toFixed(3).replace('0.','.'); }
function calcERA(s)  { return s.ip > 0 ? ((s.er * 9) / s.ip).toFixed(2) : '0.00'; }
function calcWHIP(s) { return s.ip > 0 ? ((s.bb + s.h) / s.ip).toFixed(2) : '0.00'; }
function fmtIP(ip)   {
  const full = Math.floor(ip);
  const frac = ip - full;
  const thirds = Math.round(frac * 3);
  return thirds === 0 ? `${full}.0` : `${full}.${thirds}`;
}
function streakStr(streak) {
  if (!streak) return 'W1';
  return `${streak.type}${streak.count}`;
}

// ── League Leaders ────────────────────────────────────────────────────────────

function getLeaders(seasonStats, playerMap, n = 10) {
  const hitters = Object.entries(seasonStats.batting)
    .filter(([pid, s]) => s.ab >= 30)
    .map(([pid, s]) => ({
      pid,
      name: playerMap[pid]?.name || pid,
      teamId: playerMap[pid]?.teamId || '?',
      avg: parseFloat('0' + calcAVG(s)) || 0,
      hr:  s.hr,
      rbi: s.rbi,
      r:   s.r,
      h:   s.h,
      sb:  s.sb  || 0,
      cs:  s.cs  || 0,
      ab:  s.ab,
      stats: s,
    }));

  const pitchers = Object.entries(seasonStats.pitching)
    .filter(([pid, s]) => s.ip >= 30)  // ~10 IP min for meaningful ERA
    .map(([pid, s]) => ({
      pid,
      name: playerMap[pid]?.name || pid,
      teamId: playerMap[pid]?.teamId || '?',
      era:  parseFloat(calcERA(s)) || 99,
      w:    s.w,
      k:    s.k,
      sv:   s.sv || 0,
      ip:   s.ip,
      whip: parseFloat(calcWHIP(s)),
      stats: s,
    }));

  // For saves leaders include any pitcher with at least 1 save (relievers may have < 30 IP)
  const relievers = Object.entries(seasonStats.pitching)
    .filter(([pid, s]) => (s.sv || 0) > 0)
    .map(([pid, s]) => ({
      pid,
      name: playerMap[pid]?.name || pid,
      teamId: playerMap[pid]?.teamId || '?',
      sv:   s.sv || 0,
      era:  parseFloat(calcERA(s)) || 99,
      ip:   s.ip,
      stats: s,
    }));

  return {
    avg:  [...hitters].sort((a,b) => b.avg - a.avg).slice(0, n),
    hr:   [...hitters].sort((a,b) => b.hr - a.hr).slice(0, n),
    rbi:  [...hitters].sort((a,b) => b.rbi - a.rbi).slice(0, n),
    r:    [...hitters].sort((a,b) => b.r - a.r).slice(0, n),
    sb:   [...hitters].sort((a,b) => b.sb - a.sb).slice(0, n),
    era:  [...pitchers].sort((a,b) => a.era - b.era).slice(0, n),
    wins: [...pitchers].sort((a,b) => b.w - a.w).slice(0, n),
    k:    [...pitchers].sort((a,b) => b.k - a.k).slice(0, n),
    sv:   [...relievers].sort((a,b) => b.sv - a.sv).slice(0, n),
  };
}

// ── Player Streaks (Hot/Cold) ─────────────────────────────────────────────────

/**
 * Update hot/cold streak state for all players who appeared in today's games.
 * streaks: { pid: { recentHits, recentAB, mod } }
 * gameStatsList: array of gameResult.gameStats objects from today's games.
 *
 * Uses a rolling ~20 AB window. Hot: avg > .370 → +0.03 mod, Cold: avg < .155 → -0.03 mod.
 */
function updatePlayerStreaks(streaks, gameStatsList) {
  const WINDOW = 20;

  for (const gameStats of gameStatsList) {
    for (const [pid, gs] of Object.entries(gameStats.batting)) {
      if (!streaks[pid]) streaks[pid] = { recentHits: 0, recentAB: 0, mod: 0 };
      const s = streaks[pid];

      s.recentHits += gs.h || 0;
      s.recentAB   += gs.ab || 0;

      // Decay rolling window: trim back towards WINDOW ABs
      if (s.recentAB > WINDOW) {
        const ratio = WINDOW / s.recentAB;
        s.recentHits = Math.round(s.recentHits * ratio);
        s.recentAB   = WINDOW;
      }

      // Compute modifier
      if (s.recentAB >= 10) {
        const avg = s.recentHits / s.recentAB;
        s.mod = avg > 0.370 ? 0.03 : avg < 0.155 ? -0.03 : 0;
      } else {
        s.mod = 0;
      }
    }
  }
}

window.TEAMS_META          = TEAMS_META;
window.generateSchedule    = generateSchedule;
window.calculateStandings  = calculateStandings;
window.initSeasonStats     = initSeasonStats;
window.applyGameStats      = applyGameStats;
window.emptyBattingStats   = emptyBattingStats;
window.emptyPitchingStats  = emptyPitchingStats;
window.calcAVG  = calcAVG;
window.calcOBP  = calcOBP;
window.calcSLG  = calcSLG;
window.calcOPS  = calcOPS;
window.calcERA  = calcERA;
window.calcWHIP = calcWHIP;
window.fmtIP    = fmtIP;
window.streakStr = streakStr;
window.getLeaders = getLeaders;
window.updatePlayerStreaks = updatePlayerStreaks;
