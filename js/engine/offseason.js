/**
 * Offseason Engine
 * Handles: Awards, All-Star Game, Trade Deadline, Free Agency, MLB Draft
 */
'use strict';

// ── Awards ────────────────────────────────────────────────────────────────────

/**
 * Calculate end-of-season awards for both leagues.
 * Returns { AL: { mvp, cyYoung, roy }, NL: { mvp, cyYoung, roy } }
 */
function calculateAwards(seasonStats, playerMap, teams) {
  const awards = {};

  for (const league of ['AL', 'NL']) {
    const leagueTeamIds = new Set(teams.filter(t => t.league === league).map(t => t.id));

    const leagueBatters = Object.entries(seasonStats.batting)
      .filter(([pid, s]) => {
        const p = playerMap[pid];
        return p && leagueTeamIds.has(p.teamId) && s.ab >= 250 &&
               !['SP', 'RP'].includes(p.position);
      })
      .map(([pid, s]) => ({ pid, s, p: playerMap[pid] }));

    const leaguePitchers = Object.entries(seasonStats.pitching)
      .filter(([pid, s]) => {
        const p = playerMap[pid];
        return p && leagueTeamIds.has(p.teamId) && s.ip >= 80;
      })
      .map(([pid, s]) => ({ pid, s, p: playerMap[pid] }));

    // MVP: highest OPS among position players
    const mvpList = [...leagueBatters].sort((a, b) => {
      const aOPS = parseFloat('0' + calcOPS(a.s));
      const bOPS = parseFloat('0' + calcOPS(b.s));
      return bOPS - aOPS;
    });
    const mvp = mvpList[0];

    // Cy Young: lowest ERA (min 80 IP)
    const cyList = [...leaguePitchers].sort((a, b) =>
      parseFloat(calcERA(a.s)) - parseFloat(calcERA(b.s))
    );
    const cy = cyList[0];

    // ROY: best performance, age <= 25
    const rookieBatters = leagueBatters.filter(x => x.p?.age <= 25 && x.s.ab >= 150)
      .sort((a, b) => parseFloat('0' + calcOPS(b.s)) - parseFloat('0' + calcOPS(a.s)));
    const rookiePitchers = leaguePitchers.filter(x => x.p?.age <= 25 && x.s.ip >= 40)
      .sort((a, b) => parseFloat(calcERA(a.s)) - parseFloat(calcERA(b.s)));

    let roy = null;
    if (rookieBatters.length > 0) {
      roy = rookieBatters[0];
    } else if (rookiePitchers.length > 0) {
      roy = rookiePitchers[0];
    }

    awards[league] = {
      mvp:     mvp  ? { playerId: mvp.pid,  name: mvp.p?.name,  teamId: mvp.p?.teamId,  stat: `${calcOPS(mvp.s)} OPS` } : null,
      cyYoung: cy   ? { playerId: cy.pid,   name: cy.p?.name,   teamId: cy.p?.teamId,   stat: `${calcERA(cy.s)} ERA`  } : null,
      roy:     roy  ? { playerId: roy.pid,  name: roy.p?.name,  teamId: roy.p?.teamId,  stat: roy.s.ab >= 150 ? `${calcOPS(roy.s)} OPS` : `${calcERA(roy.s)} ERA` } : null,
    };
  }

  return awards;
}

// ── All-Star Game ─────────────────────────────────────────────────────────────

/**
 * Run the MLB All-Star Game.
 * Selects top performers from each league, sims the game.
 */
