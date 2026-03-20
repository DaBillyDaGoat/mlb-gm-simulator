/**
 * Playoff Engine
 * Seeds teams, runs bracket, simulates all series.
 *
 * Format (2022+ MLB):
 *   6 teams per league: 3 division winners (seeds 1-3) + 3 wild cards (seeds 4-6)
 *   Wild Card Series (best of 3): seed 3 vs 6, seed 4 vs 5  (seeds 1 & 2 get byes)
 *   Division Series (best of 5):  seed 1 vs winner(4v5), seed 2 vs winner(3v6)
 *   Championship Series (best of 7)
 *   World Series (best of 7)
 */
'use strict';

/**
 * Determine 6 playoff seeds per league from final standings.
 * Returns { AL: [{teamId, seed, wins, losses, isDivWinner}...], NL: [...] }
 */
function getPlayoffSeeds(teamRecords, teams) {
  const result = {};

  for (const league of ['AL', 'NL']) {
    const leagueTeams = teams.filter(t => t.league === league);
    const divWinners = [];

    for (const div of ['East', 'Central', 'West']) {
      const divTeams = leagueTeams
        .filter(t => t.division === div)
        .map(t => {
          const rec = teamRecords[t.id] || { wins: 0, losses: 0 };
          const gp = rec.wins + rec.losses;
          return { ...t, wins: rec.wins, losses: rec.losses, pct: gp > 0 ? rec.wins / gp : 0 };
        })
        .sort((a, b) => b.pct - a.pct || b.wins - a.wins);
      if (divTeams.length > 0) divWinners.push({ ...divTeams[0], isDivWinner: true });
    }

    // Sort division winners by record to assign seeds 1-3
    divWinners.sort((a, b) => b.pct - a.pct || b.wins - a.wins);
    const divWinnerIds = new Set(divWinners.map(t => t.id));

    // Wild cards: best non-division-winner records, top 3
    const wildCards = leagueTeams
      .filter(t => !divWinnerIds.has(t.id))
      .map(t => {
        const rec = teamRecords[t.id] || { wins: 0, losses: 0 };
        const gp = rec.wins + rec.losses;
        return { ...t, wins: rec.wins, losses: rec.losses, pct: gp > 0 ? rec.wins / gp : 0, isDivWinner: false };
      })
      .sort((a, b) => b.pct - a.pct || b.wins - a.wins)
      .slice(0, 3);

    result[league] = [
      ...divWinners.map((t, i) => ({ teamId: t.id, seed: i + 1, wins: t.wins, losses: t.losses, isDivWinner: true })),
      ...wildCards.map((t, i) => ({ teamId: t.id, seed: i + 4, wins: t.wins, losses: t.losses, isDivWinner: false })),
    ];
  }

  return result;
}

/**
 * Simulate a playoff series between two teams.
 * gamesNeeded: wins required (2=best-of-3, 3=best-of-5, 4=best-of-7)
 * Returns series result object.
 */
