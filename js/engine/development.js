/**
 * Player Development System
 * Age curves, waiver wire generation, retirement
 */
'use strict';

/**
 * Apply age-based development/decline to all players.
 * Called once at startNewSeason().
 * Returns array of notable news strings.
 */
function applyPlayerDevelopment(playerMap) {
  const news = [];

  for (const player of Object.values(playerMap)) {
    const age = player.age || 25;

    // Delta per attribute: positive = improve, negative = decline
    let delta;
    if      (age <= 21) delta =  3;   // young prospect rocketing up
    else if (age <= 24) delta =  2;   // developing talent
    else if (age <= 27) delta =  1;   // still improving
    else if (age <= 30) delta =  0;   // prime — stable
    else if (age <= 32) delta = -1;   // just past prime
    else if (age <= 35) delta = -2;   // aging veteran
    else                delta = -3;   // late career decline

    if (delta === 0) continue;

    const isPitcher = ['SP', 'RP', 'TWP'].includes(player.position);

    // Apply to batting attributes
    if (player.batting) {
      for (const attr of ['contactR', 'contactL', 'powerR', 'powerL', 'speed']) {
        if (Math.random() < 0.55) {
          const jitter = delta + (Math.random() < 0.35 ? Math.sign(delta) : 0);
          const maxVal = (attr === 'contactR' || attr === 'contactL') ? 125 : 99;
          player.batting[attr] = Math.min(maxVal, Math.max(5, (player.batting[attr] || 50) + jitter));
        }
      }
    }

    // Apply to pitching attributes
    if (isPitcher && player.pitching) {
      for (const attr of ['velocity', 'control', 'break', 'stamina']) {
        if (Math.random() < 0.55) {
          const jitter = delta + (Math.random() < 0.35 ? Math.sign(delta) : 0);
          player.pitching[attr] = Math.min(99, Math.max(20, (player.pitching[attr] || 50) + jitter));
        }
      }
    }

    // Nudge overall
    const overallDelta = Math.round(delta * 0.6);
    if (overallDelta !== 0) {
      player.overall = Math.min(99, Math.max(40, (player.overall || 70) + overallDelta));
    }

    // Notable development news (5% chance on big moves)
    if (Math.abs(delta) >= 2 && Math.random() < 0.05) {
      const msg = delta > 0
        ? `📈 ${player.name} (${player.teamId}) is having a breakout year!`
        : `📉 ${player.name} (${player.teamId}) is showing signs of decline.`;
      news.push(msg);
    }
  }

  return news;
}

/**
 * Check which players should retire at end of season.
 * Returns array of retired player IDs.
 */
function checkRetirements(playerMap) {
  const retired = [];
  for (const player of Object.values(playerMap)) {
    const age = player.age || 25;
    let chance = 0;
    if      (age >= 41) chance = 1.00;
    else if (age >= 40) chance = 0.75;
    else if (age >= 39) chance = 0.45;
    else if (age >= 38) chance = 0.22;
    else if (age >= 37) chance = 0.08;

    if (chance > 0 && Math.random() < chance) {
      retired.push(player.id);
    }
  }
  return retired;
}

/**
 * Generate waiver wire pool.
 * Picks a mix of low-rated players from AI teams, shuffled for variety.
 * Returns array of player IDs.
 */
function generateWaiverPool(playerMap, userTeamId, count = 40) {
  const eligible = Object.values(playerMap)
    .filter(p =>
      p.teamId !== userTeamId &&
      !p.isRetired &&
      p.overall >= 50 && p.overall <= 72
    )
    .sort((a, b) => a.overall - b.overall);

  // Shuffle for variety
  const pool = eligible.slice(0, Math.min(eligible.length, count * 2));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map(p => p.id);
}

/**
 * Generate a pre-game manager decision for the user.
 * Returns a decision object with type, situation text, and options.
 */