function runAllStarGame(seasonStats, playerMap, teams) {
  function selectSquad(league) {
    const ids = new Set(teams.filter(t => t.league === league).map(t => t.id));

    const hitters = Object.entries(seasonStats.batting)
      .filter(([pid, s]) => {
        const p = playerMap[pid];
        return p && ids.has(p.teamId) && s.ab >= 25 && !['SP', 'RP'].includes(p.position);
      })
      .map(([pid, s]) => ({ pid, s, p: playerMap[pid], ops: parseFloat('0' + calcOPS(s)) }))
      .sort((a, b) => b.ops - a.ops)
      .slice(0, 9);

    const startingPitcher = Object.entries(seasonStats.pitching)
      .filter(([pid, s]) => {
        const p = playerMap[pid];
        return p && ids.has(p.teamId) && s.ip >= 15 && (p.position === 'SP' || p.position === 'TWP');
      })
      .map(([pid, s]) => ({ pid, s, p: playerMap[pid], era: parseFloat(calcERA(s)) }))
      .sort((a, b) => a.era - b.era)[0];

    const avgOvr = hitters.length
      ? hitters.reduce((sum, h) => sum + (h.p?.overall || 70), 0) / hitters.length
      : 70;

    return { hitters, startingPitcher, avgOvr };
  }

  const al = selectSquad('AL');
  const nl = selectSquad('NL');

  // Sim the game: weighted coin flip based on team strength
  const alWinProb = al.avgOvr / (al.avgOvr + nl.avgOvr);
  const alWins = Math.random() < alWinProb;

  // Generate realistic scores (1–6 runs)
  const winScore = 3 + Math.floor(Math.random() * 4);
  const loseScore = Math.floor(Math.random() * winScore);

  const alScore = alWins ? winScore : loseScore;
  const nlScore = alWins ? loseScore : winScore;

  const mvpPool = alWins ? al.hitters : nl.hitters;
  const mvpPlayer = mvpPool.length > 0 ? mvpPool[0].p : null;

  return {
    alScore,
    nlScore,
    winner: alWins ? 'AL' : 'NL',
    mvp: mvpPlayer?.name || 'Unknown',
    mvpTeam: mvpPlayer?.teamId || '?',
    alStarter: al.startingPitcher?.p?.name || 'TBD',
    nlStarter: nl.startingPitcher?.p?.name || 'TBD',
    alHitters: al.hitters.slice(0, 5).map(h => h.p?.name || '?'),
    nlHitters: nl.hitters.slice(0, 5).map(h => h.p?.name || '?'),
  };
}

// ── Trade Deadline ────────────────────────────────────────────────────────────

/**
 * Run the trade deadline. Contenders buy, non-contenders sell.
 * Returns array of news strings.
 * Modifies playerMap in-place (changes teamId).
 */
function runTradeDeadline(teamRecords, teams, playerMap) {
  const news = [];
  const MAX_TRADES = 8;

  const contenders = teams.filter(t => {
    const rec = teamRecords[t.id] || { wins: 0, losses: 0 };
    const gp = rec.wins + rec.losses;
    return gp > 40 && rec.wins / gp > 0.500;
  });

  const sellers = teams.filter(t => {
    const rec = teamRecords[t.id] || { wins: 0, losses: 0 };
    const gp = rec.wins + rec.losses;
    return gp > 40 && rec.wins / gp < 0.450;
  });

  if (contenders.length === 0 || sellers.length === 0) return news;

  let tradesCompleted = 0;
  const triedPairs = new Set();

  // Shuffle arrays for variety
  const shuffleArr = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  shuffleArr(contenders);
  shuffleArr(sellers);

  for (let attempt = 0; attempt < 30 && tradesCompleted < MAX_TRADES; attempt++) {
    const buyer  = contenders[attempt % contenders.length];
    const seller = sellers[attempt % sellers.length];
    if (!buyer || !seller || buyer.id === seller.id) continue;

    const pairKey = `${buyer.id}_${seller.id}`;
    if (triedPairs.has(pairKey)) continue;
    triedPairs.add(pairKey);

    // Seller gives a veteran (age 28+, overall 72+, non-SP to keep seller rotation)
    const vets = Object.values(playerMap)
      .filter(p =>
        p.teamId === seller.id &&
        p.age >= 27 &&
        p.overall >= 72 &&
        p.position !== 'SP'
      )
      .sort((a, b) => b.overall - a.overall);

    // Buyer gives a young prospect (age <= 27, overall < 78)
    const prospects = Object.values(playerMap)
      .filter(p =>
        p.teamId === buyer.id &&
        p.age <= 27 &&
        p.overall < 78
      )
      .sort((a, b) => b.overall - a.overall);

    if (vets.length === 0 || prospects.length === 0) continue;

    const vet     = vets[0];
    const prospect = prospects[Math.floor(Math.random() * Math.min(3, prospects.length))];

    // Execute trade
    vet.teamId     = buyer.id;
    prospect.teamId = seller.id;

    news.push(`🔄 TRADE: ${buyer.name} acquire ${vet.name} (${vet.position}, OVR ${vet.overall}) from ${seller.name} for ${prospect.name}`);
    tradesCompleted++;
  }

  if (tradesCompleted === 0) {
    news.push('📋 Trade deadline passed quietly — no major deals completed.');
  }

  return news;
}