function simPlayoffSeries(team1Id, team2Id, playerMap, gamesNeeded, seriesId) {
  if (!team1Id || !team2Id) {
    return { team1: team1Id, team2: team2Id, winner: team1Id, loser: team2Id, t1Wins: gamesNeeded, t2Wins: 0, gameScores: [] };
  }

  const seed = makeSeed(seriesId || `${team1Id}_${team2Id}_po`);
  const rng = new SeededRNG(seed);

  let t1Wins = 0;
  let t2Wins = 0;
  const gameScores = [];
  const gameCounts = {};
  gameCounts[team1Id] = 0;
  gameCounts[team2Id] = 0;

  while (t1Wins < gamesNeeded && t2Wins < gamesNeeded) {
    const gNum = t1Wins + t2Wins;
    // Home field: team1 home for games 1,2,5,7 (0-indexed: 0,1,4,6); team2 home for 3,4,6 (2,3,5)
    const t1Home = gNum < 2 || gNum === 4 || gNum === 6;
    const homeId = t1Home ? team1Id : team2Id;
    const awayId = t1Home ? team2Id : team1Id;

    const gResult = simulateGame(
      homeId, awayId, playerMap,
      gameCounts,
      `${seriesId}_g${gNum + 1}`
    );

    gameCounts[homeId] = (gameCounts[homeId] || 0) + 1;
    gameCounts[awayId] = (gameCounts[awayId] || 0) + 1;

    if (gResult.winningTeam === team1Id) t1Wins++;
    else t2Wins++;

    gameScores.push({
      game: gNum + 1,
      home: homeId,
      away: awayId,
      homeScore: gResult.homeScore,
      awayScore: gResult.awayScore,
      winner: gResult.winningTeam,
    });
  }

  return {
    team1: team1Id,
    team2: team2Id,
    winner: t1Wins >= gamesNeeded ? team1Id : team2Id,
    loser:  t1Wins >= gamesNeeded ? team2Id : team1Id,
    t1Wins,
    t2Wins,
    gameScores,
  };
}

/**
 * Run the full playoff bracket for both leagues + World Series.
 * Returns complete playoff result object stored in state.playoffs.
 */
function runFullPlayoffs(teamRecords, teams, playerMap) {
  const seeds = getPlayoffSeeds(teamRecords, teams);

  const playoffs = {
    seeds,
    AL: null,
    NL: null,
    worldSeries: null,
    champion: null,
  };

  for (const league of ['AL', 'NL']) {
    const s = {};
    for (const sd of seeds[league]) s[sd.seed] = sd.teamId;

    // Validate all 6 seeds exist
    if (!s[1] || !s[2] || !s[3] || !s[4] || !s[5] || !s[6]) {
      console.warn(`${league} playoff seeds incomplete`, s);
    }

    // Wild Card (best of 3): 3 vs 6, 4 vs 5
    const wc1 = simPlayoffSeries(s[3], s[6], playerMap, 2, `${league}_WC1`);
    const wc2 = simPlayoffSeries(s[4], s[5], playerMap, 2, `${league}_WC2`);

    // Division Series (best of 5): 1 vs wc2.winner, 2 vs wc1.winner
    const ds1 = simPlayoffSeries(s[1], wc2.winner, playerMap, 3, `${league}_DS1`);
    const ds2 = simPlayoffSeries(s[2], wc1.winner, playerMap, 3, `${league}_DS2`);

    // Championship Series (best of 7)
    const cs = simPlayoffSeries(ds1.winner, ds2.winner, playerMap, 4, `${league}_CS`);

    playoffs[league] = {
      wildCard: [wc1, wc2],
      divisionSeries: [ds1, ds2],
      championshipSeries: cs,
      champion: cs.winner,
    };
  }

  // World Series (best of 7): AL champ vs NL champ
  const ws = simPlayoffSeries(playoffs.AL.champion, playoffs.NL.champion, playerMap, 4, 'WS');
  playoffs.worldSeries = ws;
  playoffs.champion = ws.winner;

  return playoffs;
}

/**
 * Format a series result for display.
 * e.g. "NYY def. BOS 3-1"
 */
function seriesSummary(series, teamsMeta) {
  if (!series) return '—';
  const w = teamsMeta.find(t => t.id === series.winner);
  const l = teamsMeta.find(t => t.id === series.loser);
  const wName = w ? w.name : series.winner;
  const lName = l ? l.name : series.loser;
  const wWins = series.winner === series.team1 ? series.t1Wins : series.t2Wins;
  const lWins = series.winner === series.team1 ? series.t2Wins : series.t1Wins;
  return `${wName} def. ${lName} ${wWins}–${lWins}`;
}

window.getPlayoffSeeds    = getPlayoffSeeds;
window.simPlayoffSeries   = simPlayoffSeries;
window.runFullPlayoffs    = runFullPlayoffs;
window.seriesSummary      = seriesSummary;
