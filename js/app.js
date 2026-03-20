/**
 * Baseball Franchise Simulator — Main Application Controller
 */
'use strict';

const App = {
  state: null,

  // ── Init ──────────────────────────────────────────────────────────────────

  init() {
    if (!window.PLAYERS_DATA) {
      document.getElementById('app').innerHTML = `
        <div class="error-screen">
          <h2>⚾ Data Missing</h2>
          <p>Run the data converter first:</p>
          <code>cd tools && npm install && npm run convert</code>
        </div>`;
      return;
    }

    // Build player lookup map
    this.playerMap = {};
    for (const p of window.PLAYERS_DATA) {
      this.playerMap[p.id] = p;
    }

    // Set up global click delegation ONCE — never add this listener again
    document.getElementById('app').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      this._handleAction(btn.dataset.action, btn.dataset);
    });

    const save = SaveManager.load();
    if (save) {
      this.state = save;
      // Ensure new state fields exist for saves created before these features
      this._migrateState();
      // Restore any draft prospects to playerMap
      this._restoreProspects();
      this.go('teamHub');
    } else {
      this.go('mainMenu');
    }
  },

  // ── State Migration (backward compat) ─────────────────────────────────────

  _migrateState() {
    if (!this.state) return;
    if (!this.state.injuries)          this.state.injuries = {};
    if (!this.state.playerStreaks)     this.state.playerStreaks = {};
    if (!this.state.tradeDeadlineDone) this.state.tradeDeadlineDone = false;
    if (!this.state.allStarDone)       this.state.allStarDone = false;
    if (!this.state.allStarResult)     this.state.allStarResult = null;
    if (!this.state.playoffs)          this.state.playoffs = null;
    if (!this.state.awards)            this.state.awards = null;
    if (!this.state.offseasonPhase)    this.state.offseasonPhase = null;
    if (!this.state.draftNews)         this.state.draftNews = [];
    if (!this.state.faNews)            this.state.faNews = [];
    // v1.2 fields
    if (!this.state.lineups)              this.state.lineups = {};
    if (!this.state.rotations)            this.state.rotations = {};
    if (!this.state.bullpenRoles)         this.state.bullpenRoles = {};
    if (!this.state.tradeHistory)         this.state.tradeHistory = [];
    if (!this.state.freeAgentPool)        this.state.freeAgentPool = [];
    if (!this.state.pendingInjuryPopups)  this.state.pendingInjuryPopups = [];
    if (!this.state.pendingReturnPopups)  this.state.pendingReturnPopups = [];
    if (!this.state.pendingTradeOffers)   this.state.pendingTradeOffers = [];
    // v2.0 fields
    if (!this.state.careerStats)          this.state.careerStats = {};
    if (!this.state.hofMembers)           this.state.hofMembers = [];
    if (!this.state.waiverPool)           this.state.waiverPool = [];
    if (!this.state.achievements)         this.state.achievements = {};
    if (!this.state.triggeredMilestones)  this.state.triggeredMilestones = {};
    if (!this.state.pendingAchievements)  this.state.pendingAchievements = [];
    if (!this.state.pendingMilestones)    this.state.pendingMilestones = [];
    if (!this.state.pendingHOF)           this.state.pendingHOF = [];
    if (!this.state.gameRecaps)           this.state.gameRecaps = {};
    if (!this.state.seasonRecaps)         this.state.seasonRecaps = [];
    if (!this.state.rosterExpanded)       this.state.rosterExpanded = false;
    if (this.state.pendingDecision === undefined) this.state.pendingDecision = null;
  },

  /** Restore prospects added via draft to playerMap (they're stored in state, not PLAYERS_DATA) */
  _restoreProspects() {
    if (!this.state?.draftProspects) return;
    for (const p of this.state.draftProspects) {
      if (!this.playerMap[p.id]) {
        this.playerMap[p.id] = p;
      }
    }
  },

  // ── Navigation ────────────────────────────────────────────────────────────

  go(screen, params = {}) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.scrollTop = 0;

    switch (screen) {
      case 'mainMenu':     app.innerHTML = Screens.mainMenu(this); break;
      case 'teamSelect':   app.innerHTML = Screens.teamSelect(this); break;
      case 'teamHub':      app.innerHTML = Screens.teamHub(this, params); break;
      case 'roster':       app.innerHTML = Screens.roster(this, params); break;
      case 'standings':    app.innerHTML = Screens.standings(this, params); break;
      case 'boxScore':     app.innerHTML = Screens.boxScore(this, params); break;
      case 'leaders':      app.innerHTML = Screens.leaders(this, params); break;
      case 'schedule':     app.innerHTML = Screens.schedule(this, params); break;
      case 'playerCard':   app.innerHTML = Screens.playerCard(this, params); break;
      case 'playoffs':     app.innerHTML = Screens.playoffs(this, params); break;
      case 'awards':       app.innerHTML = Screens.awards(this, params); break;
      case 'offseason':    app.innerHTML = Screens.offseason(this, params); break;
      case 'lineup':       app.innerHTML = Screens.lineup(this, params); break;
      case 'rotation':     app.innerHTML = Screens.rotation(this, params); break;
      case 'tradeCenter':  app.innerHTML = Screens.tradeCenter(this, params); break;
      case 'frontOffice':  app.innerHTML = Screens.frontOffice(this, params); break;
      case 'freeAgency':   app.innerHTML = Screens.freeAgency(this, params); break;
      case 'waiverWire':   app.innerHTML = Screens.waiverWire(this, params); break;
      case 'trophyCase':   app.innerHTML = Screens.trophyCase(this, params); break;
      case 'hofTracker':   app.innerHTML = Screens.hofTracker(this, params); break;
      case 'seasonRecap':  app.innerHTML = Screens.seasonRecap(this, params); break;
      default:             app.innerHTML = Screens.teamHub(this, params);
    }

    this._bindNav(screen, params);
  },

  _bindNav(screen) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.screen === screen);
    });
  },

  _handleAction(action, data) {
    switch (action) {
      case 'newGame':        this.go('teamSelect'); break;
      case 'continue':       this.go('teamHub'); break;
      case 'selectTeam':     this.startNewGame(data.teamId); break;
      case 'nav':            this.go(data.screen); break;
      case 'simDay':         this.simDay(); break;
      case 'simWeek':        this.simWeek(); break;
      case 'simSeason':      this.simSeason(); break;
      case 'viewBoxScore':   this.go('boxScore', { gameId: data.gameId }); break;
      case 'viewPlayer':     this.go('playerCard', { playerId: data.playerId }); break;
      case 'deleteSave':     this.deleteSave(); break;
      case 'startPlayoffs':  this.startPlayoffs(); break;
      case 'viewPlayoffs':   this.go('playoffs'); break;
      case 'viewAwards':     this.go('awards'); break;
      case 'runFreeAgency':  this.runFreeAgency(); break;
      case 'runDraft':       this.runDraft(); break;
      case 'startNewSeason': this.startNewSeason(); break;
      case 'viewOffseason':  this.go('offseason'); break;
      // Lineup / Rotation
      case 'lineupTap':      this._lineupTap(parseInt(data.slot)); break;
      case 'rotationTap':    this._rotationTap(parseInt(data.slot)); break;
      case 'setBullpenRole': this._setBullpenRole(data.playerId, data.role); break;
      // Trades
      case 'selectTradeOpponent': this._selectTradeOpponent(data.teamId); break;
      case 'toggleMyTradePick':   this._toggleMyTradePick(data.playerId); break;
      case 'toggleTheirTradePick':this._toggleTheirTradePick(data.playerId); break;
      case 'proposeTrade':        this._proposeTrade(); break;
      case 'clearTrade':          this._clearTrade(); break;
      // Free Agency
      case 'showFreeAgency':  this._showFreeAgency(); break;
      case 'signFreeAgent':   this._signFreeAgent(data.playerId); break;
      // AI Trade Offers
      case 'acceptTradeOffer': this._acceptTradeOffer(data.offerId); break;
      case 'rejectTradeOffer': this._rejectTradeOffer(data.offerId); break;
      // Popups
      case 'dismissPopup':       this._dismissPopup(); break;
      case 'dismissAchievement': this._dismissAchievement(); break;
      case 'dismissHOF':         this._dismissHOF(); break;
      // Manager decisions
      case 'makeDecision':   this._makeDecision(data.key); break;
      case 'skipDecision':   this._skipDecision(); break;
      // Waiver wire
      case 'claimWaiver':    this._claimWaiver(data.playerId); break;
      // Navigation new screens
      case 'viewSeasonRecap': this.go('seasonRecap'); break;
      // Sound
      case 'toggleSound':    this._toggleSound(); break;
    }
  },

  // ── New Game ──────────────────────────────────────────────────────────────

  startNewGame(teamId) {
    const teams = TEAMS_META;
    const teamMeta = teams.find(t => t.id === teamId);
    if (!teamMeta) return;

    // Build team objects with rosters from player data
    const allTeams = teams.map(tm => {
      const rosterPlayers = PLAYERS_DATA.filter(p => p.teamId === tm.id);
      return {
        ...tm,
        roster: rosterPlayers.map(p => p.id),
        record: { wins: 0, losses: 0 },
        runsFor: 0,
        runsAgainst: 0,
        streak: { type: 'W', count: 0 },
        gamesPlayed: 0,
        startingRotationIdx: 0,
      };
    });

    // Generate schedule
    const schedule = generateSchedule(teams);

    this.state = {
      version:    '1.1.0',
      saveDate:   new Date().toISOString(),
      season:     { year: 2026, currentDay: 0, phase: 'regular_season', totalGames: schedule.length },
      userTeamId: teamId,
      teams:      allTeams,
      teamRecords:{},
      schedule,
      seasonStats: initSeasonStats(),
      boxScores:   [],
      news:        [`Season started! You are managing the ${teamMeta.full}.`],
      // New feature state
      injuries:          {},
      playerStreaks:      {},
      tradeDeadlineDone: false,
      allStarDone:       false,
      allStarResult:     null,
      playoffs:          null,
      awards:            null,
      offseasonPhase:    null,
      draftNews:         [],
      faNews:            [],
      draftProspects:    [],
      // v1.2
      lineups:              {},
      rotations:            {},
      bullpenRoles:         {},
      tradeHistory:         [],
      freeAgentPool:        [],
      pendingInjuryPopups:  [],
      pendingReturnPopups:  [],
      pendingTradeOffers:   [],
      // v2.0
      careerStats:          {},
      hofMembers:           [],
      waiverPool:           [],
      achievements:         {},
      triggeredMilestones:  {},
      pendingAchievements:  [],
      pendingMilestones:    [],
      pendingHOF:           [],
      gameRecaps:           {},
      seasonRecaps:         [],
      rosterExpanded:       false,
      pendingDecision:      null,
    };

    // Init team records
    for (const t of allTeams) {
      this.state.teamRecords[t.id] = { wins: 0, losses: 0, runsFor: 0, runsAgainst: 0, streak: { type: 'W', count: 0 } };
    }

    // Generate waiver pool
    if (typeof generateWaiverPool === 'function') {
      this.state.waiverPool = generateWaiverPool(this.playerMap, teamId, 40);
    }

    SaveManager.save(this.state);
    this.go('teamHub');
  },

  // ── Simulation ────────────────────────────────────────────────────────────

  simDay() {
    if (!this.state) return;

    // Unlock audio on first user interaction
    if (typeof Sound !== 'undefined') Sound.unlock();

    // If in playoffs phase, sim the playoffs
    if (this.state.season.phase === 'playoffs') {
      this.startPlayoffs();
      return;
    }

    const { currentDay } = this.state.season;
    const nextDay = currentDay + 1;

    // ── Manager Decision Gate ──────────────────────────────────────────────
    // If we already showed a decision for this day, clear it and continue.
    // If no decision yet and user has a game, maybe create one.
    if (this.state.pendingDecision) {
      // Decision was shown but user tapped Sim Day again = skip it
      this.state.pendingDecision = null;
    } else {
      const userGame = this.state.schedule.find(g =>
        g.day === nextDay && g.status === 'scheduled' &&
        (g.homeTeamId === this.state.userTeamId || g.awayTeamId === this.state.userTeamId)
      );
      if (userGame && this.state.decisionUsedForDay !== nextDay && Math.random() < 0.45) {
        const oppId = userGame.homeTeamId === this.state.userTeamId
          ? userGame.awayTeamId : userGame.homeTeamId;
        if (typeof createManagerDecision === 'function') {
          this.state.pendingDecision = createManagerDecision(
            this.state.userTeamId, oppId, this.playerMap, TEAMS_META
          );
          this.state.decisionUsedForDay = nextDay;
          SaveManager.save(this.state);
          this.go('teamHub', { showDecision: true });
          return;
        }
      }
    }

    // Find games scheduled for today
    const todayGames = this.state.schedule.filter(
      g => g.day === nextDay && g.status === 'scheduled'
    );

    if (todayGames.length === 0) {
      this.state.season.currentDay = nextDay;
      this._advanceDayEffects(nextDay, []);
      this._checkSeasonEnd();
      SaveManager.save(this.state);
      this.go('teamHub', { simMessage: `Day ${nextDay}: Off day.` });
      return;
    }

    // ── Rainout Check ─────────────────────────────────────────────────────
    const rainedOut = this._checkRainout(todayGames, nextDay);
    if (rainedOut) {
      this.state.season.currentDay = nextDay;
      this._advanceDayEffects(nextDay, []);
      this._checkSeasonEnd();
      SaveManager.save(this.state);
      this.go('teamHub', { simMessage: `☔ Day ${nextDay}: Rain delay! Game rescheduled as doubleheader.` });
      return;
    }

    // ── September Roster Expansion ─────────────────────────────────────────
    if (nextDay >= 130 && !this.state.rosterExpanded) {
      this.state.rosterExpanded = true;
      this.state.news.unshift('📋 September — Rosters expanded to 40 players!');
    }

    // Build game counts for rotation
    const teamGameCounts = {};
    for (const t of this.state.teams) {
      teamGameCounts[t.id] = (this.state.teamRecords[t.id]?.wins || 0) +
                              (this.state.teamRecords[t.id]?.losses || 0);
    }

    // Apply decision modifier (if user made a decision choice)
    const streaks = { ...(this.state.playerStreaks || {}) };
    const decMod = this.state.decisionMod || 0;
    if (decMod !== 0) {
      for (const p of Object.values(this.playerMap)) {
        if (p.teamId === this.state.userTeamId) {
          streaks[p.id] = { ...(streaks[p.id] || {}), mod: ((streaks[p.id]?.mod) || 0) + decMod };
        }
      }
      this.state.decisionMod = 0;
    }

    const gameOptions = {
      injuries: this.state.injuries || {},
      streaks,
    };

    let userGameResult = null;
    const todayGameStats = [];

    for (const game of todayGames) {
      const result = simulateGame(
        game.homeTeamId,
        game.awayTeamId,
        this.playerMap,
        teamGameCounts,
        game.gameId,
        this.state.seasonStats,
        gameOptions
      );

      game.status = 'completed';
      game.result = result;

      applyGameStats(this.state.seasonStats, result);
      this._applyTeamResult(result);
      todayGameStats.push(result.gameStats);

      // Post-game injury rolls
      this._rollGameInjuries(result);

      // Store box score (only for user team games to save space)
      if (game.homeTeamId === this.state.userTeamId ||
          game.awayTeamId === this.state.userTeamId) {
        this.state.boxScores.push(result);
        userGameResult = result;

        // ── Game Recap ───────────────────────────────────────────────────
        if (typeof generateGameRecap === 'function') {
          const homeMeta = TEAMS_META.find(t => t.id === result.homeTeamId) || {};
          const awayMeta = TEAMS_META.find(t => t.id === result.awayTeamId) || {};
          const userMeta = TEAMS_META.find(t => t.id === this.state.userTeamId);
          const oppId = result.homeTeamId === this.state.userTeamId ? result.awayTeamId : result.homeTeamId;
          const oppMeta = TEAMS_META.find(t => t.id === oppId);
          const isDivisional = userMeta && oppMeta &&
            userMeta.league === oppMeta.league && userMeta.division === oppMeta.division;
          const recap = generateGameRecap(result, this.playerMap, homeMeta, awayMeta, isDivisional);
          if (!this.state.gameRecaps) this.state.gameRecaps = {};
          this.state.gameRecaps[result.gameId] = recap;
          // Keep only last 30 recaps
          const recapIds = Object.keys(this.state.gameRecaps);
          if (recapIds.length > 30) {
            delete this.state.gameRecaps[recapIds[0]];
          }
        }
      }

      this._generateGameNews(result);

      teamGameCounts[game.homeTeamId]++;
      teamGameCounts[game.awayTeamId]++;
    }

    this.state.season.currentDay = nextDay;
    this._advanceDayEffects(nextDay, todayGameStats);
    this._checkSeasonEnd();

    // ── Milestone check ──────────────────────────────────────────────────
    if (typeof checkMilestones === 'function') {
      const newMilestones = checkMilestones(this.state, this.playerMap);
      if (newMilestones.length > 0) {
        if (!this.state.pendingMilestones) this.state.pendingMilestones = [];
        this.state.pendingMilestones.push(...newMilestones);
        for (const ms of newMilestones) {
          this.state.news.unshift(`🌟 MILESTONE: ${ms.msg}`);
        }
        if (typeof Sound !== 'undefined') Sound.milestone();
      }
    }

    // ── Achievement check ─────────────────────────────────────────────────
    const newAchs = typeof checkAchievements === 'function'
      ? checkAchievements(this.state, this.playerMap) : [];
    if (newAchs.length > 0) {
      if (!this.state.pendingAchievements) this.state.pendingAchievements = [];
      this.state.pendingAchievements.push(...newAchs);
      if (typeof Sound !== 'undefined') Sound.achievement();
    }

    // Trim box scores
    if (this.state.boxScores.length > 30) {
      this.state.boxScores = this.state.boxScores.slice(-30);
    }

    SaveManager.save(this.state);

    const msg = userGameResult
      ? this._gameResultMessage(userGameResult)
      : `Day ${nextDay}: ${todayGames.length} game${todayGames.length !== 1 ? 's' : ''} played.`;

    // ── Sound on result ──────────────────────────────────────────────────
    if (userGameResult && typeof Sound !== 'undefined') {
      const isHome = userGameResult.homeTeamId === this.state.userTeamId;
      const myScore  = isHome ? userGameResult.homeScore : userGameResult.awayScore;
      const oppScore = isHome ? userGameResult.awayScore : userGameResult.homeScore;
      if (myScore > oppScore) Sound.win(); else Sound.loss();
    }

    this.go('teamHub', { simMessage: msg, lastGame: userGameResult?.gameId });
  },

  simWeek() {
    if (!this.state) return;
    if (this.state.season.phase === 'playoffs') {
      this.startPlayoffs();
      return;
    }

    const startDay = this.state.season.currentDay;
    const maxDay   = this._getLastScheduleDay();

    const app = document.getElementById('app');
    app.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>Simulating week...</p></div>`;

    setTimeout(() => {
      for (let i = 0; i < 7; i++) {
        if (this.state.season.currentDay >= maxDay) break;
        if (this.state.season.phase !== 'regular_season') break;
        this._simOneDayQuiet();
      }
      SaveManager.save(this.state);
      this.go('teamHub', { simMessage: `Simulated: Day ${startDay + 1} → Day ${this.state.season.currentDay}` });
    }, 50);
  },

  simSeason() {
    if (!this.state) return;
    if (this.state.season.phase === 'playoffs') {
      this.startPlayoffs();
      return;
    }

    const maxDay = this._getLastScheduleDay();

    const app = document.getElementById('app');
    app.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>Simulating season...<br><small>This may take a moment</small></p></div>`;

    setTimeout(() => {
      let iterations = 0;
      while (this.state.season.currentDay < maxDay && iterations < 200) {
        if (this.state.season.phase !== 'regular_season') break;
        this._simOneDayQuiet();
        iterations++;
      }
      SaveManager.save(this.state);
      this.go('teamHub', { simMessage: 'Season simulation complete!' });
    }, 50);
  },

  _simOneDayQuiet() {
    const nextDay = this.state.season.currentDay + 1;
    const todayGames = this.state.schedule.filter(
      g => g.day === nextDay && g.status === 'scheduled'
    );

    const teamGameCounts = {};
    for (const id in this.state.teamRecords) {
      teamGameCounts[id] = (this.state.teamRecords[id].wins || 0) + (this.state.teamRecords[id].losses || 0);
    }

    const gameOptions = {
      injuries: this.state.injuries || {},
      streaks:  this.state.playerStreaks || {},
    };

    const todayGameStats = [];

    for (const game of todayGames) {
      const result = simulateGame(
        game.homeTeamId,
        game.awayTeamId,
        this.playerMap,
        teamGameCounts,
        game.gameId,
        this.state.seasonStats,
        gameOptions
      );
      game.status = 'completed';
      game.result = result;
      applyGameStats(this.state.seasonStats, result);
      this._applyTeamResult(result);
      todayGameStats.push(result.gameStats);

      // Post-game injury rolls
      this._rollGameInjuries(result);

      if (game.homeTeamId === this.state.userTeamId ||
          game.awayTeamId === this.state.userTeamId) {
        this.state.boxScores.push(result);
        // Trim to last 30
        if (this.state.boxScores.length > 30) {
          this.state.boxScores = this.state.boxScores.slice(-30);
        }
      }

      teamGameCounts[game.homeTeamId]++;
      teamGameCounts[game.awayTeamId]++;
    }

    this.state.season.currentDay = nextDay;
    this._advanceDayEffects(nextDay, todayGameStats);
    this._checkSeasonEnd();
  },

  // ── Day Effects (injuries, streaks, mid-season events) ────────────────────

  _advanceDayEffects(day, todayGameStats) {
    // Advance injuries (heal players who've served their time)
    if (this.state.injuries && typeof advanceInjuries === 'function') {
      const { injuries, healed } = advanceInjuries(this.state.injuries);
      this.state.injuries = injuries;
      for (const pid of healed) {
        const p = this.playerMap[pid];
        // Only show activation news for user team players
        if (p && p.teamId === this.state.userTeamId) {
          this.state.news.unshift(`💪 ${p.name} has been activated from the IL.`);
          if (!this.state.pendingReturnPopups) this.state.pendingReturnPopups = [];
          this.state.pendingReturnPopups.push(p.name);
        }
      }
    }

    // Update hot/cold streaks from today's games
    if (todayGameStats.length > 0 && typeof updatePlayerStreaks === 'function') {
      if (!this.state.playerStreaks) this.state.playerStreaks = {};
      updatePlayerStreaks(this.state.playerStreaks, todayGameStats);
    }

    // Mid-season events: trigger once around day 91 (All-Star break)
    if (day >= 91 && day <= 93) {
      if (!this.state.allStarDone && typeof runAllStarGame === 'function') {
        this._runAllStarGame();
      }
      if (!this.state.tradeDeadlineDone && typeof runTradeDeadline === 'function') {
        this._runTradeDeadline();
      }
    }

    // Trim news
    if (this.state.news.length > 50) this.state.news = this.state.news.slice(0, 50);

    // Auto-dismiss milestone toasts after showing (1 per day)
    if (this.state.pendingMilestones?.length > 0) {
      // They were shown on previous frame — shift one off
      this.state.pendingMilestones.shift();
    }
  },

  _runAllStarGame() {
    this.state.allStarDone = true;
    const result = runAllStarGame(this.state.seasonStats, this.playerMap, TEAMS_META);
    this.state.allStarResult = result;
    this.state.news.unshift(
      `⭐ ALL-STAR GAME: ${result.winner} wins ${result.alScore}–${result.nlScore}! MVP: ${result.mvp} (${result.mvpTeam})`
    );
  },

  _runTradeDeadline() {
    this.state.tradeDeadlineDone = true;

    // Snapshot user team players — they must NOT be auto-traded
    const userTeamPlayerIds = new Set(
      Object.values(this.playerMap)
        .filter(p => p.teamId === this.state.userTeamId)
        .map(p => p.id)
    );

    const tradeNews = runTradeDeadline(
      this.state.teamRecords,
      // Exclude user team from contenders/sellers so AI won't target their players
      TEAMS_META.filter(t => t.id !== this.state.userTeamId),
      this.playerMap
    );

    // Safety net: revert any accidental moves of user team players
    for (const [id, p] of Object.entries(this.playerMap)) {
      if (userTeamPlayerIds.has(id) && p.teamId !== this.state.userTeamId) {
        p.teamId = this.state.userTeamId;
      }
    }

    for (const n of tradeNews) {
      this.state.news.unshift(n);
    }
    if (tradeNews.length > 0) {
      this.state.news.unshift('📅 Trade Deadline has passed!');
    }

    // Generate AI trade proposals for user to review
    this._generateAITradeProposals();
    if (this.state.pendingTradeOffers?.length > 0) {
      this.state.news.unshift(`📨 You have ${this.state.pendingTradeOffers.length} trade offer(s) waiting! Check Trade Center.`);
    }
  },

  _rollGameInjuries(result) {
    if (!result?.gameStats || typeof rollGameInjuries !== 'function') return;
    const newInjs = rollGameInjuries(result.gameStats, this.playerMap, this.state.injuries || {});
    for (const inj of newInjs) {
      this.state.injuries[inj.playerId] = inj;
      // Only show news for user team injuries
      const isUserTeam = inj.teamId === this.state.userTeamId ||
        this.playerMap[inj.playerId]?.teamId === this.state.userTeamId;
      if (isUserTeam) {
        this.state.news.unshift(`🏥 ${inj.playerName} placed on ${inj.il} (${inj.type})`);
        // Queue popup
        if (!this.state.pendingInjuryPopups) this.state.pendingInjuryPopups = [];
        this.state.pendingInjuryPopups.push(inj);
      }
    }
  },

  // ── Team Records ──────────────────────────────────────────────────────────

  _applyTeamResult(result) {
    const { winningTeam, losingTeam, homeTeamId, awayTeamId, homeScore, awayScore } = result;

    for (const teamId of [homeTeamId, awayTeamId]) {
      if (!this.state.teamRecords[teamId]) {
        this.state.teamRecords[teamId] = { wins: 0, losses: 0, runsFor: 0, runsAgainst: 0, streak: { type: 'W', count: 0 } };
      }
    }

    const homeRec = this.state.teamRecords[homeTeamId];
    const awayRec = this.state.teamRecords[awayTeamId];

    homeRec.runsFor     = (homeRec.runsFor     || 0) + homeScore;
    homeRec.runsAgainst = (homeRec.runsAgainst || 0) + awayScore;
    awayRec.runsFor     = (awayRec.runsFor     || 0) + awayScore;
    awayRec.runsAgainst = (awayRec.runsAgainst || 0) + homeScore;

    if (winningTeam === homeTeamId) {
      homeRec.wins++;
      awayRec.losses++;
      if (homeRec.streak.type === 'W') homeRec.streak.count++;
      else homeRec.streak = { type: 'W', count: 1 };
      if (awayRec.streak.type === 'L') awayRec.streak.count++;
      else awayRec.streak = { type: 'L', count: 1 };
    } else {
      awayRec.wins++;
      homeRec.losses++;
      if (awayRec.streak.type === 'W') awayRec.streak.count++;
      else awayRec.streak = { type: 'W', count: 1 };
      if (homeRec.streak.type === 'L') homeRec.streak.count++;
      else homeRec.streak = { type: 'L', count: 1 };
    }
  },

  _checkSeasonEnd() {
    if (this.state.season.phase !== 'regular_season') return;
    const remaining = this.state.schedule.filter(g => g.status === 'scheduled');
    if (remaining.length === 0) {
      this.state.season.phase = 'playoffs';

      // Calculate awards at end of regular season
      if (typeof calculateAwards === 'function') {
        this.state.awards = calculateAwards(this.state.seasonStats, this.playerMap, TEAMS_META);
        const mvpAL = this.state.awards.AL?.mvp;
        const mvpNL = this.state.awards.NL?.mvp;
        if (mvpAL) this.state.news.unshift(`🏆 AL MVP: ${mvpAL.name} (${mvpAL.teamId}) — ${mvpAL.stat}`);
        if (mvpNL) this.state.news.unshift(`🏆 NL MVP: ${mvpNL.name} (${mvpNL.teamId}) — ${mvpNL.stat}`);
      }

      this.state.news.unshift('🏆 The regular season is over! Playoffs are next.');
    }
  },

  // ── Playoffs ──────────────────────────────────────────────────────────────

  startPlayoffs() {
    if (!this.state) return;
    if (this.state.season.phase !== 'playoffs') return;

    const app = document.getElementById('app');
    app.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>Simulating Playoffs...</p></div>`;

    setTimeout(() => {
      if (typeof runFullPlayoffs === 'function') {
        const playoffs = runFullPlayoffs(
          this.state.teamRecords,
          TEAMS_META,
          this.playerMap
        );
        this.state.playoffs = playoffs;
        this.state.season.phase = 'offseason';
        this.state.offseasonPhase = 'free_agency';

        const champ = TEAMS_META.find(t => t.id === playoffs.champion);
        this.state.news.unshift(`🏆 WORLD SERIES CHAMPION: ${champ ? champ.full : playoffs.champion}!`);

        const wsResult = playoffs.worldSeries;
        if (wsResult) {
          const wTeam = TEAMS_META.find(t => t.id === wsResult.winner);
          const lTeam = TEAMS_META.find(t => t.id === wsResult.loser);
          this.state.news.unshift(
            `🏆 World Series: ${wTeam?.name || wsResult.winner} def. ${lTeam?.name || wsResult.loser} ${wsResult.t1Wins === 4 ? wsResult.t1Wins : wsResult.t2Wins}–${wsResult.t1Wins === 4 ? wsResult.t2Wins : wsResult.t1Wins}`
          );
        }
      }

      SaveManager.save(this.state);
      this.go('playoffs');
    }, 100);
  },

  // ── Offseason ─────────────────────────────────────────────────────────────

  runFreeAgency() {
    if (!this.state || this.state.offseasonPhase !== 'free_agency') return;

    const app = document.getElementById('app');
    app.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>Running Free Agency...</p></div>`;

    setTimeout(() => {
      if (typeof runFreeAgency === 'function') {
        const faNews = runFreeAgency(TEAMS_META, this.playerMap, this.state.teamRecords);
        this.state.faNews = faNews.slice(0, 20);
        for (const n of faNews.slice(0, 5)) this.state.news.unshift(n);
      }
      this.state.offseasonPhase = 'draft';
      SaveManager.save(this.state);
      this.go('offseason', { phase: 'draft' });
    }, 80);
  },

  runDraft() {
    if (!this.state || this.state.offseasonPhase !== 'draft') return;

    const app = document.getElementById('app');
    app.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>Simulating Draft...</p></div>`;

    setTimeout(() => {
      if (typeof runDraft === 'function') {
        const draftNews = runDraft(
          this.state.teamRecords,
          TEAMS_META,
          this.playerMap,
          this.state.userTeamId
        );
        this.state.draftNews = draftNews.slice(0, 30);

        // Collect newly added prospects so they survive save/load
        if (!this.state.draftProspects) this.state.draftProspects = [];
        for (const [id, p] of Object.entries(this.playerMap)) {
          if (id.startsWith('draft_') || id.startsWith('prospect_')) {
            if (!this.state.draftProspects.find(x => x.id === id)) {
              this.state.draftProspects.push(p);
            }
          }
        }

        for (const n of draftNews.filter(n => n.includes('Your')).slice(0, 3)) {
          this.state.news.unshift(n);
        }
      }
      this.state.offseasonPhase = 'complete';
      SaveManager.save(this.state);
      this.go('offseason', { phase: 'complete' });
    }, 80);
  },

  startNewSeason() {
    if (!this.state) return;
    if (this.state.offseasonPhase !== 'complete') return;

    const app = document.getElementById('app');
    app.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>Starting new season...</p></div>`;

    setTimeout(() => {
      const currentYear = this.state.season.year || 2026;
      const newYear     = currentYear + 1;

      // ── Career Stats Snapshot ──────────────────────────────────────────
      if (typeof snapshotCareerStats === 'function') {
        this.state.careerStats = snapshotCareerStats(
          this.state.careerStats || {},
          this.state.seasonStats,
          currentYear
        );
      }

      // ── Generate season recap before resetting stats ───────────────────
      this._buildSeasonRecap(currentYear);

      // ── Age up all players ─────────────────────────────────────────────
      for (const p of Object.values(this.playerMap)) {
        p.age = (p.age || 25) + 1;
      }

      // ── Player Development ─────────────────────────────────────────────
      const devNews = typeof applyPlayerDevelopment === 'function'
        ? applyPlayerDevelopment(this.playerMap) : [];

      // ── Retirements ────────────────────────────────────────────────────
      const retiredIds = typeof checkRetirements === 'function'
        ? checkRetirements(this.playerMap) : [];
      const retiredNames = [];
      for (const pid of retiredIds) {
        const p = this.playerMap[pid];
        if (!p) continue;
        retiredNames.push(p.name);
        p.isRetired = true;
        // Remove from team roster (set to free agent limbo)
        p.teamId = 'RETIRED';
      }
      if (retiredNames.length > 0) {
        this.state.news.unshift(`👋 Retirements: ${retiredNames.slice(0, 5).join(', ')}`);
      }

      // ── HOF Inductions ─────────────────────────────────────────────────
      if (retiredIds.length > 0 && typeof processHOFInductions === 'function') {
        const inducted = processHOFInductions(
          retiredIds,
          this.state.careerStats,
          this.playerMap,
          this.state.hofMembers || []
        );
        if (inducted.length > 0) {
          if (!this.state.hofMembers) this.state.hofMembers = [];
          this.state.hofMembers.push(...inducted);
          if (!this.state.pendingHOF) this.state.pendingHOF = [];
          this.state.pendingHOF.push(...inducted);
          for (const m of inducted) {
            this.state.news.unshift(`🏛️ HALL OF FAME: ${m.name} inducted! (${m.reason})`);
          }
        }
      }

      // ── Reset season state ─────────────────────────────────────────────
      const newSchedule = generateSchedule(TEAMS_META);

      this.state.season = {
        year: newYear,
        currentDay: 0,
        phase: 'regular_season',
        totalGames: newSchedule.length,
      };
      this.state.schedule       = newSchedule;
      this.state.seasonStats    = initSeasonStats();
      this.state.boxScores      = [];
      this.state.injuries       = {};
      this.state.playerStreaks  = {};
      this.state.tradeDeadlineDone = false;
      this.state.allStarDone    = false;
      this.state.allStarResult  = null;
      this.state.playoffs       = null;
      this.state.awards         = null;
      this.state.offseasonPhase = null;
      this.state.draftNews            = [];
      this.state.faNews               = [];
      this.state.freeAgentPool        = [];
      this.state.pendingInjuryPopups  = [];
      this.state.pendingReturnPopups  = [];
      this.state.pendingTradeOffers   = [];
      this.state.tradeHistory         = [];
      this.state.saveDate             = new Date().toISOString();
      this.state.rosterExpanded       = false;
      this.state.pendingDecision      = null;
      this.state.decisionMod          = 0;
      this.state.triggeredMilestones  = {};
      this.state.gameRecaps           = {};

      // ── Waiver wire pool for new season ────────────────────────────────
      if (typeof generateWaiverPool === 'function') {
        this.state.waiverPool = generateWaiverPool(
          this.playerMap, this.state.userTeamId, 40
        );
      }

      // ── Reset team records ─────────────────────────────────────────────
      for (const t of TEAMS_META) {
        this.state.teamRecords[t.id] = { wins: 0, losses: 0, runsFor: 0, runsAgainst: 0, streak: { type: 'W', count: 0 } };
      }

      // Add dev news
      for (const n of devNews.slice(0, 3)) this.state.news.unshift(n);
      this.state.news.unshift(`⚾ ${newYear} season started! Managing the ${TEAMS_META.find(t => t.id === this.state.userTeamId)?.full}.`);

      // ── Achievement check ───────────────────────────────────────────────
      const newAchs = typeof checkAchievements === 'function'
        ? checkAchievements(this.state, this.playerMap) : [];
      if (newAchs.length > 0) {
        if (!this.state.pendingAchievements) this.state.pendingAchievements = [];
        this.state.pendingAchievements.push(...newAchs);
      }

      SaveManager.save(this.state);
      this.go('teamHub', { simMessage: `Welcome to the ${newYear} season!` });
    }, 80);
  },

  // ── News / Messages ───────────────────────────────────────────────────────

  _generateGameNews(result) {
    const totalRuns = result.homeScore + result.awayScore;
    if (totalRuns >= 16) {
      this.state.news.unshift(`High-scoring game: ${result.awayTeamId} ${result.awayScore} @ ${result.homeTeamId} ${result.homeScore}`);
    }
    if (result.homeScore === 0 || result.awayScore === 0) {
      const winner = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
      this.state.news.unshift(`Shutout! ${winner} blanks their opponent`);
    }
  },

  _gameResultMessage(result) {
    const isHome = result.homeTeamId === this.state.userTeamId;
    const myScore  = isHome ? result.homeScore : result.awayScore;
    const oppScore = isHome ? result.awayScore : result.homeScore;
    const oppId    = isHome ? result.awayTeamId : result.homeTeamId;
    const oppMeta  = TEAMS_META.find(t => t.id === oppId);
    const oppName  = oppMeta ? oppMeta.name : oppId;
    const won = myScore > oppScore;
    return won
      ? `✅ Win! ${myScore}–${oppScore} vs. ${oppName}`
      : `❌ Loss: ${myScore}–${oppScore} vs. ${oppName}`;
  },

  // ── Helpers ───────────────────────────────────────────────────────────────

  getTeamMeta(teamId) {
    return TEAMS_META.find(t => t.id === teamId) || { id: teamId, name: teamId, full: teamId, primary: '#444', secondary: '#fff' };
  },

  getTeamRecord(teamId) {
    return this.state?.teamRecords?.[teamId] || { wins: 0, losses: 0, runsFor: 0, runsAgainst: 0, streak: { type: 'W', count: 0 } };
  },

  getUserRecord() {
    return this.getTeamRecord(this.state?.userTeamId);
  },

  getTeamPlayers(teamId) {
    return Object.values(this.playerMap).filter(p => p.teamId === teamId);
  },

  getStandings() {
    if (!this.state) return {};
    return calculateStandings(this.state.teamRecords, TEAMS_META);
  },

  getUpcomingGames(teamId, n = 5) {
    if (!this.state) return [];
    return this.state.schedule
      .filter(g => g.status === 'scheduled' &&
        (g.homeTeamId === teamId || g.awayTeamId === teamId))
      .slice(0, n);
  },

  getRecentGames(teamId, n = 5) {
    if (!this.state) return [];
    return this.state.schedule
      .filter(g => g.status === 'completed' &&
        (g.homeTeamId === teamId || g.awayTeamId === teamId))
      .slice(-n).reverse();
  },

  getBoxScore(gameId) {
    if (!this.state) return null;
    return this.state.boxScores.find(b => b.gameId === gameId) || null;
  },

  getTeamInjuries(teamId) {
    if (!this.state?.injuries) return [];
    return Object.values(this.state.injuries).filter(inj => {
      const p = this.playerMap[inj.playerId];
      return p ? p.teamId === teamId : inj.teamId === teamId;
    });
  },

  getTeamPayroll(teamId) {
    return Object.values(this.playerMap)
      .filter(p => p.teamId === teamId)
      .reduce((sum, p) => sum + (p.salary || 0), 0);
  },

  getPlayerStreak(playerId) {
    return this.state?.playerStreaks?.[playerId] || null;
  },

  deleteSave() {
    SaveManager.delete();
    this.state = null;
    this.go('mainMenu');
  },

  seasonProgress() {
    if (!this.state) return 0;
    const total = this.state.schedule.length;
    const done  = this.state.schedule.filter(g => g.status === 'completed').length;
    return total > 0 ? done / total : 0;
  },

  currentSeasonDay() {
    return this.state?.season?.currentDay || 0;
  },

  _getLastScheduleDay() {
    return Math.max(...this.state.schedule.map(g => g.day), 0);
  },

  // ── Lineup / Rotation ─────────────────────────────────────────────────────

  getLineup(teamId) {
    if (this.state.lineups?.[teamId]?.length > 0) return [...this.state.lineups[teamId]];
    const posOrder = { C:1,'1B':2,'2B':3,'3B':4,SS:5,LF:6,CF:7,RF:8,DH:9 };
    const players = this.getTeamPlayers(teamId)
      .filter(p => !['SP','RP','TWP'].includes(p.position))
      .sort((a,b) => (posOrder[a.position]||99) - (posOrder[b.position]||99));
    return players.map(p => p.id);
  },

  getRotation(teamId) {
    if (this.state.rotations?.[teamId]?.length > 0) return [...this.state.rotations[teamId]];
    const sps = this.getTeamPlayers(teamId)
      .filter(p => p.position === 'SP')
      .sort((a,b) => b.overall - a.overall);
    return sps.map(p => p.id);
  },

  _lineupTap(slot) {
    if (this.lineupSelect === null || this.lineupSelect === undefined) {
      this.lineupSelect = slot;
      this.go('lineup');
    } else if (this.lineupSelect === slot) {
      this.lineupSelect = null;
      this.go('lineup');
    } else {
      const lineup = this.getLineup(this.state.userTeamId);
      [lineup[this.lineupSelect], lineup[slot]] = [lineup[slot], lineup[this.lineupSelect]];
      if (!this.state.lineups) this.state.lineups = {};
      this.state.lineups[this.state.userTeamId] = lineup;
      this.lineupSelect = null;
      SaveManager.save(this.state);
      this.go('lineup');
    }
  },

  _rotationTap(slot) {
    if (this.rotSelect === null || this.rotSelect === undefined) {
      this.rotSelect = slot;
      this.go('rotation');
    } else if (this.rotSelect === slot) {
      this.rotSelect = null;
      this.go('rotation');
    } else {
      const rotation = this.getRotation(this.state.userTeamId);
      [rotation[this.rotSelect], rotation[slot]] = [rotation[slot], rotation[this.rotSelect]];
      if (!this.state.rotations) this.state.rotations = {};
      this.state.rotations[this.state.userTeamId] = rotation;
      this.rotSelect = null;
      SaveManager.save(this.state);
      this.go('rotation');
    }
  },

  _setBullpenRole(playerId, role) {
    if (!this.state.bullpenRoles) this.state.bullpenRoles = {};
    if (!this.state.bullpenRoles[this.state.userTeamId]) {
      this.state.bullpenRoles[this.state.userTeamId] = {};
    }
    this.state.bullpenRoles[this.state.userTeamId][playerId] = role;
    SaveManager.save(this.state);
    this.go('rotation');
  },

  // ── Trade Center ──────────────────────────────────────────────────────────

  _selectTradeOpponent(teamId) {
    this.tradeDraft = { opponentId: teamId, myPlayers: [], theirPlayers: [] };
    this.go('tradeCenter');
  },

  _toggleMyTradePick(playerId) {
    if (!this.tradeDraft) this.tradeDraft = { opponentId: null, myPlayers: [], theirPlayers: [] };
    const idx = this.tradeDraft.myPlayers.indexOf(playerId);
    if (idx === -1) this.tradeDraft.myPlayers.push(playerId);
    else this.tradeDraft.myPlayers.splice(idx, 1);
    this.go('tradeCenter');
  },

  _toggleTheirTradePick(playerId) {
    if (!this.tradeDraft) this.tradeDraft = { opponentId: null, myPlayers: [], theirPlayers: [] };
    const idx = this.tradeDraft.theirPlayers.indexOf(playerId);
    if (idx === -1) this.tradeDraft.theirPlayers.push(playerId);
    else this.tradeDraft.theirPlayers.splice(idx, 1);
    this.go('tradeCenter');
  },

  _proposeTrade() {
    if (!this.tradeDraft) return;
    const { opponentId, myPlayers, theirPlayers } = this.tradeDraft;
    if (!myPlayers.length || !theirPlayers.length) return;

    const myOVR   = myPlayers.reduce((s,id) => s + (this.playerMap[id]?.overall || 0), 0);
    const oppOVR  = theirPlayers.reduce((s,id) => s + (this.playerMap[id]?.overall || 0), 0);
    const accepted = myOVR >= oppOVR - 8;

    let result;
    if (accepted) {
      // Execute trade
      const myNames  = myPlayers.map(id => this.playerMap[id]?.name || id);
      const oppNames = theirPlayers.map(id => this.playerMap[id]?.name || id);

      for (const id of myPlayers)   if (this.playerMap[id]) this.playerMap[id].teamId = opponentId;
      for (const id of theirPlayers) if (this.playerMap[id]) this.playerMap[id].teamId = this.state.userTeamId;

      const oppMeta = this.getTeamMeta(opponentId);
      const summary = `You sent ${myNames.join(', ')} to ${oppMeta.name} for ${oppNames.join(', ')}`;
      if (!this.state.tradeHistory) this.state.tradeHistory = [];
      this.state.tradeHistory.push({ summary, day: this.state.season.currentDay });
      this.state.news.unshift(`🔄 TRADE: ${summary}`);
      SaveManager.save(this.state);

      result = { accepted: true, message: `${oppMeta.name} accepted! ${summary}.` };
    } else {
      const oppMeta = this.getTeamMeta(opponentId);
      result = {
        accepted: false,
        message: `${oppMeta.name} rejected the offer. Your OVR offered (${myOVR}) is too low for their players (${oppOVR}). Try adding more value.`,
      };
    }

    this.tradeDraft = null;
    this.go('tradeCenter', { result });
  },

  _clearTrade() {
    this.tradeDraft = null;
    this.go('tradeCenter');
  },

  // ── AI Trade Proposals (sent TO the user) ─────────────────────────────────

  _generateAITradeProposals() {
    // Generate 1–2 AI-initiated offers for the user to review
    const proposals = [];
    const aiTeams = TEAMS_META.filter(t => t.id !== this.state.userTeamId)
      .sort(() => Math.random() - 0.5).slice(0, 2);

    for (const aiTeam of aiTeams) {
      const theirBest = this.getTeamPlayers(aiTeam.id)
        .filter(p => p.position !== 'SP')
        .sort((a,b) => b.overall - a.overall)[0];
      const myWorst = this.getTeamPlayers(this.state.userTeamId)
        .filter(p => p.position !== 'SP')
        .sort((a,b) => a.overall - b.overall)[0];
      if (!theirBest || !myWorst) continue;
      proposals.push({
        id: `offer_${Date.now()}_${aiTeam.id}`,
        fromTeamId: aiTeam.id,
        theyOffer: [theirBest.id],
        theyWant:  [myWorst.id],
      });
    }
    if (!this.state.pendingTradeOffers) this.state.pendingTradeOffers = [];
    this.state.pendingTradeOffers.push(...proposals);
  },

  _acceptTradeOffer(offerId) {
    const offer = this.state.pendingTradeOffers?.find(o => o.id === offerId);
    if (!offer) return;

    for (const id of offer.theyOffer) if (this.playerMap[id]) this.playerMap[id].teamId = this.state.userTeamId;
    for (const id of offer.theyWant)  if (this.playerMap[id]) this.playerMap[id].teamId = offer.fromTeamId;

    const aiMeta = this.getTeamMeta(offer.fromTeamId);
    const givenNames    = offer.theyOffer.map(id => this.playerMap[id]?.name || id);
    const receivedNames = offer.theyWant.map(id => this.playerMap[id]?.name || id);
    const summary = `${aiMeta.name} trade offer accepted: You receive ${givenNames.join(', ')} for ${receivedNames.join(', ')}`;

    if (!this.state.tradeHistory) this.state.tradeHistory = [];
    this.state.tradeHistory.push({ summary, day: this.state.season.currentDay });
    this.state.news.unshift(`🔄 ${summary}`);

    this.state.pendingTradeOffers = this.state.pendingTradeOffers.filter(o => o.id !== offerId);
    SaveManager.save(this.state);
    this.go('tradeCenter', { result: { accepted: true, message: summary } });
  },

  _rejectTradeOffer(offerId) {
    if (!this.state.pendingTradeOffers) return;
    const offer = this.state.pendingTradeOffers.find(o => o.id === offerId);
    const aiMeta = offer ? this.getTeamMeta(offer.fromTeamId) : null;
    this.state.pendingTradeOffers = this.state.pendingTradeOffers.filter(o => o.id !== offerId);
    SaveManager.save(this.state);
    this.go('tradeCenter', {
      result: { accepted: false, message: `${aiMeta?.name || 'AI team'} trade offer declined.` }
    });
  },

  // ── Free Agency ───────────────────────────────────────────────────────────

  _generateFAPool() {
    if (!this.state) return;
    if (this.state.freeAgentPool?.length > 0) return; // already generated

    const userTeamId = this.state.userTeamId;
    // Pull candidates from AI teams: older players or mid-tier
    const candidates = Object.values(this.playerMap)
      .filter(p => p.teamId && p.teamId !== userTeamId && !p.id.startsWith('draft_'))
      .filter(p => p.age >= 30 || (p.overall >= 72 && Math.random() < 0.12))
      .sort(() => Math.random() - 0.5)
      .slice(0, 30);

    this.state.freeAgentPool = candidates.map(p => ({
      playerId:         `fa_${p.id}`,
      originalPlayerId: p.id,
      name:             p.name,
      position:         p.position,
      overall:          p.overall,
      salary:           Math.max(570, Math.round(p.salary * 0.9)),
      age:              p.age,
      bats:             p.bats  || 'R',
      throws:           p.throws || 'R',
      height:           p.height || '6\'0"',
      weight:           p.weight || 200,
      batting:          p.batting,
      pitching:         p.pitching,
      originalTeamId:   p.teamId,
      signed:           false,
    }));
    this.state.freeAgentPool.sort((a,b) => b.overall - a.overall);
  },

  _showFreeAgency() {
    this._generateFAPool();
    this.go('freeAgency');
  },

  _signFreeAgent(faPlayerId) {
    if (!this.state) return;
    const fa = this.state.freeAgentPool?.find(f => f.playerId === faPlayerId && !f.signed);
    if (!fa) return;

    // Create player and add to playerMap
    const newPlayer = {
      id:           fa.playerId,
      name:         fa.name,
      position:     fa.position,
      overall:      fa.overall,
      salary:       fa.salary,
      age:          fa.age,
      teamId:       this.state.userTeamId,
      jerseyNumber: 10 + Math.floor(Math.random() * 80),
      bats:         fa.bats,
      throws:       fa.throws,
      height:       fa.height,
      weight:       fa.weight,
      batting:      fa.batting,
      pitching:     fa.pitching,
    };
    this.playerMap[newPlayer.id] = newPlayer;
    fa.signed = true;

    const tm = this.getTeamMeta(this.state.userTeamId);
    this.state.news.unshift(`✍️ ${fa.name} (${fa.position}, OVR ${fa.overall}) signed with ${tm.name}!`);
    SaveManager.save(this.state);
    this.go('freeAgency', { message: `${fa.name} signed! Welcome to ${tm.name}.` });
  },

  // ── Rainout ────────────────────────────────────────────────────────────────

  _checkRainout(todayGames, day) {
    // 3% chance of rainout per day with games
    if (Math.random() >= 0.03) return false;

    // Find the user team's game to rain out for extra drama
    const userGame = todayGames.find(g =>
      g.homeTeamId === this.state.userTeamId || g.awayTeamId === this.state.userTeamId
    );
    const targetGame = userGame || todayGames[0];
    if (!targetGame) return false;

    // Mark as rained out
    targetGame.status = 'rained_out';

    // Find a future date for doubleheader (look 3-10 days ahead)
    const { homeTeamId, awayTeamId } = targetGame;
    let rescheduleDay = null;

    for (let d = day + 3; d <= day + 15; d++) {
      const homebusy = this.state.schedule.some(g => g.day === d && (g.homeTeamId === homeTeamId || g.awayTeamId === homeTeamId));
      const awayBusy = this.state.schedule.some(g => g.day === d && (g.homeTeamId === awayTeamId || g.awayTeamId === awayTeamId));
      if (!homebusy && !awayBusy) {
        rescheduleDay = d;
        break;
      }
      // Check if there's already one game that day (allow doubleheader slot)
      const existingGame = this.state.schedule.find(g =>
        g.day === d &&
        ((g.homeTeamId === homeTeamId && g.awayTeamId === awayTeamId) ||
         (g.homeTeamId === awayTeamId && g.awayTeamId === homeTeamId))
      );
      if (existingGame && !homebusy && !awayBusy) {
        rescheduleDay = d;
        break;
      }
    }

    if (rescheduleDay) {
      // Find last gameId number
      const lastNum = this.state.schedule.reduce((max, g) => {
        const n = parseInt(g.gameId?.split('_')[1]) || 0;
        return Math.max(max, n);
      }, 0);
      const newGameId = `${this.state.season.year}_${String(lastNum + 1).padStart(4, '0')}`;

      this.state.schedule.push({
        gameId:        newGameId,
        day:           rescheduleDay,
        week:          Math.ceil(rescheduleDay / 7),
        homeTeamId,
        awayTeamId,
        status:        'scheduled',
        result:        null,
        isDoubleheader: true,
      });

      // Mark the original same-day game as DH too
      const existing = this.state.schedule.find(g =>
        g.day === rescheduleDay && g.status === 'scheduled' &&
        ((g.homeTeamId === homeTeamId) || (g.awayTeamId === homeTeamId))
      );
      if (existing) existing.isDoubleheader = true;

      this.state.news.unshift(
        `☔ Rain delay! ${homeTeamId} vs ${awayTeamId} rescheduled as doubleheader on Day ${rescheduleDay}.`
      );
    }

    return true;
  },

  // ── Manager Decision ───────────────────────────────────────────────────────

  _makeDecision(choiceKey) {
    if (!this.state.pendingDecision) return;
    const decision = this.state.pendingDecision;
    const chosen   = decision.options.find(o => o.key === choiceKey);
    const mod      = chosen ? chosen.mod : 0;

    this.state.decisionMod  = mod;
    this.state.pendingDecision = null;

    SaveManager.save(this.state);
    this.simDay();
  },

  _skipDecision() {
    if (this.state) {
      this.state.pendingDecision = null;
      SaveManager.save(this.state);
    }
    this.simDay();
  },

  // ── Waiver Wire ────────────────────────────────────────────────────────────

  _claimWaiver(playerId) {
    if (!this.state) return;
    const player = this.playerMap[playerId];
    if (!player) return;

    const maxRoster = this.state.rosterExpanded ? 40 : 26;
    const currentCount = Object.values(this.playerMap).filter(
      p => p.teamId === this.state.userTeamId && !p.isRetired
    ).length;

    if (currentCount >= maxRoster) {
      this.go('waiverWire', { message: `Roster full! Release a player before claiming.` });
      return;
    }

    // Move player to user team
    const prevTeam = player.teamId;
    player.teamId  = this.state.userTeamId;
    player.isWaived = true;

    this.state.waiverPickupDone = true;

    const tm = this.getTeamMeta(this.state.userTeamId);
    this.state.news.unshift(`🛒 ${player.name} (${player.position}, OVR ${player.overall}) claimed off waivers by ${tm.name}!`);

    // Achievement check
    if (typeof checkAchievements === 'function') {
      const newAchs = checkAchievements(this.state, this.playerMap);
      if (newAchs.length > 0) {
        if (!this.state.pendingAchievements) this.state.pendingAchievements = [];
        this.state.pendingAchievements.push(...newAchs);
      }
    }

    SaveManager.save(this.state);
    this.go('waiverWire', { message: `${player.name} claimed! Welcome to ${tm.name}.` });
  },

  // ── Sound Toggle ───────────────────────────────────────────────────────────

  _toggleSound() {
    if (typeof Sound !== 'undefined') Sound.toggle();
    this.go('teamHub');
  },

  // ── Season Recap Builder ───────────────────────────────────────────────────

  _buildSeasonRecap(year) {
    const rec  = this.state.teamRecords[this.state.userTeamId] || {};
    const tm   = TEAMS_META.find(t => t.id === this.state.userTeamId);

    // Top batter
    let topBatter = null, topBatterStat = '';
    let maxHR = 0;
    for (const [pid, s] of Object.entries(this.state.seasonStats.batting || {})) {
      const p = this.playerMap[pid];
      if (!p || p.teamId !== this.state.userTeamId) continue;
      if ((s.hr || 0) > maxHR) {
        maxHR = s.hr;
        topBatter = p;
        topBatterStat = `${s.hr}HR, ${s.rbi}RBI`;
      }
    }

    // Top pitcher
    let topPitcher = null, topPitcherStat = '';
    let minERA = 99;
    for (const [pid, s] of Object.entries(this.state.seasonStats.pitching || {})) {
      const p = this.playerMap[pid];
      if (!p || p.teamId !== this.state.userTeamId) continue;
      if ((s.ip || 0) >= 50) {
        const era = (s.er * 9) / s.ip;
        if (era < minERA) {
          minERA = era;
          topPitcher = p;
          topPitcherStat = `${s.w}-${s.l}, ${era.toFixed(2)} ERA`;
        }
      }
    }

    // Playoff result
    let playoffResult = 'Missed Playoffs';
    const po = this.state.playoffs;
    if (po?.champion === this.state.userTeamId) {
      playoffResult = '🏆 World Series Champions!';
    } else if (po?.worldSeries?.team1 === this.state.userTeamId || po?.worldSeries?.team2 === this.state.userTeamId) {
      playoffResult = '🥈 World Series';
    } else if (po) {
      playoffResult = 'Playoffs';
    }

    // Top moments from news
    const topMoments = (this.state.news || [])
      .filter(n => n.includes('MILESTONE') || n.includes('🏆') || n.includes('shutout') || n.includes('Shutout'))
      .slice(0, 5)
      .map(n => n.replace('🌟 MILESTONE: ', '').replace('📅 ', ''));

    // Awards
    const awards = [];
    const aw = this.state.awards;
    if (aw) {
      const myTeam = this.state.userTeamId;
      for (const lg of ['AL', 'NL']) {
        if (aw[lg]?.mvp?.teamId === myTeam) awards.push(`${aw[lg].mvp.name} — ${lg} MVP`);
        if (aw[lg]?.cyYoung?.teamId === myTeam) awards.push(`${aw[lg].cyYoung.name} — ${lg} Cy Young`);
        if (aw[lg]?.roy?.teamId === myTeam) awards.push(`${aw[lg].roy.name} — ${lg} ROY`);
      }
    }

    const recap = {
      year,
      wins:         rec.wins || 0,
      losses:       rec.losses || 0,
      runsFor:      rec.runsFor || 0,
      runsAgainst:  rec.runsAgainst || 0,
      topBatter,
      topBatterStat,
      topPitcher,
      topPitcherStat,
      playoffResult,
      champion:     po?.champion || null,
      topMoments,
      awards,
    };

    if (!this.state.seasonRecaps) this.state.seasonRecaps = [];
    this.state.seasonRecaps.push(recap);
  },

  // ── Achievement / HOF Dismiss ──────────────────────────────────────────────

  _dismissAchievement() {
    if (this.state) {
      this.state.pendingAchievements = [];
      SaveManager.save(this.state);
    }
    this.go('teamHub');
  },

  _dismissHOF() {
    if (this.state) {
      this.state.pendingHOF = [];
      SaveManager.save(this.state);
    }
    this.go('teamHub');
  },

  // ── Popup Dismiss ─────────────────────────────────────────────────────────

  _dismissPopup() {
    if (this.state) {
      this.state.pendingInjuryPopups = [];
      this.state.pendingReturnPopups = [];
      // Also dismiss milestone toast on next interaction
      if (this.state.pendingMilestones?.length > 0) {
        this.state.pendingMilestones.shift(); // remove first shown
      }
      SaveManager.save(this.state);
    }
    this.go('teamHub');
  },

  // ── Logo helper ───────────────────────────────────────────────────────────

  teamLogoUrl(teamId) {
    return `assets/logos/${teamId}.png`;
  },
};

// ── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