// ── Free Agency ───────────────────────────────────────────────────────────────

/**
 * Run offseason free agency.
 * Older / expensive players may opt out and sign elsewhere.
 * Modifies playerMap in-place.
 * Returns array of news strings.
 */
function runFreeAgency(teams, playerMap, teamRecords) {
  const news = [];
  const SIGN_CHANCE = 0.55; // probability a FA signs with a team that needs them

  // Determine free agents: age >= 33, or age >= 30 and salary > 18000 (18M)
  const freeAgents = [];
  for (const player of Object.values(playerMap)) {
    const isFA = player.age >= 33 ||
                 (player.age >= 30 && player.salary > 18000 && Math.random() < 0.30);
    if (isFA && Math.random() < 0.18) { // 18% chance to opt out
      freeAgents.push(player);
    }
  }

  // Sort by overall descending (best players signed first)
  freeAgents.sort((a, b) => b.overall - a.overall);

  // Build team needs: positions they're weakest at
  function getTeamPayroll(teamId) {
    return Object.values(playerMap)
      .filter(p => p.teamId === teamId)
      .reduce((sum, p) => sum + (p.salary || 0), 0);
  }

  for (const fa of freeAgents) {
    const oldTeam = fa.teamId;
    fa.teamId = null; // temporarily unassigned

    // Shuffle teams for fair distribution
    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    let signed = false;
    for (const team of shuffled) {
      if (team.id === oldTeam) continue;

      const payroll = getTeamPayroll(team.id);
      const budget = (team.budget || 150000) * 1; // budget already in thousands ($k)
      if (payroll + fa.salary > budget * 1.15) continue; // over luxury tax threshold

      if (Math.random() < SIGN_CHANCE) {
        fa.teamId = team.id;
        news.push(`✍️ ${fa.name} (${fa.position}, OVR ${fa.overall}) signs with ${team.name}`);
        signed = true;
        break;
      }
    }

    // If nobody signed them, return to original team on a pay cut
    if (!signed) {
      fa.teamId = oldTeam;
    }
  }

  return news;
}

// ── MLB Draft ─────────────────────────────────────────────────────────────────

const PROSPECT_FIRST = ['Jake','Marcus','Tyler','Ryan','Jordan','Connor','Austin','Logan',
  'Dylan','Hunter','Bryce','Cole','Chase','Zach','Trevor','Carson','Blake','Mason','Evan',
  'Nate','Caleb','Owen','Lucas','Elijah','Liam','Noah','Aidan','Caden','Brandon','Derek',
  'Gavin','Ian','Jesse','Kevin','Lance','Miguel','Oscar','Pedro','Quinn','Reid'];

const PROSPECT_LAST = ['Smith','Johnson','Williams','Brown','Davis','Miller','Wilson','Moore',
  'Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Garcia',
  'Martinez','Robinson','Clark','Lewis','Lee','Walker','Hall','Allen','Young','King',
  'Scott','Green','Baker','Adams','Nelson','Hill','Ramirez','Campbell','Mitchell'];

const PROSPECT_POSITIONS = ['SP','SP','RP','C','1B','2B','3B','SS','LF','CF','RF'];

/**
 * Generate a single draft prospect for a team in a given round.
 */
