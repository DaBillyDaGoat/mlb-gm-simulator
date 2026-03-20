/**
 * At-Bat Simulation Engine
 * Resolves a single plate appearance using player attributes
 */
'use strict';

/**
 * Pitcher fatigue multiplier — degrades after stamina threshold.
 * staminaThreshold ~ 50–110 pitches depending on stamina rating.
 */
function getFatigueMultiplier(pitcherPitching, pitchCount) {
  const staminaThreshold = 50 + pitcherPitching.stamina * 0.6;
  if (pitchCount <= staminaThreshold) return 1.0;
  const overBy = pitchCount - staminaThreshold;
  return Math.max(0.65, 1.0 - overBy * 0.006);
}

/**
 * Estimate average pitch count consumed by a result type.
 */
function estimatePitchesForResult(resultType) {
  switch (resultType) {
    case 'K':   return 5;
    case 'BB':  return 5;
    case 'HBP': return 3;
    case 'HR':  return 2;
    default:    return 3; // balls in play tend to be quick
  }
}

/**
 * Core at-bat resolver.
 * Returns an outcome object:
 *   { type: 'BB'|'HBP'|'K'|'GO'|'FO'|'LO'|'1B'|'2B'|'3B'|'HR' }
 */
function resolveAtBat(batter, pitcher, rng, pitchCount = 0, leverageIndex = 1.0) {
  const isVsRHP = pitcher.throws !== 'L';
  const contact = isVsRHP ? batter.batting.contactR : batter.batting.contactL;
  const power   = isVsRHP ? batter.batting.powerR   : batter.batting.powerL;

  const contactFactor = Math.min(1.0, contact / 125);
  const powerFactor   = Math.min(1.0, power   / 125);
  const speedFactor   = (batter.batting.speed || 50) / 99;

  // Pitcher factors (0–1 scale)
  const fatigue    = getFatigueMultiplier(pitcher.pitching, pitchCount);
  const velFactor  = (pitcher.pitching.velocity / 99) * fatigue;
  const ctrlFactor = (pitcher.pitching.control  / 99) * fatigue;
  const brkFactor  = (pitcher.pitching.break    / 99) * fatigue;

  // Clutch modifier for high-leverage situations
  const clutchMod = 1 + ((batter.batting.clutch - 50) / 500) * Math.min(leverageIndex, 3.0);

  // ── Walk ──────────────────────────────────────────────────────────────────
  // High control pitchers walk fewer; poorer contact batters draw more walks
  const walkProb = (0.06 + (1 - ctrlFactor) * 0.10) * (1.1 - contactFactor * 0.15);

  // ── HBP ───────────────────────────────────────────────────────────────────
  const hbpProb = 0.01;

  // ── Strikeout ─────────────────────────────────────────────────────────────
  const pitcherStrength = velFactor * 0.6 + brkFactor * 0.4;
  const kProb = (0.12 + pitcherStrength * 0.14 * (1.4 - contactFactor)) * clutchMod;

  // ── Roll outcome ──────────────────────────────────────────────────────────
  const roll = rng.next();

  if (roll < walkProb) {
    return { type: 'BB', pitches: 5 };
  }
  if (roll < walkProb + hbpProb) {
    return { type: 'HBP', pitches: 3 };
  }
  if (roll < walkProb + hbpProb + kProb) {
    return { type: 'K', pitches: 5 };
  }

  // ── Ball in play ──────────────────────────────────────────────────────────

  // Home run probability (independent of BABIP)
  // Elite power bonus: steeply rewards 100+ power so a 125-power Judge hits 50-60 HRs
  // while average hitters (power < 100) are completely unaffected.
  const eliteBonus = power > 100 ? (power - 100) * 0.026 : 0;
  const hrProb = powerFactor * (1 + eliteBonus) * 0.065 * (1.25 - velFactor * 0.35) * clutchMod;
  if (rng.chance(hrProb)) {
    return { type: 'HR', pitches: 2 };
  }

  // BABIP: base raised slightly to push ERA leaders into 2.50-3.00 range;
  // pitcher suppression modestly reduced to prevent elite pitchers from being too dominant
  const babip = Math.min(0.45, Math.max(0.15, 0.322 + contactFactor * 0.09 - velFactor * 0.015 - brkFactor * 0.010));

  if (rng.chance(babip)) {
    // Determine hit type
    const typeRoll = rng.next();
    const tripleThreshold = 0.025 + speedFactor * 0.025;
    const doubleThreshold = tripleThreshold + 0.25 + powerFactor * 0.13;

    if (typeRoll < tripleThreshold) return { type: '3B', pitches: 3 };
    if (typeRoll < doubleThreshold) return { type: '2B', pitches: 3 };
    return { type: '1B', pitches: 3 };
  }

  // Out — determine type (affects baserunner advancement)
  const outRoll = rng.next();
  if (outRoll < 0.42) return { type: 'GO', pitches: 3 };
  if (outRoll < 0.82) return { type: 'FO', pitches: 3 };
  return { type: 'LO', pitches: 3 };
}

