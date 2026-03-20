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
 *
 * playerMod: additive modifier to contactFactor (e.g. +0.03 hot streak, -0.03 cold,
 *            -0.02 fatigue). Defaults to 0.
 */
function resolveAtBat(batter, pitcher, rng, pitchCount = 0, leverageIndex = 1.0, playerMod = 0) {
  const isVsRHP = pitcher.throws !== 'L';
  const contact = isVsRHP ? batter.batting.contactR : batter.batting.contactL;
  const power   = isVsRHP ? batter.batting.powerR   : batter.batting.powerL;

  // Apply hot/cold streak and fatigue modifier to contact (clamped 0.05–1.0)
  const contactFactor = Math.min(1.0, Math.max(0.05, (contact / 125) + playerMod));
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
  // Elite power bonus: steeply rewards 100+ power so a 125-power Judge hits 50+ HRs
  // while average hitters (power < 100) are much less affected.
  // Raised elite factor (0.070) to preserve top sluggers when base rate is lowered.
  const eliteBonus = power > 100 ? (power - 100) * 0.025 : 0;
  const hrProb = powerFactor * (1 + eliteBonus) * 0.070 * (1.25 - velFactor * 0.35) * clutchMod;
  if (rng.chance(hrProb)) {
    return { type: 'HR', pitches: 2 };
  }

  // BABIP: base at 0.288 targets league AVG ~.257 while keeping elite contact hitters realistic.
  // Pitcher suppression factors unchanged — elite pitchers still hold their edge.
  const babip = Math.min(0.45, Math.max(0.15, 0.288 + contactFactor * 0.09 - velFactor * 0.015 - brkFactor * 0.010));

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
  const scoredRunnerIds = []; // Fix 5: track which player IDs cross home plate

  const scoreRunner = (runnerId) => { runsScored++; rbiCount++; if (runnerId) scoredRunnerIds.push(runnerId); };

  switch (result.type) {
    case 'BB':
    case 'HBP': {
      // Force advance all runners
      if (newBases[0]) {
        if (newBases[1]) {
          if (newBases[2]) { scoreRunner(newBases[2]); }
          newBases[2] = newBases[1];
        }
        newBases[1] = newBases[0];
      }
      newBases[0] = batterId;
      break;
    }

    case '1B': {
      // Runner on 3rd scores
      if (newBases[2]) { scoreRunner(newBases[2]); newBases[2] = null; }
      // Runner on 2nd → scores ~55% of the time on a single (real MLB rate)
      if (newBases[1]) {
        if (rng.chance(0.55)) { scoreRunner(newBases[1]); }
        else newBases[2] = newBases[1];
        newBases[1] = null;
      }
      // Runner on 1st → 2nd
      if (newBases[0]) { newBases[1] = newBases[0]; newBases[0] = null; }
      newBases[0] = batterId;
      break;
    }

    case '2B': {
      if (newBases[2]) { scoreRunner(newBases[2]); newBases[2] = null; }
      if (newBases[1]) { scoreRunner(newBases[1]); newBases[1] = null; }
      if (newBases[0]) {
        if (rng.chance(0.50)) { scoreRunner(newBases[0]); }
        else newBases[2] = newBases[0];
        newBases[0] = null;
      }
      newBases[1] = batterId;
      break;
    }

    case '3B': {
      for (let i = 0; i < 3; i++) { if (newBases[i]) { scoreRunner(newBases[i]); newBases[i] = null; } }
      newBases[2] = batterId;
      break;
    }

    case 'HR': {
      for (let i = 0; i < 3; i++) { if (newBases[i]) { scoreRunner(newBases[i]); newBases[i] = null; } }
      runsScored++; // batter scores
      rbiCount++;   // HR always counts as at least 1 RBI
      scoredRunnerIds.push(batterId); // Fix 5: batter also scores on HR
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
        scoredRunnerIds.push(newBases[2]);
        newBases[2] = null;
      }
      break;
    }

    case 'FO': {
      outsAdded = 1;
      // Sac fly — runner on 3rd scores if < 2 outs
      if (outs < 2 && newBases[2]) {
        runsScored++; rbiCount++;
        scoredRunnerIds.push(newBases[2]);
        newBases[2] = null;
      }
      break;
    }

    case 'LO': {
      outsAdded = 1;
      break;
    }
  }

  return { newBases, runsScored, outsAdded, rbiCount, scoredRunnerIds };
}

/**
 * Check if a baserunner attempts (and succeeds/fails) a stolen base.
 * Called before each at-bat when runner is on 1st and 2nd is open.
 * Returns null (no attempt) or { attempted: true, success: bool }
 */
function checkStolenBase(runner, rng) {
  if (!runner || !runner.batting) return null;
  const speed = runner.batting.speed || 50;
  const steal = runner.batting.steal || 50;

  // Only players with enough speed bother to attempt
  if (speed < 52) return null;

  // Attempt probability: ~8% at speed 55, ~40% at speed 90
  const attemptProb = Math.min(0.45, (speed - 45) / 120);
  if (!rng.chance(attemptProb)) return null;

  // Success probability: ~58% at steal 50, up to ~84% at steal 99
  const successProb = Math.min(0.85, 0.50 + (steal - 40) / 180);
  return { attempted: true, success: rng.chance(successProb) };
}

window.resolveAtBat    = resolveAtBat;
window.advanceBases    = advanceBases;
window.getFatigueMultiplier = getFatigueMultiplier;
window.estimatePitchesForResult = estimatePitchesForResult;
window.checkStolenBase = checkStolenBase;