function generateProspect(teamId, round, pickNum) {
  const firstName = PROSPECT_FIRST[Math.floor(Math.random() * PROSPECT_FIRST.length)];
  const lastName  = PROSPECT_LAST[Math.floor(Math.random() * PROSPECT_LAST.length)];
  const name = `${firstName} ${lastName}`;

  // Round 1 = higher baseline, each round drops
  const base = Math.max(42, 68 - (round - 1) * 5 + Math.floor(Math.random() * 14 - 6));
  const age = 18 + Math.floor(Math.random() * 4); // 18–21
  const pos = PROSPECT_POSITIONS[Math.floor(Math.random() * PROSPECT_POSITIONS.length)];
  const isPit = pos === 'SP' || pos === 'RP';

  const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

  return {
    id: `draft_${teamId}_${Date.now()}_${pickNum}_${Math.random().toString(36).substr(2, 5)}`,
    name,
    jerseyNumber: rand(40, 99),
    position: pos,
    teamId,
    age,
    height: `${5 + rand(0, 1)}'${rand(8, 11)}"`,
    weight: 165 + rand(0, 55),
    bats: Math.random() < 0.65 ? 'R' : Math.random() < 0.5 ? 'L' : 'S',
    throws: Math.random() < 0.78 ? 'R' : 'L',
    overall: base,
    salary: 570, // pre-arb MLB minimum
    batting: {
      contactR: rand(base - 8, base + 8),
      contactL: rand(base - 10, base + 8),
      powerR:   rand(base - 12, base + 12),
      powerL:   rand(base - 15, base + 12),
      speed:    rand(40, 85),
      steal:    rand(35, 80),
      clutch:   rand(35, 75),
    },
    pitching: {
      velocity: isPit ? rand(base - 8, base + 8) : rand(20, 45),
      control:  isPit ? rand(base - 10, base + 8) : rand(20, 45),
      break:    isPit ? rand(base - 12, base + 10) : rand(20, 45),
      stamina:  isPit ? rand(base - 8, base + 10) : rand(30, 55),
      pitches:  [],
    },
    fielding: {
      rating:        rand(base - 8, base + 8),
      armStrength:   rand(45, 80),
      armAccuracy:   rand(45, 80),
      errorResistance: rand(45, 80),
    },
  };
}

/**
 * Run the MLB Draft (5 rounds, 30 teams, reverse standings order).
 * Adds prospects directly to playerMap.
 * Returns array of news strings (Round 1 only + user team picks).
 */
function runDraft(teamRecords, teams, playerMap, userTeamId) {
  const news = [];
  const ROUNDS = 5;

  // Sort teams by record: worst first (reverse order of standings)
  const sorted = [...teams].sort((a, b) => {
    const aRec = teamRecords[a.id] || { wins: 0, losses: 0 };
    const bRec = teamRecords[b.id] || { wins: 0, losses: 0 };
    const aGP = aRec.wins + aRec.losses;
    const bGP = bRec.wins + bRec.losses;
    const aPct = aGP > 0 ? aRec.wins / aGP : 0;
    const bPct = bGP > 0 ? bRec.wins / bGP : 0;
    return aPct - bPct; // ascending → worst team picks first
  });

  let globalPick = 1;

  for (let round = 1; round <= ROUNDS; round++) {
    for (let i = 0; i < sorted.length; i++) {
      const team = sorted[i];
      const prospect = generateProspect(team.id, round, globalPick);
      playerMap[prospect.id] = prospect;

      const isUserPick = team.id === userTeamId;

      if (round === 1) {
        if (isUserPick) {
          news.push(`📋 DRAFT: Your pick! Round 1, Pick ${i + 1}: ${prospect.name} (${prospect.position}, OVR ${prospect.overall})`);
        } else {
          news.push(`📋 Round 1, Pick ${i + 1}: ${team.name} select ${prospect.name} (${prospect.position}, OVR ${prospect.overall})`);
        }
      } else if (isUserPick) {
        news.push(`📋 Round ${round}: You selected ${prospect.name} (${prospect.position}, OVR ${prospect.overall})`);
      }

      globalPick++;
    }
  }

  return news;
}

window.calculateAwards   = calculateAwards;
window.runAllStarGame    = runAllStarGame;
window.runTradeDeadline  = runTradeDeadline;
window.runFreeAgency     = runFreeAgency;
window.runDraft          = runDraft;
window.generateProspect  = generateProspect;
