# Baseball Franchise Simulator — Game Design Document

**Version:** 1.0
**Author:** Billy Buteau
**Date:** March 20, 2026
**Status:** Pre-Production

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Technical Architecture](#2-technical-architecture)
3. [Data Model](#3-data-model)
4. [Core Systems](#4-core-systems)
5. [UI/UX Flow](#5-uiux-flow)
6. [Phased Development Roadmap](#6-phased-development-roadmap)
7. [Data Pipeline](#7-data-pipeline)
8. [Card System & Visual Assets](#8-card-system--visual-assets)
9. [Appendices](#9-appendices)

---

## 1. Game Overview

### 1.1 Elevator Pitch

**Baseball Franchise Simulator** is an indie baseball franchise management game played in the browser. You take the reins of any of the 30 MLB teams as both General Manager and in-game skipper. Build your dynasty through trades, drafts, and free agency — then step into the dugout and make real-time strategic decisions during simulated games via a Quick Manage mode inspired by MLB The Show. All 30 teams ship with real rosters sourced from MLB The Show 26 ratings, providing an authentic starting point with 845+ players.

### 1.2 Platform and Distribution

- **Primary platform:** Mobile web (iPhone Safari, designed for 390×844 viewport and up)
- **Secondary platform:** Desktop browsers (Chrome, Firefox, Edge, Safari)
- **Technology:** Pure HTML / CSS / JavaScript — no framework dependency required for MVP
- **Distribution:** Static hosting (GitHub Pages, Netlify, or Vercel). Future potential for PWA install-to-home-screen.
- **Monetization:** Free (passion project / portfolio piece). Optional donation or ad-supported model later.

### 1.3 Target Audience

- Baseball fans who enjoy franchise management (OOTP, MLB The Show franchise mode)
- Mobile gamers who want a deep sim experience without a console
- Stats-minded players who enjoy spreadsheet-depth roster decisions
- Casual fans who want a pick-up-and-play baseball management experience on their phone

### 1.4 Design Pillars

1. **Depth without complexity** — Rich simulation under the hood, but the UI never overwhelms. Surface the right information at the right time.
2. **Mobile-native feel** — Designed for thumb-driven navigation. Every screen must be usable one-handed on an iPhone.
3. **Authentic rosters** — Real teams, real players, real ratings. The spreadsheet is the source of truth.
4. **Quick sessions** — A user should be able to sim a week of games and make a trade in under 10 minutes.
5. **Long-term engagement** — Multi-season dynasty play with progression, regression, draft classes, and a Hall of Fame.

---

## 2. Technical Architecture

### 2.1 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Markup | HTML5 | Semantic, accessible |
| Styling | CSS3 (custom properties) | Mobile-first, dark-mode-ready |
| Logic | Vanilla JavaScript (ES2020+) | No framework for MVP; consider Preact/Svelte in Phase 5 |
| Storage (prototype) | `localStorage` | ~5 MB limit; sufficient for one save file |
| Storage (scale) | IndexedDB via `idb` wrapper | Supports multiple saves, larger datasets |
| Build tool | None (MVP) → Vite (Phase 5) | Keep dev friction near zero early on |
| Testing | Manual + lightweight unit tests | Use native `assert` or a micro-framework |

### 2.2 Proposed File Structure

```
baseball-franchise-simulator/
├── index.html                  # Entry point / app shell
├── css/
│   ├── reset.css               # Normalize
│   ├── variables.css           # Design tokens (colors, spacing, fonts)
│   ├── layout.css              # Grid, flex utilities, responsive
│   └── components.css          # Button, card, modal, table styles
├── js/
│   ├── app.js                  # Boot, router, screen manager
│   ├── data/
│   │   ├── teams.json          # 30 teams: name, abbr, division, colors, logo
│   │   ├── players.json        # All player records (exported from XLSX)
│   │   └── schedule.json       # Pre-generated 162-game schedule
│   ├── engine/
│   │   ├── season-sim.js       # Season-level simulation loop
│   │   ├── game-sim.js         # At-bat-level game simulation
│   │   ├── lineup.js           # Auto-lineup generation, validation
│   │   ├── stats-tracker.js    # Accumulates box scores into season stats
│   │   ├── standings.js        # W-L records, division/league standings
│   │   └── playoffs.js         # Postseason bracket, series sim
│   ├── gm/
│   │   ├── roster.js           # Roster management, 26/40-man logic
│   │   ├── trade.js            # Trade proposal, AI evaluation
│   │   ├── free-agency.js      # Free agent market, bidding
│   │   ├── draft.js            # Amateur draft logic, prospect generation
│   │   ├── finances.js         # Salary cap, payroll, revenue
│   │   └── progression.js      # Off-season aging, development, regression
│   ├── ui/
│   │   ├── screens.js          # Screen definitions and transitions
│   │   ├── components.js       # Reusable UI builders (tables, cards, modals)
│   │   ├── game-day-ui.js      # Quick Manage interface
│   │   └── transitions.js      # Screen animation helpers
│   ├── storage/
│   │   ├── save-manager.js     # Save/load orchestration
│   │   ├── local-storage.js    # localStorage adapter
│   │   └── indexeddb.js        # IndexedDB adapter (Phase 2+)
│   └── utils/
│       ├── random.js           # Seeded RNG for reproducible sims
│       ├── helpers.js          # Formatting, sorting, misc
│       └── schedule-gen.js     # 162-game schedule generator
├── assets/
│   ├── icons/                  # Team logos (SVG), UI icons
│   └── sounds/                 # Optional SFX (Phase 5)
├── tools/
│   └── xlsx-to-json.js         # Node script: converts roster XLSX → players.json
├── manifest.json               # PWA manifest (Phase 5)
└── sw.js                       # Service worker (Phase 5)
```

### 2.3 Data Flow

```
┌──────────────────────────────────────────────────┐
│                   BOOT SEQUENCE                   │
│  1. Load teams.json, players.json, schedule.json  │
│  2. Check localStorage for existing save          │
│  3. If save exists → hydrate game state           │
│  4. If no save → initialize fresh season          │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│                  GAME STATE (in memory)            │
│                                                    │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ Players │  │  Teams   │  │  Season State   │  │
│  │ (array) │  │ (array)  │  │ (schedule,      │  │
│  │         │  │          │  │  standings,      │  │
│  │         │  │          │  │  currentWeek)    │  │
│  └─────────┘  └──────────┘  └─────────────────┘  │
│                                                    │
│  ┌──────────────┐  ┌───────────────────────────┐  │
│  │  User Team   │  │   Accumulated Stats       │  │
│  │  (finances,  │  │   (batting, pitching per  │  │
│  │   settings)  │  │    player per season)     │  │
│  └──────────────┘  └───────────────────────────┘  │
└──────────────────┬───────────────────────────────┘
                   │
           ┌───────┴───────┐
           ▼               ▼
   ┌──────────────┐  ┌──────────────┐
   │  Season Sim  │  │  Quick Manage │
   │  (batch sim  │  │  (at-bat by   │
   │   games)     │  │   at-bat)     │
   └──────┬───────┘  └──────┬───────┘
          │                  │
          ▼                  ▼
   ┌──────────────────────────────┐
   │      Stats Tracker           │
   │  (updates player & team      │
   │   season statistics)         │
   └──────────────┬───────────────┘
                  │
                  ▼
   ┌──────────────────────────────┐
   │      Save Manager            │
   │  (serialize → localStorage   │
   │   or IndexedDB)              │
   └──────────────────────────────┘
```

### 2.4 Storage Strategy

**Phase 1 — localStorage:**

The entire game state serializes to a single JSON blob. At ~845 players × ~500 bytes each ≈ 420 KB for player data. With season stats, schedule state, and team data, a single save is estimated at 1–2 MB, well within the ~5 MB localStorage limit.

Save structure:
```json
{
  "version": "1.0.0",
  "saveDate": "2026-03-20T12:00:00Z",
  "season": { "year": 2026, "currentDay": 45, "phase": "regular_season" },
  "userTeamId": "NYY",
  "teams": [ ... ],
  "players": [ ... ],
  "standings": { ... },
  "schedule": [ ... ],
  "stats": { "batting": { ... }, "pitching": { ... } },
  "finances": { ... },
  "transactionLog": [ ... ]
}
```

**Phase 2+ — IndexedDB:**

Migrate to IndexedDB when any of these triggers hit: multiple save slots needed, multi-season history exceeds 3 MB, or performance degrades on serialization. Use the `idb` npm package (or a lightweight wrapper) with object stores for `players`, `teams`, `seasons`, `stats`, and `saves`.

### 2.5 Performance Considerations for Mobile

- **Minimize DOM nodes.** Use virtual scrolling for long player lists (rosters of 40+ players).
- **Batch simulation off-thread.** Use `requestIdleCallback` or a Web Worker for simming multiple games so the UI never locks.
- **Lazy-load screens.** Only build the DOM for the current screen. Destroy previous screens on navigation.
- **Compress save data.** Use `JSON.stringify` with an abbreviated key scheme (e.g., `cn` instead of `contactName`) for storage, expanding on load.
- **Avoid large images.** SVG logos, CSS-drawn elements, and emoji where possible.
- **Debounce auto-save.** Save on screen transitions, not on every state mutation.
- **Target 60fps for transitions, 16ms for UI responses.** The simulation engine itself can take longer since it runs between user interactions.

---

## 3. Data Model

### 3.1 Source Data (from Spreadsheet)

The roster spreadsheet (`MLB_TheShow26_Rosters_FINAL_v10.xlsx`) contains 33 sheets: an index sheet, 30 team sheets (one per MLB team), a "Free Agents - Legends" sheet (50 retro/legend players), and a "Top Prospects (Non-40-Man)" sheet (30 top minor-league prospects).

**Total players across all team sheets: 845**
**Legends / Free Agents: 50**
**Top Prospects: 30**

Each team sheet has 44 columns per player. Here is the complete field inventory:

| Column | Type | Description | Game Use |
|---|---|---|---|
| Full Name | string | Player's full name | Display |
| Jersey # | number | Uniform number | Display |
| Position | string | Primary position (SP, RP, C, 1B, 2B, 3B, SS, LF, CF, RF, DH, TWP) | Roster/lineup |
| HT | string | Height (e.g., "6'3"") | Display |
| WT | number | Weight in lbs | Display |
| TS26 OVR | number | Overall rating (49–105 scale) | Quick evaluation, sorting |
| B/T | string | Bats/Throws (L/L, L/R, R/L, R/R, S/R) | Platoon splits, lineup |
| Age | number | Current age (21–43) | Progression/regression |
| MVP Pos | number | Internal position code | Position mapping |
| Con L | number | Contact vs. LHP (0–125) | At-bat sim (batting) |
| Con R | number | Contact vs. RHP (0–125) | At-bat sim (batting) |
| Pow L | number | Power vs. LHP (0–125) | At-bat sim (extra-base hits) |
| Pow R | number | Power vs. RHP (0–125) | At-bat sim (extra-base hits) |
| Speed | number | Baserunning speed (0–99) | Stolen bases, extra bases |
| Steal | number | Steal ability (0–99) | Stolen base attempts |
| Fielding | number | Fielding ability (0–99) | Defensive sim |
| Arm Str | number | Arm strength (0–99) | Outfield assists, catcher arm |
| Arm Acc | number | Arm accuracy (0–99) | Throwing errors |
| Err Res | number | Error resistance (0–99) | Fielding errors |
| Clutch | number | Clutch rating (0–99) | Late-game / high-leverage modifier |
| Durability | number | Injury resistance (0–99) | Injury probability |
| Velocity | number | Pitch velocity (0–99, 0 for position players) | Pitching sim |
| Control | number | Pitch control (0–99) | Walk rate, hit-by-pitch |
| Stamina | number | Pitcher stamina (0–99) | Pitch count / fatigue |
| Break | number | Pitch break/movement (0–99) | Strikeout rate |
| P1 Type | string | Primary pitch type (4-Seam, Sinker, Cutter, Slider, Changeup, Splitter) | Pitching repertoire |
| P1 Rat | number | Primary pitch rating (0–100) | Pitch effectiveness |
| P2 Type | string | Secondary pitch type | Pitching repertoire |
| P2 Rat | number | Secondary pitch rating | Pitch effectiveness |
| P3 Type | string | Third pitch type | Pitching repertoire |
| P3 Rat | number | Third pitch rating | Pitch effectiveness |
| P4 Type | string | Fourth pitch type | Pitching repertoire |
| P4 Rat | number | Fourth pitch rating | Pitch effectiveness |
| Throws | string | Throwing hand (L or R) | Platoon matchups |
| 2nd Pos | number | Secondary position code | Roster flexibility |
| Pitch Del | number | Pitch delivery style ID | Future visual use |
| Bat Stance | number | Batting stance ID | Future visual use |
| Face ID | number | Face model ID | Future visual use |
| Skin Tone | number | Skin tone ID | Future visual use |
| Nationality | number | Country code | Display |
| Team Slot | number | Internal team index (0–30) | Team assignment |
| Roster Slot | number | Roster position index | Roster order |
| Condition | number | Current condition (0–100) | Availability |
| Salary $K | number | Annual salary in thousands (550–40,000) | Finances |

### 3.2 Player Object (Game Runtime)

```javascript
const player = {
  // Identity
  id: "player_001",              // Generated unique ID
  name: "Aaron Judge",
  jerseyNumber: 99,
  position: "RF",
  secondaryPosition: "CF",       // Mapped from 2nd Pos code
  teamId: "NYY",
  height: "6'7\"",
  weight: 282,
  age: 33,
  bats: "R",
  throws: "R",
  nationality: "USA",
  salary: 40000,                 // In thousands

  // Overall
  overall: 99,

  // Batting attributes
  batting: {
    contactL: 72,                // Contact vs LHP
    contactR: 95,                // Contact vs RHP
    powerL: 112,                 // Power vs LHP
    powerR: 125,                 // Power vs RHP
    speed: 58,
    steal: 38,
    clutch: 95,
  },

  // Fielding attributes
  fielding: {
    rating: 75,
    armStrength: 82,
    armAccuracy: 78,
    errorResistance: 82,
  },

  // Pitching attributes (zeroed for position players)
  pitching: {
    velocity: 0,
    control: 0,
    stamina: 0,
    break: 0,
    pitches: [],                 // Array of { type, rating }
  },

  // Condition
  durability: 80,
  condition: 100,                // Current game condition (fatigue, injury)
  isInjured: false,
  injuryDaysRemaining: 0,

  // Season stats (reset each year)
  seasonStats: {
    batting: { /* see 3.4 */ },
    pitching: { /* see 3.4 */ },
  },

  // Career tracking
  careerStats: [],               // Array of season stat snapshots
  contractYearsRemaining: 3,
  contractAAV: 40000,            // Average annual value ($K)
};
```

### 3.3 Team Object

```javascript
const team = {
  id: "NYY",
  name: "New York Yankees",
  abbreviation: "NYY",
  city: "New York",
  division: "AL East",
  league: "AL",

  // Colors (for UI theming)
  colors: {
    primary: "#003087",
    secondary: "#E4002B",
    accent: "#FFFFFF",
  },

  // Roster
  roster40Man: [],               // Array of player IDs (up to 40)
  roster26Man: [],               // Active roster (up to 26)
  injuredList: [],               // IL player IDs
  minors: [],                    // Minor league player IDs

  // Lineup & rotation
  lineupVsRHP: [],              // 9 player IDs (batting order vs RHP)
  lineupVsLHP: [],              // 9 player IDs (batting order vs LHP)
  startingRotation: [],          // 5 SP player IDs
  bullpen: [],                   // RP player IDs, ordered by role
  closerId: null,

  // Season record
  record: { wins: 0, losses: 0 },
  streak: { type: "W", count: 0 },
  runDifferential: 0,

  // Finances
  finances: {
    payroll: 0,                  // Computed from roster salaries
    budget: 200000,              // Team budget ($K) — varies by team
    revenue: 0,                  // Accumulated season revenue
    luxuryTaxThreshold: 241000,  // 2026 CBT threshold ($K)
    isOverTax: false,
  },

  // AI behavior (for non-user teams)
  ai: {
    tradeAggression: 0.5,       // 0 = passive, 1 = aggressive
    spendingWillingness: 0.5,
    rebuildThreshold: 0.35,      // Win% below which AI considers rebuilding
  },
};
```

### 3.4 Statistics Schema

**Batting Stats (per player per season):**

```javascript
const battingStats = {
  gamesPlayed: 0,
  atBats: 0,
  plateAppearances: 0,
  hits: 0,
  doubles: 0,
  triples: 0,
  homeRuns: 0,
  rbi: 0,
  runs: 0,
  walks: 0,
  strikeouts: 0,
  stolenBases: 0,
  caughtStealing: 0,
  hitByPitch: 0,
  sacrificeFlies: 0,
  sacrificeBunts: 0,
  groundIntoDP: 0,
  errors: 0,
  // Computed (calculated on read, not stored)
  // avg, obp, slg, ops, babip
};
```

**Pitching Stats (per player per season):**

```javascript
const pitchingStats = {
  gamesPlayed: 0,
  gamesStarted: 0,
  wins: 0,
  losses: 0,
  saves: 0,
  blownSaves: 0,
  holds: 0,
  inningsPitched: 0,            // Stored as total outs (e.g., 600 = 200.0 IP)
  hits: 0,
  runs: 0,
  earnedRuns: 0,
  homeRuns: 0,
  walks: 0,
  strikeouts: 0,
  hitBatters: 0,
  wildPitches: 0,
  qualityStarts: 0,
  completeGames: 0,
  shutouts: 0,
  // Computed: era, whip, k9, bb9, kbb, fip
};
```

### 3.5 League Structure

```javascript
const league = {
  AL: {
    East:    ["NYY", "BOS", "BAL", "TBR", "TOR"],
    Central: ["CWS", "CLE", "DET", "KCR", "MIN"],
    West:    ["OAK", "HOU", "LAA", "SEA", "TEX"],
  },
  NL: {
    East:    ["ATL", "MIA", "NYM", "PHI", "WSN"],
    Central: ["CHC", "CIN", "MIL", "PIT", "STL"],
    West:    ["ARI", "COL", "LAD", "SDP", "SFG"],
  },
};
```

### 3.6 Schedule Data Model

```javascript
const gameEntry = {
  gameId: "2026_001_NYY_BOS",
  day: 1,                       // Season day (1–183, accounting for off-days)
  week: 1,
  homeTeamId: "NYY",
  awayTeamId: "BOS",
  status: "scheduled",          // "scheduled" | "completed" | "in_progress"
  result: null,                 // { homeScore, awayScore, innings, wpId, lpId, svId }
};
```

---

## 4. Core Systems

### 4.1 Season Simulation Engine

The season sim manages the 162-game schedule and advances the calendar day by day (or week by week for batch simulation).

**Schedule Generation:**

- Build a balanced 162-game schedule: 13 games vs. each divisional rival (52 total), 6–7 games vs. each same-league non-division team (60–66 total), and interleague games to fill the remainder.
- Each team gets approximately 81 home and 81 away games.
- Schedule includes 15–20 off-days per team, distributed realistically (no team plays more than 20 consecutive days).
- The schedule is pre-generated at season start and stored in `schedule.json`.

**Simulation Flow:**

```
User clicks "Sim Day" / "Sim Week" / "Sim to Date"
     │
     ▼
For each game on the current day:
     │
     ├── Is user's team playing?
     │      ├── YES → Offer "Quick Manage" or "Auto-Sim"
     │      └── NO  → Auto-sim the game
     │
     ▼
game-sim.js produces a GameResult
     │
     ▼
stats-tracker.js updates all player season stats
     │
     ▼
standings.js recalculates W-L, GB, division standings
     │
     ▼
Advance calendar → check for All-Star break, trade deadline, playoffs
     │
     ▼
Auto-save
```

**Key Season Events:**

| Date (approx. game day) | Event |
|---|---|
| Day 1 | Opening Day |
| Day 81 | All-Star Break (3-day pause) |
| Day 100 | Trade Deadline (non-waiver) |
| Day 162 | Regular Season Ends |
| Day 163+ | Postseason |

### 4.2 Game Simulation Engine

The game engine resolves an entire baseball game at-bat by at-bat. It is the most performance-critical and design-critical system in the project.

**At-Bat Resolution Model:**

Each plate appearance runs through a probabilistic decision tree influenced by the batter's and pitcher's attributes.

```
┌─────────────────────────────────────┐
│           PLATE APPEARANCE          │
│                                     │
│  Inputs:                            │
│    - Batter: Con, Pow, Clutch       │
│    - Pitcher: Vel, Ctrl, Brk, Stam  │
│    - Platoon: Batter hand vs Pitch  │
│    - Game state: inning, score,     │
│      runners, outs, leverage        │
│    - Fatigue: pitcher pitch count   │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │  Walk Check   │  ← f(Control, patience*)
        │  (BB / HBP)   │    * patience derived from
        └──────┬───────┘      batter's walk tendency
               │ not a walk
               ▼
        ┌──────────────┐
        │ Strikeout     │  ← f(Break, Velocity, batter Contact)
        │ Check         │
        └──────┬───────┘
               │ ball in play
               ▼
        ┌──────────────┐
        │ Contact       │  ← f(Contact, Velocity)
        │ Quality       │    Determines: groundball,
        │ Roll          │    flyball, line drive
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │  Hit/Out      │  ← f(Contact, Fielding, Speed)
        │  Determination│    Fielding of defensive players
        └──────┬───────┘    matters here
               │
        ┌──────┴──────┐
        │ HIT          │ OUT
        ▼              ▼
  ┌───────────┐  ┌───────────┐
  │ Hit Type  │  │ Out Type  │
  │ 1B/2B/3B  │  │ GO/FO/LO  │
  │ /HR       │  │ /DP/SF    │
  └───────────┘  └───────────┘
        │
        ▼  Power determines
           extra-base probability
```

**Platoon Splits:**

The batter's Contact and Power are chosen based on the pitcher's throwing hand:
- vs. RHP → use `contactR` and `powerR`
- vs. LHP → use `contactL` and `powerL`

This creates natural platoon advantages (lefty batters vs. righty pitchers and vice versa).

**Clutch and Leverage:**

Leverage Index (LI) is calculated from game state (inning, score differential, runners, outs). When LI is high (late innings, close game, runners in scoring position), the `clutch` attribute applies a modifier to all outcomes.

```javascript
function getLeverageModifier(clutch, leverageIndex) {
  // clutch: 0–99, leverageIndex: 0.0–5.0+
  // Returns a multiplier from ~0.95 to ~1.10
  const clutchFactor = (clutch - 50) / 500; // -0.1 to +0.1 range
  return 1 + (clutchFactor * Math.min(leverageIndex, 3.0));
}
```

**Pitcher Fatigue Model:**

```javascript
function getFatiguePenalty(pitcher, pitchCount) {
  const staminaThreshold = 50 + (pitcher.pitching.stamina * 0.6);
  // staminaThreshold ranges from ~50 (low stamina) to ~110 (elite stamina)
  if (pitchCount <= staminaThreshold) return 1.0; // No penalty
  const overBy = pitchCount - staminaThreshold;
  return Math.max(0.7, 1.0 - (overBy * 0.005)); // Degrades 0.5% per pitch over threshold
}
// Applied as a multiplier to Velocity, Control, and Break during at-bat sim
```

**Baserunning:**

After a hit or walk, baserunners advance according to:
- Hit type (single advances runners 1–2 bases, double 2 bases, etc.)
- Runner `speed` attribute (determines extra-base advancement probability)
- Outfielder `armStrength` (determines whether a runner can tag up or advance on a flyout)

**Stolen Base Attempts:**

AI-controlled runners attempt steals based on `steal` rating, catcher `armStrength`, pitcher `velocity` (higher = harder to steal on), and game situation (no steals when ahead by 4+, more aggressive when trailing).

**Defensive Resolution:**

Errors are rolled on every ball-in-play based on the relevant fielder's `errorResistance` and `fielding` ratings. An error converts an out into a hit (runner reaches base).

### 4.3 Quick Manage Mode

Quick Manage is the user's window into live games. Instead of watching every pitch, the game sims forward and pauses at decision points, asking the user to make strategic calls.

**Decision Points (game pauses and asks user):**

| Trigger | Decision Options |
|---|---|
| Pitcher reaches fatigue threshold | Go to bullpen (choose reliever) or leave him in |
| Runner on 1st, < 2 outs, close game | Bunt, steal, hit-and-run, or play straight |
| Bases loaded, < 2 outs | Infield in, normal depth, or concede the run |
| Pinch-hit opportunity (pitcher spot, late innings) | Choose pinch hitter from bench or let batter hit |
| Close game, 8th/9th inning | Bring in closer early? Double switch? |
| Intentional walk situation | Walk the batter or pitch to him |
| Defensive substitution | Swap in better defender for late-game lead |
| Challenge play (random event) | Challenge or don't (risk/reward) |

**Quick Manage UI Flow:**

```
┌─────────────────────────────────────┐
│         GAME DAY SCREEN             │
│                                     │
│  [Scoreboard: NYY 3, BOS 2]        │
│  [Inning: Bot 7th, 1 out]          │
│  [Runners: 1st and 3rd]            │
│                                     │
│  ┌───────────────────────────────┐  │
│  │     DECISION REQUIRED         │  │
│  │                               │  │
│  │  Your pitcher (Cole) has      │  │
│  │  thrown 98 pitches.           │  │
│  │  Stamina: ████░░  62%        │  │
│  │                               │  │
│  │  Due up: Judge, Soto, Stanton│  │
│  │                               │  │
│  │  [Leave Cole In]              │  │
│  │  [Go to Bullpen →]           │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Play Log ▼]                       │
│  "T7: Devers singles to LF"       │
│  "T7: Yoshida grounds into FC"    │
└─────────────────────────────────────┘
```

**Between decision points**, the game auto-sims and displays a scrolling play-by-play log. The user can tap "Skip to Next Decision" or let the log play out with a short delay between events for readability.

**Auto-Manage Toggle:** Users can enable auto-manage for specific decision types (e.g., always auto-manage defensive subs but always be prompted on pitching changes).

### 4.4 GM Mode

GM Mode is the between-games management layer where the user builds their franchise.

#### 4.4.1 Roster Management

- **26-Man Active Roster:** The game-day roster. Must include at least 1 C, 4 IF, 3 OF, 5 SP, and enough RP to fill the bullpen.
- **40-Man Roster:** Extended roster. Players not on the 40-man are in the minors or must be added before being called up.
- **Injured List (IL):** 10-day and 60-day IL. Players on IL don't count against the 26-man roster but do count against the 40-man.
- **Designation for Assignment (DFA):** Remove a player from the 40-man roster. They enter waivers and can be claimed by other teams.
- **Minor League System:** Simplified — players not on the 40-man are "in the minors." No full minor league simulation in the early phases.

#### 4.4.2 Trade System

**Trade Proposal Flow:**
1. User selects a trade partner team.
2. User builds a trade package (their players for the other team's players).
3. System evaluates the trade using a value model (see below).
4. AI responds: Accept, Reject, or Counter-offer.

**Player Value Model:**

```javascript
function calculateTradeValue(player) {
  let value = player.overall * 10; // Base: 490–1050

  // Age modifier (younger = more valuable)
  if (player.age <= 25) value *= 1.25;
  else if (player.age <= 28) value *= 1.10;
  else if (player.age <= 32) value *= 1.00;
  else if (player.age <= 35) value *= 0.80;
  else value *= 0.60;

  // Contract modifier (cheaper = more valuable)
  const salaryPenalty = Math.max(0, (player.salary - 10000) / 50000);
  value *= (1 - salaryPenalty * 0.3);

  // Position scarcity
  const scarcityBonus = {
    "C": 1.10, "SS": 1.08, "CF": 1.05, "SP": 1.12,
    "3B": 1.03, "2B": 1.02, "RF": 1.0, "LF": 1.0,
    "1B": 0.95, "DH": 0.90, "RP": 0.85,
  };
  value *= scarcityBonus[player.position] || 1.0;

  // Contract years (controllable years are valuable)
  value *= (1 + player.contractYearsRemaining * 0.05);

  return Math.round(value);
}
```

**AI Trade Logic:**
- AI evaluates both sides of the trade using the value model.
- Trade is accepted if the AI's side gains value or the difference is within a "noise" threshold (±5%).
- Contending teams (above .500) value win-now players higher.
- Rebuilding teams (below .400) value young, cheap players higher.
- AI will not trade franchise cornerstones (top 2 players by OVR) unless massively overpaid.

#### 4.4.3 Free Agency

Free agency occurs during the off-season between seasons.

**Market Flow:**
1. All players whose contracts expire become free agents.
2. The user can make offers (years + AAV) to any free agent.
3. AI teams also make offers based on their needs and budget.
4. After a bidding period (simulated over several off-season "days"), each free agent signs with the best offer, weighted by: total guaranteed money (60%), team competitiveness (20%), and role/playing time (20%).

**Contract Rules:**
- Minimum salary: $550K (league minimum from spreadsheet data)
- Maximum contract length: 10 years
- No-trade clauses: Automatically granted to players signed to 5+ year deals worth $15M+/year
- Qualifying offers: Top free agents carry draft pick compensation

#### 4.4.4 Amateur Draft

The draft occurs during the off-season. In the prototype, draft prospects are procedurally generated since the Top Prospects sheet only contains 30 players.

**Draft Structure:**
- 5 rounds, 30 picks per round (150 total picks)
- Draft order: Reverse order of previous season's standings (worst team picks first)
- Lottery system for top 6 picks (to prevent tanking) — optional, Phase 4+

**Prospect Generation:**

```javascript
function generateDraftProspect(round, pick) {
  // Higher picks = higher potential
  const maxOVR = Math.max(55, 95 - (round * 8) + randomInt(-5, 5));
  const currentOVR = Math.max(40, maxOVR - randomInt(10, 25));
  const position = weightedRandom(positionWeights);
  const age = randomInt(18, 22);

  return {
    name: generateName(),
    age: age,
    position: position,
    overall: currentOVR,
    potential: maxOVR,        // Hidden to user — revealed over time
    // ... generated attributes scaled to currentOVR
  };
}
```

#### 4.4.5 Finances

**Revenue Model (per season):**
- Base revenue varies by team market size ($80M–$300M)
- Attendance bonus: Winning teams draw more fans (+10% revenue per .050 above .500)
- Playoff revenue: $20M for WC, $40M for LDS, $60M for LCS, $100M for WS
- Revenue sharing: Bottom-10 revenue teams receive a share from top-10 teams

**Expenses:**
- Player payroll (sum of all 40-man salaries)
- Luxury tax: 20% penalty on payroll exceeding threshold ($241M)
- Minor league operations: Fixed $20M/year
- Scouting/development: Variable, user can allocate budget

**User Decisions:**
- Set team budget for the off-season
- Allocate scouting budget (affects draft prospect quality visibility)
- Choose to go over luxury tax or stay under

### 4.5 Player Progression and Regression

Between seasons, player attributes change based on age and performance.

**Age Curves:**

```
Peak performance window: Age 26–30
Development phase:      Age 21–25 (attributes trend upward)
Peak phase:             Age 26–30 (attributes stable or slight growth)
Decline phase:          Age 31–34 (gradual decline)
Steep decline:          Age 35+   (accelerated decline)
```

**Progression Algorithm:**

```javascript
function progressPlayer(player) {
  const age = player.age + 1; // They're aging one year
  player.age = age;

  const attributes = getAllRatableAttributes(player);

  for (const attr of attributes) {
    let change = 0;

    if (age <= 25) {
      // Development: +1 to +5 per year, weighted by potential
      change = randomInt(0, 4) + (player.potential > player.overall ? 1 : 0);
    } else if (age <= 30) {
      // Peak: -1 to +2 per year
      change = randomInt(-1, 2);
    } else if (age <= 34) {
      // Decline: -3 to +1 per year
      change = randomInt(-3, 1);
    } else {
      // Steep decline: -5 to -1 per year
      change = randomInt(-5, -1);
    }

    // Apply with a randomness factor so not all attributes move together
    if (Math.random() < 0.7) { // 70% chance each attribute changes
      player[attr] = clamp(player[attr] + change, 1, 125);
    }
  }

  // Recalculate overall
  player.overall = calculateOverall(player);

  // Injury risk increases with age
  if (age > 32) {
    player.durability = Math.max(30, player.durability - randomInt(1, 3));
  }
}
```

**Injury System:**

- Before each game, each player has a small chance of injury based on `1 - (durability / 100)`.
- Injuries range from 10-day IL stints (minor) to 60-day IL (major).
- Pitchers have higher injury rates, especially those with high pitch counts.
- Players returning from injury have temporarily reduced attributes for 5–10 games.

### 4.6 Standings, Playoffs, and Awards

**Standings:**

- Standard W-L standings per division.
- Games Back (GB) calculated from division leader.
- Wild Card standings: Top 3 non-division-winners per league.
- Tiebreakers: Head-to-head record, then division record, then run differential.
- Magic numbers calculated from September onward.

**Playoff Structure (current MLB format):**

```
Wild Card Series (Best-of-3):
  WC1 (#4 seed) vs. WC3 (#6 seed) — higher seed hosts all 3
  WC2 (#5 seed) vs. WC3...

  Corrected: 12-team format:
  4 division winners get byes (seeds 1–2 per league)
  Seeds 3–6 play Wild Card Series (best-of-3)

Division Series (Best-of-5):
  #1 seed vs. lowest remaining
  #2 seed vs. other remaining

League Championship Series (Best-of-7):
  DS winners face off

World Series (Best-of-7):
  AL champion vs. NL champion
```

**Awards (calculated at season end):**

| Award | Criteria |
|---|---|
| MVP (AL & NL) | Highest combined batting WAR approximation (uses stats + OVR) |
| Cy Young (AL & NL) | Lowest ERA among qualified SPs (162+ IP), weighted by wins/K |
| Rookie of the Year | Best stats among players age ≤ 25 in first season |
| Gold Glove (per position) | Highest fielding rating among starters at each position |
| Silver Slugger (per position) | Highest OPS among starters at each position |
| All-Star Team | Top players per position by first-half stats |
| Home Run Leader | Most HRs |
| Batting Champion | Highest AVG (min 502 PA) |
| ERA Leader | Lowest ERA (min 162 IP) |
| Strikeout Leader | Most Ks by a pitcher |

---

## 5. UI/UX Flow

### 5.1 Screen Map

```
┌─────────────┐
│  MAIN MENU  │
│             │
│ [New Game]  │───→ Team Select → Season Setup → Team Hub
│ [Continue]  │───→ Team Hub (load save)
│ [Settings]  │───→ Settings Screen
│ [About]     │
└─────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│                    TEAM HUB (Home Screen)              │
│                                                        │
│  ┌──────────┬──────────┬──────────┬──────────────┐    │
│  │ Calendar │ Roster   │  Games   │  Front Office │    │
│  │ & News   │          │          │               │    │
│  └──────────┴──────────┴──────────┴──────────────┘    │
│                                                        │
│  [Sim Day]  [Sim Week]  [Sim to Date]  [Quick Manage]  │
└──────────────────────────────────────────────────────┘
        │             │            │              │
        ▼             ▼            ▼              ▼
   ┌─────────┐  ┌─────────┐  ┌────────┐   ┌──────────┐
   │Calendar │  │ Roster  │  │Standings│   │Trade     │
   │& News   │  │ Screen  │  │& Scores │   │Center    │
   └─────────┘  └─────────┘  └────────┘   └──────────┘
                     │                          │
               ┌─────┴─────┐             ┌──────┴──────┐
               ▼           ▼             ▼             ▼
          ┌─────────┐ ┌─────────┐  ┌─────────┐  ┌─────────┐
          │ Player  │ │ Lineup  │  │  Trade   │  │  Free   │
          │ Card    │ │ Editor  │  │ Builder  │  │  Agency │
          └─────────┘ └─────────┘  └─────────┘  └─────────┘
```

### 5.2 Screen-by-Screen Breakdown

#### Main Menu
- Clean, baseball-themed splash. Team logo if continuing a save.
- "New Game" starts team selection flow.
- "Continue" loads the most recent save and jumps to Team Hub.
- "Settings" for audio, sim speed, auto-save frequency, auto-manage preferences.

#### Team Select
- Scrollable grid of all 30 team logos/names, grouped by division.
- Tap a team to see a preview: key players, overall rating, payroll, projected wins.
- "Select Team" confirms and starts a new season.

#### Team Hub (Home Screen)
- The central screen the user returns to constantly.
- **Top bar:** Team name, record (W-L), current date, payroll.
- **Middle card:** Today's game (opponent, time, probable starters) or "Off Day."
- **Quick actions:** "Sim Day," "Sim Week," "Quick Manage Today's Game."
- **Bottom navigation tabs:** Home, Roster, Games, Front Office.
- **News ticker:** Recent transactions, injuries, milestones (scrollable).

#### Roster Screen
- List of all players on the 40-man roster.
- Sortable by: Name, Position, OVR, AVG/ERA, Salary.
- Filter tabs: "Active 26," "40-Man," "Injured List," "Minors."
- Tap a player row to open the Player Card.
- "Edit Lineup" button opens the Lineup Editor.

#### Player Card (Modal/Detail Screen)
- Full-screen detail for one player.
- **Header:** Name, number, position, photo placeholder.
- **Ratings tab:** Visual bars or hexagon chart for all attributes.
- **Stats tab:** Current season batting or pitching stats (and career history in Phase 4).
- **Info tab:** Age, height, weight, bats/throws, contract details, salary.
- **Actions:** "Move to IL," "DFA," "Offer Extension" (context-dependent).

#### Lineup Editor
- Drag-and-drop (or tap-to-swap) interface for setting the batting order.
- Two tabs: "vs. RHP" and "vs. LHP."
- Visual indicators for position eligibility and platoon splits.
- "Auto-Set Lineup" button for AI-suggested optimal lineup.
- Starting rotation order (drag to reorder 5 starters).
- Bullpen role assignment: Closer, Setup, Middle Relief, Long Relief, Mop-up.

#### Game Day / Quick Manage Screen
- See section 4.3 for detailed layout.
- Scoreboard at top (linescore format: innings across the top, runs per inning).
- Current situation: Inning, outs, runners (base diagram), count.
- Decision cards slide up from bottom when user input is needed.
- Play-by-play log scrolls in the middle section.
- "Auto-Sim Rest of Game" button always available.

#### Standings & Scores
- Tab bar: "Standings," "Scores," "Leaders."
- **Standings:** Division standings with W-L, PCT, GB, L10, STRK, Home, Away.
- **Scores:** Today's scoreboard across the league. Tap any game for box score.
- **Leaders:** League leaders in key stat categories (HR, AVG, ERA, K, etc.).

#### Box Score (Detail)
- Full linescore, team totals (R, H, E).
- Batting table: Each batter's PA result (AB, R, H, RBI, BB, K).
- Pitching table: Each pitcher's line (IP, H, R, ER, BB, K, pitches).
- Game summary: WP, LP, SV, notable events.

#### Trade Center
- Browse all 29 other teams.
- Filter by team need (e.g., "teams looking for SP").
- Select a team to open the Trade Builder.
- **Trade Builder:** Two-column layout (Your players | Their players). Add/remove players from each side. "Evaluate Trade" shows the AI's likely response. "Propose Trade" submits.
- **Trade History:** Log of all completed trades this season.

#### Free Agency (Off-Season)
- List of all available free agents, sortable by position, OVR, age.
- Tap a player to see their card + "Make Offer" button.
- **Offer screen:** Sliders for years (1–10) and AAV. Shows total guaranteed money.
- Competing offers shown as vague tiers ("Strong interest from 3 teams").
- Results announced day-by-day during the off-season sim.

#### Draft Screen (Off-Season)
- Round-by-round draft board.
- When it's the user's pick: list of available prospects with scouted attributes.
- Scouted attributes have uncertainty ranges (e.g., "OVR: 65–75") unless scouting budget was high.
- "Auto-Draft" toggle for rounds the user wants to skip.

#### Settings Screen
- Sim speed (fast / normal / detailed play-by-play).
- Auto-manage preferences (toggle per decision type).
- Auto-save frequency.
- Audio on/off (Phase 5).
- Manage saves (multiple save slots in Phase 2+).
- Reset / delete save data.

### 5.3 Mobile-First Design Principles

- **Touch targets:** Minimum 44×44px for all interactive elements.
- **Bottom navigation:** Primary nav is pinned to the bottom for thumb reach.
- **Swipe gestures:** Swipe between tabs (Roster ↔ Games ↔ Front Office).
- **Pull-to-refresh:** Pull down on standings/scores to refresh (sim next batch).
- **Modal sheets:** Detail screens slide up from the bottom as half-sheets, expandable to full-screen.
- **Dark mode ready:** Use CSS custom properties for all colors. Default to matching system preference.
- **No horizontal scrolling:** All tables reflow into card layouts on narrow screens.
- **Loading states:** Skeleton screens during simulation. Never show a blank screen.

---

## 6. Phased Development Roadmap

### Phase 1 — MVP: Core Sim Engine + Season Framework
**Goal:** A playable text-based season sim with standings.
**Estimated effort:** 4–6 weeks

| Task | Description |
|---|---|
| Data pipeline | Build XLSX → JSON converter; generate `players.json` and `teams.json` |
| Game sim engine | Implement at-bat-by-at-bat simulation using player attributes |
| Season sim | 162-game schedule generator + batch sim day/week |
| Stats tracker | Accumulate batting and pitching stats from game results |
| Standings | W-L records, division standings, wild card standings |
| Basic UI shell | Main menu, team hub, roster list (read-only), standings page |
| Storage | Save/load full game state to localStorage |
| Schedule display | Calendar view showing upcoming games and results |

**Deliverable:** User selects a team, sims through a full 162-game season, views standings and basic stats. No in-game managing or roster moves yet.

### Phase 2 — Quick Manage + Game Day UI
**Goal:** Hands-on game management during simulated games.
**Estimated effort:** 3–5 weeks

| Task | Description |
|---|---|
| Quick Manage decisions | Implement all decision triggers (pitching changes, pinch hits, strategy calls) |
| Game Day UI | Scoreboard, base diagram, play-by-play log, decision cards |
| Box scores | Post-game box score screen with full batting/pitching lines |
| Pitcher fatigue | Implement pitch count tracking and fatigue degradation |
| Bullpen management | Closer/setup/middle relief roles, warmup system |
| Lineup editor | UI for setting batting order and rotation for user's team |
| Auto-manage options | Toggle which decisions to auto-handle vs. prompt |

**Deliverable:** User can Quick Manage their team's games, making real strategic decisions. Full box scores available.

### Phase 3 — Full GM Mode
**Goal:** Complete front-office management.
**Estimated effort:** 5–7 weeks

| Task | Description |
|---|---|
| Trade system | Trade builder UI, AI evaluation logic, counter-offers |
| AI trade behavior | AI teams initiate trades, respond to proposals, make deadline moves |
| Free agency | Off-season free agent market, bidding, AI competition |
| Amateur draft | Prospect generation, draft UI, scouting system |
| Finances | Payroll tracking, budget, luxury tax, revenue model |
| Roster rules | 26/40-man roster enforcement, IL management, DFA, waivers |
| Off-season flow | Structured off-season: free agency period → draft → spring training |
| Transaction log | History of all trades, signings, roster moves |

**Deliverable:** Full franchise management loop. User can trade, sign free agents, draft prospects, and manage payroll.

### Phase 4 — Multi-Season Dynasty + Depth
**Goal:** Long-term franchise play.
**Estimated effort:** 4–6 weeks

| Task | Description |
|---|---|
| Player progression | Off-season attribute changes based on age curves |
| Multi-season saves | Season history, career stat tracking |
| Injury system | In-game and pre-game injuries, IL management |
| Playoffs | Full postseason bracket, series sim with Quick Manage |
| Awards | End-of-season awards (MVP, Cy Young, ROY, etc.) |
| Hall of Fame | Career milestone tracking, HOF induction for retired players |
| Draft class quality | Draft classes improve over time; occasional generational talents |
| AI team management | AI teams make off-season moves (trades, signings, draft picks) |
| IndexedDB migration | Move storage to IndexedDB for larger datasets |

**Deliverable:** True dynasty mode — play through multiple seasons, watch players develop and decline, build a legacy.

### Phase 5 — Polish, PWA, and Presentation
**Goal:** Release-quality experience.
**Estimated effort:** 4–8 weeks

| Task | Description |
|---|---|
| Art direction | Team logos (SVG), UI polish, color themes per team |
| Animations | Screen transitions, score reveals, hit animations (CSS/SVG) |
| Sound design | Crowd noise, bat crack, organ jingles, notification sounds |
| PWA | manifest.json, service worker for offline play, install-to-home-screen |
| Performance audit | Profile on real iPhone, optimize large lists, reduce bundle size |
| Onboarding | First-time tutorial, tooltips, help system |
| Accessibility | Screen reader labels, keyboard nav, high contrast mode |
| Multiple save slots | Support for 3+ concurrent franchise saves |
| Sharing | Share season results, trade screenshots, standings on social |

**Deliverable:** A polished, installable baseball franchise sim that feels like a real mobile app.

### Stretch Goals (Post-Launch)

- **Multiplayer leagues:** Multiple human GMs in the same league via cloud sync.
- **Historical rosters:** Import rosters from different eras.
- **Custom teams:** Create expansion teams or fantasy teams.
- **Advanced analytics:** WAR, wRC+, FIP, xBA displayed alongside traditional stats.
- **Mod support:** User-importable roster files.
- **Minor league depth:** Full minor league system with A/AA/AAA levels.

---

## 7. Data Pipeline

### 7.1 Overview

The roster spreadsheet is the single source of truth for initial player data. A Node.js conversion script reads the XLSX file and produces the JSON files the game consumes at runtime.

### 7.2 XLSX → JSON Conversion Script

**Location:** `tools/xlsx-to-json.js`

**Dependencies:** `xlsx` (SheetJS) npm package

**Usage:**
```bash
node tools/xlsx-to-json.js path/to/MLB_TheShow26_Rosters_FINAL_v10.xlsx
```

**Output files:**
- `js/data/players.json` — Array of all player objects
- `js/data/teams.json` — Array of all team objects with roster assignments

### 7.3 Conversion Logic (Pseudocode)

```javascript
const XLSX = require('xlsx');

function convertRosterFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const players = [];
  const teams = [];

  // Team sheet mapping
  const teamSheets = {
    "New York Yankees":       { id: "NYY", abbr: "NYY", league: "AL", division: "East" },
    "Boston Red Sox":         { id: "BOS", abbr: "BOS", league: "AL", division: "East" },
    "Baltimore Orioles":      { id: "BAL", abbr: "BAL", league: "AL", division: "East" },
    // ... all 30 teams
  };

  // Position code mapping (from MVP Pos number to position string)
  const positionMap = {
    1: "SP", 2: "RP", 3: "C", 4: "1B", 5: "2B",
    6: "3B", 7: "SS", 8: "LF", 9: "CF", 10: "RF", 11: "DH"
  };

  for (const [sheetName, teamInfo] of Object.entries(teamSheets)) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const teamRoster = [];

    for (const row of rows) {
      // Skip header/label rows (no Jersey #)
      if (!row['Jersey #']) continue;

      const playerId = generateId(row['Full Name'], teamInfo.id);

      const player = {
        id: playerId,
        name: row['Full Name'],
        jerseyNumber: row['Jersey #'],
        position: row['Position'],
        secondaryPosition: positionMap[row['2nd Pos']] || null,
        teamId: teamInfo.id,
        height: row['HT'],
        weight: row['WT'],
        age: row['Age'],
        overall: row['TS26 OVR'],
        bats: row['B/T'].split('/')[0],     // "R/R" → "R"
        throws: row['B/T'].split('/')[1],    // "R/R" → "R"
        salary: row['Salary $K'],
        condition: row['Condition'],

        batting: {
          contactL: row['Con L'],
          contactR: row['Con R'],
          powerL: row['Pow L'],
          powerR: row['Pow R'],
          speed: row['Speed'],
          steal: row['Steal'],
          clutch: row['Clutch'],
        },

        fielding: {
          rating: row['Fielding'],
          armStrength: row['Arm Str'],
          armAccuracy: row['Arm Acc'],
          errorResistance: row['Err Res'],
        },

        pitching: {
          velocity: row['Velocity'],
          control: row['Control'],
          stamina: row['Stamina'],
          break: row['Break'],
          pitches: buildPitchArray(row),
        },

        durability: row['Durability'],
        nationality: row['Nationality'],

        // Metadata (for future visual use)
        meta: {
          pitchDelivery: row['Pitch Del'],
          batStance: row['Bat Stance'],
          faceId: row['Face ID'],
          skinTone: row['Skin Tone'],
        },

        // Initialized at runtime
        seasonStats: { batting: {}, pitching: {} },
        contractYearsRemaining: estimateContractYears(row),
        contractAAV: row['Salary $K'],
      };

      players.push(player);
      teamRoster.push(playerId);
    }

    teams.push({
      ...teamInfo,
      name: sheetName,
      roster40Man: teamRoster,
      roster26Man: teamRoster.slice(0, 26),
    });
  }

  // Handle Free Agents - Legends
  // These populate the free agent pool
  const legendSheet = workbook.Sheets['Free Agents - Legends'];
  const legendRows = XLSX.utils.sheet_to_json(legendSheet);
  for (const row of legendRows) {
    if (!row['Jersey #']) continue;
    const player = buildPlayerObject(row, "FA");
    player.teamId = "FA"; // Free agent
    players.push(player);
  }

  // Handle Top Prospects
  // These have limited data; generate remaining attributes
  const prospectSheet = workbook.Sheets['Top Prospects (Non-40-Man)'];
  const prospectRows = XLSX.utils.sheet_to_json(prospectSheet);
  for (const row of prospectRows) {
    if (!row['Full Name']) continue;
    const prospect = buildProspectObject(row);
    players.push(prospect);
  }

  return { players, teams };
}

function buildPitchArray(row) {
  const pitches = [];
  for (let i = 1; i <= 4; i++) {
    const type = row[`P${i} Type`];
    const rating = row[`P${i} Rat`];
    if (type && rating > 0) {
      pitches.push({ type, rating });
    }
  }
  return pitches;
}

function estimateContractYears(row) {
  // Heuristic: higher salary = more years remaining
  const salary = row['Salary $K'];
  const age = row['Age'];
  if (salary >= 20000) return Math.max(1, Math.min(7, 35 - age));
  if (salary >= 10000) return Math.max(1, Math.min(5, 33 - age));
  if (salary >= 5000) return Math.max(1, 3);
  return 1; // Pre-arb or arb-eligible
}
```

### 7.4 Data Validation Checklist

After conversion, verify:

- [ ] Total player count matches expected (~845 team players + 50 legends + 30 prospects)
- [ ] Every player has a valid position (SP, RP, C, 1B, 2B, 3B, SS, LF, CF, RF, DH, TWP)
- [ ] All numeric attributes are within expected ranges (0–125 for batting, 0–99 for others)
- [ ] Pitchers (SP/RP) have non-zero pitching attributes (Velocity, Control, Stamina, Break)
- [ ] Position players have zero or near-zero pitching attributes
- [ ] Each team has 20–40 players
- [ ] Salary values are reasonable ($550K minimum, $40,000K maximum)
- [ ] No duplicate player IDs
- [ ] B/T field correctly splits into separate bats/throws values
- [ ] Pitch repertoire arrays are populated for all pitchers

### 7.5 Handling Special Cases

**Two-Way Players (TWP):** The spreadsheet includes players with position "TWP" (e.g., Shohei Ohtani). These players have both batting and pitching attributes populated. The game engine should treat them as eligible for both SP/RP roles and any batting lineup position.

**Free Agents - Legends:** These 50 players are classic/retro players with boosted stats (OVR up to 105). They populate the initial free agent pool and can be signed by any team in the first off-season. This adds a fun "what-if" element to franchise play.

**Top Prospects:** The prospects sheet has limited data (Rank, Name, Org, Pos, HT, WT, OVR). Missing attributes (Contact, Power, Speed, etc.) must be generated algorithmically based on the prospect's OVR, position, and some randomness. Their affiliated organization (`Org` column) determines which team's minor league system they belong to.

---

## 8. Card System & Visual Assets

### 8.1 Player Silhouette Images

The game uses **6 player silhouette images** as the core visual element on player cards. Each silhouette is a stylized, flat-color figure depicting a baseball player in a characteristic pose:

| # | Silhouette | Description |
|---|---|---|
| 1 | Right-handed pitcher | Delivery stride, right arm extended back |
| 2 | Left-handed pitcher | Mirror of above, left arm extended back |
| 3 | Right-handed hitter | Mid-swing from the left side of the plate (right-handed bat grip) |
| 4 | Left-handed hitter | Mid-swing from the right side of the plate (left-handed bat grip) |
| 5 | Right-handed fielder | Athletic ready position or throwing motion, right arm |
| 6 | Left-handed fielder | Mirror of above, left arm |

### 8.2 Silhouette Assignment Logic

Each player is assigned one of the 6 silhouettes based on their role and handedness. The logic runs in priority order:

1. **Star hitters** (high Contact or Power ratings) → **Hitting silhouette** matching their bat hand (`Bats` field).
2. **Star pitchers** (high OVR as SP, RP, or CP) → **Pitching silhouette** matching their throw hand (`Throws` field).
3. **Everyone else** → **Fielding silhouette** matching their throw hand (`Throws` field).
4. **Two-way players** (position = TWP) → **Pitching silhouette** matching their throw hand. Pitching is the rarer and more impressive skill, so it takes visual priority.

> **Threshold guidance:** "Star" thresholds should be tunable, but reasonable defaults are Contact ≥ 85 OR Power ≥ 85 for star hitters, and OVR ≥ 80 for star pitchers. If a player qualifies as both a star hitter and a star pitcher (rare outside of TWP), the pitching silhouette wins.

### 8.3 Card Tier System

Player cards have a visual tier based on OVR rating. These tiers use **custom ranges unique to this game** — they do not match MLB The Show or any other existing card game.

| Tier | OVR Range | Visual Treatment |
|---|---|---|
| **Crown** | 99+ | Animated shimmer effect. Deep purple/black gradient background with gold lightning bolt accents. Reserved for the most elite players and legends. |
| **Diamond** | 95–98 | Dark background with bright diamond-pattern overlay. Team primary color accent along the border. |
| **Platinum** | 90–94 | Sleek platinum/white-chrome gradient with ice-blue accents. Clean, premium feel. |
| **Gold** | 80–89 | Rich gold gradient with subtle geometric pattern. The most common tier for quality starters. |
| **Silver** | 70–79 | Metallic silver gradient with clean lines. Solid everyday players. |
| **Bronze** | 55–69 | Warm bronze/copper tones. Bench players, prospects, and depth pieces. |
| **Common** | Below 55 | Simple solid team color background, minimal pattern. Minor leaguers and roster filler. |

### 8.4 Dynamic Card Generation

Player cards are **assembled dynamically at render time** — no pre-generated card images are stored. This keeps the asset footprint tiny and allows cards to update instantly when ratings change (progression, regression, trades, etc.).

**Rendering layers (bottom to top):**

1. **Background layer:** Card template rectangle with rounded corners.
2. **Color tint:** Filled with a gradient derived from the player's team colors (primary → secondary).
3. **Border/trim pattern:** Tier-specific decorative elements (see §8.3). Crown gets an animated CSS shimmer; other tiers use static patterns.
4. **Silhouette layer:** The position-based silhouette image (see §8.2), tinted with the team's secondary color to unify the visual.
5. **Name plate:** Player name, team abbreviation, and primary position displayed in a bar across the bottom third.
6. **Stats overlay:** Key stats pulled from live game data — for hitters: AVG / HR / RBI / OPS; for pitchers: ERA / W-L / K / WHIP.

**Implementation:** HTML Canvas or layered CSS (absolute-positioned divs with `mix-blend-mode`) — either approach works for the MVP. Canvas may be preferable for the Crown shimmer animation.

### 8.5 Other HUD Assets

Beyond player cards, the following visual assets are planned:

- **Team logos (×30):** Custom-designed logos for all 30 teams. AI-generated base art, cleaned up manually. SVG format for crisp rendering at any size.
- **Stadium pictures (×30):** One per team. Stylized/illustrated aesthetic (not photorealistic). Used as backgrounds on the team hub and game-day screens.
- **Baseball diamond graphic:** Top-down view of the infield diamond for displaying base runners during Quick Manage. 1:1 aspect ratio. Shows bases, runner dots, and fielder positions.
- **Scoreboard graphic:** 16:9 retro chalkboard-style scoreboard for box score display. Inning-by-inning line score, R/H/E totals, and pitcher matchup.
- **Team color schemes:** Each team defines `primaryColor`, `secondaryColor`, and `accentColor` in `teams.json`. These values drive dynamic theming across every screen — card backgrounds, header bars, button accents, and chart colors.
- **Weather/time-of-day overlays:** Semi-transparent overlays for game-day atmosphere. Day game (bright), night game (dark/stadium lights), rain delay (grey wash), dome (neutral). Applied as a CSS filter or overlay layer on the game-day screen.

### 8.6 Realism Rules

The following realism rules are confirmed for implementation. They govern AI team behavior, player progression, and in-game strategy to produce believable, baseball-authentic outcomes.

#### Trade Realism

- **Franchise players are nearly untouchable** unless the team is in full rebuild mode AND the return is a massive prospect haul.
- **Salary considerations matter** — AI teams cannot trade for players they can't afford under their current payroll.
- **Contenders buy at the deadline, rebuilders sell.** Trade deadline behavior is driven by playoff probability.
- **Divisional rivals rarely trade with each other.** Intra-division trade probability is significantly reduced.

#### Roster & Lineup Realism

- **Lineup construction follows real baseball logic:** speed/OBP guys at the top, power bats in the 3–4 hole, weaker hitters at the bottom.
- **Platoon advantages matter.** AI managers consider L/R matchups when setting lineups and making in-game substitutions.
- **Closers only pitch the 9th in save situations.** Setup men handle the 7th–8th; closers aren't wasted in blowouts.

#### Season Realism

- **Hot/cold streaks:** Players can enter hot streaks (boosted performance for 1–3 weeks) or cold slumps. Probability influenced by Clutch rating and randomness.
- **Injury probability:** Players have a per-game injury chance influenced by age, durability rating, and workload. Injuries range from day-to-day to season-ending.
- **September callups:** Rosters expand in September. AI teams promote top minor league talent for a look.

#### Draft & Prospect Development

- **High draft picks take 2–4 years to reach the majors.** No instant impact from first-round picks.
- **Top prospects develop faster on teams with better farm systems.** Organization quality (a hidden or derived rating) affects development speed.
- **Some prospects bust.** Development includes randomness — not every top-10 pick becomes a star.

#### Free Agency

- **Big market teams spend more aggressively.** Payroll budgets and spending behavior vary by market size.
- **Players prefer contenders when offers are close.** A team with a recent winning record gets a small edge in free agent negotiations.
- **Hometown discounts are possible.** Players who are already on a team may accept slightly less to stay.
- **QO system (Qualifying Offers):** Teams that sign a free agent who declined a qualifying offer lose a draft pick. This creates realistic market dynamics where mid-tier free agents may struggle to find suitors.

#### In-Game Strategy

- **Pitchers pulled after ~100 pitches unless dealing.** Pitch count is the primary fatigue driver, with a soft cap around 100 and a hard cap that varies by stamina rating.
- **Intentional walks** with first base open and a dangerous hitter up (especially late in close games).
- **Defensive shifts** against pull-heavy hitters. Shift effectiveness is influenced by the hitter's spray chart tendencies.
- **Pinch runners late in close games.** AI managers sub in speed guys in the 8th–9th of tight games.

#### Financial Realism

- **Luxury tax threshold with escalating penalties.** Teams that exceed the threshold pay increasing tax rates for consecutive years over.
- **Revenue sharing.** A portion of league-wide revenue is redistributed, giving small-market teams a financial floor.
- **Arbitration raises based on performance.** Pre-free-agency players earn raises through arbitration, with raise amounts driven by their stats and service time.
- **Team payroll affects available budget.** The GM screen shows a clear budget bar: committed salary vs. remaining cap room.

> **Note:** A chemistry & morale system has been considered but is **deferred to a later development phase.** The realism rules above provide sufficient behavioral depth for the MVP and early post-launch updates.

---

## 9. Appendices

### 9.1 Position Code Reference

| MVP Pos Code | Position | Full Name |
|---|---|---|
| 1 | SP | Starting Pitcher |
| 2 | RP | Relief Pitcher |
| 3 | C | Catcher |
| 4 | 1B | First Base |
| 5 | 2B | Second Base |
| 6 | 3B | Third Base |
| 7 | SS | Shortstop |
| 8 | LF | Left Field |
| 9 | CF | Center Field |
| 10 | RF | Right Field |
| 11 | DH | Designated Hitter |

### 9.2 Pitch Type Reference

From the spreadsheet data, the following pitch types appear:

| Pitch Type | Description |
|---|---|
| 4-Seam | Four-seam fastball (highest velocity) |
| Sinker | Two-seam fastball (more movement, less velocity) |
| Cutter | Cut fastball (sharp lateral break) |
| Slider | Breaking ball (lateral + downward break) |
| Changeup | Off-speed pitch (reduced velocity, arm-side fade) |
| Splitter | Split-finger fastball (sharp downward break) |
| Curveball | Mentioned in data (large downward break) |

### 9.3 Team List with Division Alignment

**American League East:** New York Yankees, Boston Red Sox, Baltimore Orioles, Tampa Bay Rays, Toronto Blue Jays

**American League Central:** Chicago White Sox, Cleveland Guardians, Detroit Tigers, Kansas City Royals, Minnesota Twins

**American League West:** Athletics, Houston Astros, Los Angeles Angels, Seattle Mariners, Texas Rangers

**National League East:** Atlanta Braves, Miami Marlins, New York Mets, Philadelphia Phillies, Washington Nationals

**National League Central:** Chicago Cubs, Cincinnati Reds, Milwaukee Brewers, Pittsburgh Pirates, St. Louis Cardinals

**National League West:** Arizona Diamondbacks, Colorado Rockies, Los Angeles Dodgers, San Diego Padres, San Francisco Giants

### 9.4 Salary Distribution Summary

From the spreadsheet data: salaries range from $550K (league minimum) to $40,000K (Aaron Judge). The median salary is approximately $5,000K. This data informs the financial model's budget constraints and free agency pricing.

### 9.5 Key Technical Decisions Log

| Decision | Rationale |
|---|---|
| Vanilla JS over React/Vue | Zero build step for MVP; faster iteration; smaller bundle; avoids framework lock-in |
| localStorage before IndexedDB | Simpler API; sufficient for single-save prototype; migrate when needed |
| Pre-generated schedule | Generating 2,430 games (162 × 30 / 2) is a one-time cost; avoids runtime complexity |
| Seeded RNG | Allows reproducible simulations for debugging and "replays" |
| At-bat resolution (not pitch-by-pitch) | Plate appearance is the minimum resolution needed for meaningful Quick Manage decisions without excessive granularity |
| Attribute scale 0–125 (batting) / 0–99 (other) | Directly imported from MLB The Show ratings; no need to rescale |
| Pitch-count-based fatigue | Simpler and more intuitive than a complex energy model; aligns with real baseball analytics |

---

*This document is a living plan. Update it as design decisions are made and development progresses.*