function createManagerDecision(userTeamId, opponentTeamId, playerMap, teamsMeta) {
  const oppMeta = teamsMeta.find(t => t.id === opponentTeamId) || { name: opponentTeamId };

  // Pick a random scenario
  const scenarios = [
    {
      type: 'steal_sign',
      situation: `Runners are eager on the basepaths against ${oppMeta.name}.`,
      prompt: 'Do you put the steal sign on?',
      options: [
        { label: '🏃 Yes, run!',       desc: 'Aggressive base running',  mod:  0.04, key: 'yes' },
        { label: '🛑 Hold the runner', desc: 'Play it safe',              mod:  0.00, key: 'no'  },
        { label: '🎯 Hit-and-run',     desc: 'Contact & speed combo',    mod:  0.02, key: 'hit' },
      ],
      correctKey: 'yes',
    },
    {
      type: 'intentional_walk',
      situation: `${oppMeta.name}'s cleanup hitter steps up in a key spot.`,
      prompt: "He's been crushing the ball. Walk him intentionally?",
      options: [
        { label: '🥾 Walk him',        desc: 'Avoid the big bat',         mod:  0.03, key: 'walk'  },
        { label: '⚾ Pitch to him',    desc: 'Challenge the hitter',      mod: -0.02, key: 'pitch' },
        { label: '🎯 Careful pitching',desc: 'Work the edges carefully',  mod:  0.01, key: 'care'  },
      ],
      correctKey: 'walk',
    },
    {
      type: 'pinch_hit',
      situation: `Late innings, close game against ${oppMeta.name}.`,
      prompt: 'Your lineup spot is due. Use your best bench bat?',
      options: [
        { label: '🔁 Pinch hit now',   desc: 'Send in your best bat',     mod:  0.04, key: 'ph'    },
        { label: '⬇️ Stay the course', desc: 'Trust the starter',          mod:  0.00, key: 'stay'  },
        { label: '⏳ Wait one more AB', desc: 'Keep the bench option',    mod:  0.01, key: 'wait'  },
      ],
      correctKey: 'ph',
    },
    {
      type: 'defensive_shift',
      situation: `${oppMeta.name}'s pull hitter is coming up with runners on base.`,
      prompt: 'Do you shift the infield?',
      options: [
        { label: '↔️ Shift hard',      desc: 'Stack the pull side',       mod:  0.03, key: 'shift' },
        { label: '📍 Stay standard',    desc: 'Play traditional defense',  mod:  0.00, key: 'std'   },
        { label: '🎲 Partial shift',    desc: 'Move just the 2nd baseman', mod:  0.01, key: 'part'  },
      ],
      correctKey: 'shift',
    },
  ];

  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

/**
 * Generate a 2–3 sentence game recap from a completed game result.
 */
function generateGameRecap(result, playerMap, homeMeta, awayMeta, isDivisional) {
  const homeWon = result.homeScore > result.awayScore;
  const winTeam = homeWon ? homeMeta : awayMeta;
  const loseTeam = homeWon ? awayMeta : homeMeta;
  const winScore = homeWon ? result.homeScore : result.awayScore;
  const loseScore = homeWon ? result.awayScore : result.homeScore;

  const batters  = Object.entries(result.gameStats?.batting  || {});
  const pitchers = Object.entries(result.gameStats?.pitching || {});

  // Find top HR hitter
  const hrHitter = batters
    .filter(([pid, s]) => (s.hr || 0) > 0)
    .sort((a, b) => (b[1].hr || 0) - (a[1].hr || 0))[0];

  // Find winning pitcher
  const winnerPit = pitchers
    .filter(([pid, s]) => (s.w || 0) > 0)[0];

  // Find top hit producer
  const topHitter = batters
    .filter(([pid, s]) => (s.h || 0) >= 2)
    .sort((a, b) => (b[1].h || 0) - (a[1].h || 0))[0];

  const rivBadge = isDivisional ? 'In this divisional rivalry, ' : '';
  const dramatics = ['dominated', 'edged', 'defeated', 'took down', 'topped'];
  const verb = dramatics[Math.floor(Math.random() * dramatics.length)];

  const sentences = [];

  // Sentence 1: score
  sentences.push(`${rivBadge}The ${winTeam.name} ${verb} the ${loseTeam.name} ${winScore}–${loseScore}.`);

  // Sentence 2: key offensive moment
  if (hrHitter) {
    const player = playerMap[hrHitter[0]];
    const hr = hrHitter[1].hr;
    const rbi = hrHitter[1].rbi || 0;
    const action = hr >= 2 ? `blasted ${hr} home runs` : ['crushed', 'launched', 'hammered', 'blasted'][Math.floor(Math.random() * 4)] + ' a home run';
    const rbiStr = rbi > 1 ? `, driving in ${rbi}` : '';
    if (player) sentences.push(`${player.name} ${action}${rbiStr}.`);
  } else if (topHitter) {
    const player = playerMap[topHitter[0]];
    if (player) {
      const h = topHitter[1].h;
      const ab = topHitter[1].ab || h;
      sentences.push(`${player.name} went ${h}-for-${ab} at the plate.`);
    }
  }

  // Sentence 3: starting pitcher
  if (winnerPit) {
    const pitcher = playerMap[winnerPit[0]];
    const ip = winnerPit[1].ip || 0;
    const k  = winnerPit[1].k  || 0;
    const er = winnerPit[1].er || 0;
    if (pitcher && ip >= 5) {
      const kStr = k > 0 ? `, striking out ${k}` : '';
      const erStr = er === 0 ? ' without allowing an earned run' : `, allowing ${er} earned run${er > 1 ? 's' : ''}`;
      sentences.push(`${pitcher.name} went ${_fmtIP(ip)} innings${kStr}${erStr}.`);
    }
  }

  return sentences.join(' ');
}

function _fmtIP(ip) {
  const full = Math.floor(ip);
  const thirds = Math.round((ip - full) * 3);
  return thirds === 0 ? `${full}` : `${full}.${thirds}`;
}