/**
 * Advance baserunners after a plate appearance result.
 * bases: [runner1B, runner2B, runner3B] — each is a player ID or null
 * Returns { newBases, runsScored, outsAdded, rbiCount, outDescription }
 */
function advanceBases(bases, result, batterId, outs, rng) {
  let newBases = [...bases];
  let runsScored = 0;
  let outsAdded  = 0;
  let rbiCount   = 0;

  const scoreRunner = () => { runsScored++; rbiCount++; };

  switch (result.type) {
    case 'BB':
    case 'HBP': {
      // Force advance all runners
      if (newBases[0]) {
        if (newBases[1]) {
          if (newBases[2]) { scoreRunner(); }
          newBases[2] = newBases[1];
        }
        newBases[1] = newBases[0];
      }
      newBases[0] = batterId;
      break;
    }

    case '1B': {
      // Runner on 3rd scores
      if (newBases[2]) { scoreRunner(); newBases[2] = null; }
      // Runner on 2nd → scores ~55% of the time on a single (real MLB rate)
      if (newBases[1]) {
        if (rng.chance(0.55)) { scoreRunner(); newBases[2] = null; }
        else newBases[2] = newBases[1];
        newBases[1] = null;
      }
      // Runner on 1st → 2nd
      if (newBases[0]) { newBases[1] = newBases[0]; newBases[0] = null; }
      newBases[0] = batterId;
      break;
    }

    case '2B': {
      if (newBases[2]) { scoreRunner(); newBases[2] = null; }
      if (newBases[1]) { scoreRunner(); newBases[1] = null; }
      if (newBases[0]) {
        if (rng.chance(0.50)) { scoreRunner(); }
        else newBases[2] = newBases[0];
        newBases[0] = null;
      }
      newBases[1] = batterId;
      break;
    }

    case '3B': {
      for (let i = 0; i < 3; i++) { if (newBases[i]) { scoreRunner(); newBases[i] = null; } }
      newBases[2] = batterId;
      break;
    }

    case 'HR': {
      for (let i = 0; i < 3; i++) { if (newBases[i]) { scoreRunner(); newBases[i] = null; } }
      runsScored++; // batter scores — no RBI for themselves counted separately
      rbiCount++;   // HR always counts as at least 1 RBI
      break;
    }

    case 'K': {
      outsAdded = 1;
      break;
    }

    case 'GO': {
      outsAdded = 1;
      // Double play chance when runner on 1st, < 2 outs (~20% of GOs in that situation)
      if (outs < 2 && newBases[0] && rng.chance(0.20)) {
        outsAdded = 2;
        newBases[0] = null;
      }
      // Runner on 3rd might score on ground out if < 2 outs (not DP)
      if (outsAdded === 1 && outs < 2 && newBases[2]) {
        runsScored++; rbiCount++;
        newBases[2] = null;
      }
      break;
    }

    case 'FO': {
      outsAdded = 1;
      // Sac fly — runner on 3rd scores if < 2 outs
      if (outs < 2 && newBases[2]) {
        runsScored++; rbiCount++;
        newBases[2] = null;
      }
      break;
    }

    case 'LO': {
      outsAdded = 1;
      break;
    }
  }

  return { newBases, runsScored, outsAdded, rbiCount };
}

window.resolveAtBat    = resolveAtBat;
window.advanceBases    = advanceBases;
window.getFatigueMultiplier = getFatigueMultiplier;
window.estimatePitchesForResult = estimatePitchesForResult;
