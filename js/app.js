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
      this.go('teamHub');
    } else {
      this.go('mainMenu');
    }
  },

  // ── Navigation ────────────────────────────────────────────────────────────

  go(screen, params = {}) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.scrollTop = 0;

    switch (screen) {
      case 'mainMenu':    app.innerHTML = Screens.mainMenu(this); break;
      case 'teamSelect':  app.innerHTML = Screens.teamSelect(this); break;
      case 'teamHub':     app.innerHTML = Screens.teamHub(this, params); break;
      case 'roster':      app.innerHTML = Screens.roster(this, params); break;
      case 'standings':   app.innerHTML = Screens.standings(this, params); break;
      case 'boxScore':    app.innerHTML = Screens.boxScore(this, params); break;
      case 'leaders':     app.innerHTML = Screens.leaders(this, params); break;
      case 'schedule':    app.innerHTML = Screens.schedule(this, params); break;
      case 'playerCard':  app.innerHTML = Screens.playerCard(this, params); break;
      default:            app.innerHTML = Screens.teamHub(this, params);
    }

    this._bindNav(screen, params);
  },

  _bindNav(screen) {
    // Bottom nav tab highlights
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.screen === screen);
    });
  },

  _handleAction(action, data) {
    switch (action) {
      case 'newGame':      this.go('teamSelect'); break;
      case 'continue':     this.go('teamHub'); break;
      case 'selectTeam':   this.startNewGame(data.teamId); break;
      case 'nav':          this.go(data.screen); break;
      case 'simDay':       this.simDay(); break;
      case 'simWeek':      this.simWeek(); break;
      case 'simSeason':    this.simSeason(); break;
      case 'viewBoxScore': this.go('boxScore', { gameId: data.gameId }); break;
      case 'viewPlayer':   this.go('playerCard', { playerId: data.playerId }); break;
      case 'deleteSave':   this.deleteSave(); break;
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
      version:    '1.0.0',
      saveDate:   new Date().toISOString(),
      season:     { year: 2026, currentDay: 0, phase: 'regular_season', totalGames: schedule.length },
      userTeamId: teamId,
      teams:      allTeams,
      teamRecords:{}, // teamId → {wins,losses,runsFor,runsAgainst,streak}
      schedule,
      seasonStats: initSeasonStats(),
      boxScores:   [],
      news:        [`Season started! You are managing the ${teamMeta.full}.`],
    };

    // Init team records
    for (const t of allTeams) {
      this.state.teamRecords[t.id] = { wins: 0, losses: 0, runsFor: 0, runsAgainst: 0, streak: { type: 'W', count: 0 } };
    }

    SaveManager.save(this.state);
    this.go('teamHub');
  },

  // ── Simulation ────────────────────────────────────────────────────────────

  simDay() {
    if (!this.state) return;
    const { currentDay } = this.state.season;
    const nextDay = currentDay + 1;

    // Find games scheduled for today
    const todayGames = this.state.schedule.filter(
      g => g.day === nextDay && g.status === 'scheduled'
    );

    if (todayGames.length === 0) {
      // Off day — just advance
      this.state.season.currentDay = nextDay;
      this._checkSeasonEnd();
      SaveManager.save(this.state);
      this.go('teamHub', { simMessage: `Day ${nextDay}: Off day for your team.` });
      return;
    }

    // Build game counts for rotation
    const teamGameCounts = {};
    for (const t of this.state.teams) {
      teamGameCounts[t.id] = (this.state.teamRecords[t.id]?.wins || 0) +
                              (this.state.teamRecords[t.id]?.losses || 0);
    }

    let userGameResult = null;
    let gamesSimmed = 0;

    for (const game of todayGames) {
      const result = simulateGame(
        game.homeTeamId,
        game.awayTeamId,
        this.playerMap,
        teamGameCounts,
        game.gameId,
        this.state.seasonStats
      );

      game.status = 'completed';
      game.result = result;

      // Apply game stats to season stats
      applyGameStats(this.state.seasonStats, result);

      // Update team records
      this._applyTeamResult(result);

      // Store box score
      this.state.boxScores.push(result);

      // Add news for interesting events
      this._generateGameNews(result);

      if (game.homeTeamId === this.state.userTeamId ||
          game.awayTeamId === this.state.userTeamId) {
        userGameResult = result;
      }

      teamGameCounts[game.homeTeamId]++;
      teamGameCounts[game.awayTeamId]++;
      gamesSimmed++;
    }

    this.state.season.currentDay = nextDay;
    this._checkSeasonEnd();
    SaveManager.save(this.state);

    const msg = userGameResult
      ? this._gameResultMessage(userGameResult)
      : `Day ${nextDay}: ${gamesSimmed} game${gamesSimmed !== 1 ? 's' : ''} played.`;

    this.go('teamHub', { simMessage: msg, lastGame: userGameResult?.gameId });
  },

  simWeek() {
    if (!this.state) return;
    const startDay = this.state.season.currentDay;
    const maxDay   = this._getLastScheduleDay();

    // Show loading state briefly
    const app = document.getElementById('app');
    app.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>Simulating week...</p></div>`;

    // Use setTimeout to allow the loading screen to render
    setTimeout(() => {
      let lastResult = null;
      for (let i = 0; i < 7; i++) {
        if (this.state.season.currentDay >= maxDay) break;
        if (this.state.season.phase === 'offseason') break;
        this._simOneDayQuiet();
      }
      SaveManager.save(this.state);
      this.go('teamHub', { simMessage: `Simulated week: Day ${startDay + 1} → Day ${this.state.season.currentDay}` });
    }, 50);
  },

  simSeason() {
    if (!this.state) return;
    const maxDay = this._getLastScheduleDay();

    const app = document.getElementById('app');
    app.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>Simulating season...<br><small>This may take a moment</small></p></div>`;

    setTimeout(() => {
      let iterations = 0;
      while (this.state.season.currentDay < maxDay && iterations < 200) {
        if (this.state.season.phase === 'offseason') break;
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

    for (const game of todayGames) {
      const result = simulateGame(
        game.homeTeamId,
        game.awayTeamId,
        this.playerMap,
        teamGameCounts,
        game.gameId,
        this.state.seasonStats
      );
      game.status = 'completed';
      game.result = result;
      applyGameStats(this.state.seasonStats, result);
      this._applyTeamResult(result);
      teamGameCounts[game.homeTeamId]++;
      teamGameCounts[game.awayTeamId]++;

      if (game.homeTeamId === this.state.userTeamId ||
          game.awayTeamId === this.state.userTeamId) {
        this.state.boxScores.push(result);
      }
    }

    this.state.season.currentDay = nextDay;
    this._checkSeasonEnd();
  },

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
    const remaining = this.state.schedule.filter(g => g.status === 'scheduled');
    if (remaining.length === 0) {
      this.state.season.phase = 'offseason';
      this.state.news.unshift('🏆 The regular season is over! Check the final standings.');
    }
  },

  _getLastScheduleDay() {
    return Math.max(...this.state.schedule.map(g => g.day), 0);
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

  _generateGameNews(result) {
    // Add news for user team games
    if (result.homeTeamId === this.state.userTeamId || result.awayTeamId === this.state.userTeamId) {
      // Already handled in simMessage
    }
    // Add news for notable events (shutouts, big scores, etc.)
    const totalRuns = result.homeScore + result.awayScore;
    if (totalRuns >= 15) {
      const winner = TEAMS_META.find(t => t.id === result.winningTeam);
      this.state.news.unshift(`High-scoring game: ${result.awayTeamId} ${result.awayScore} @ ${result.homeTeamId} ${result.homeScore}`);
    }
    if (result.homeScore === 0 || result.awayScore === 0) {
      const winner = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
      this.state.news.unshift(`Shutout! ${winner} blanks their opponent`);
    }
    // Keep news list bounded
    if (this.state.news.length > 30) this.state.news = this.state.news.slice(0, 30);
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
    return PLAYERS_DATA.filter(p => p.teamId === teamId);
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

  deleteSave() {
    SaveManager.delete();
    this.state = null;
    this.go('mainMenu');
  },

  // Season progress 0–1
  seasonProgress() {
    if (!this.state) return 0;
    const total = this.state.schedule.length;
    const done  = this.state.schedule.filter(g => g.status === 'completed').length;
    return total > 0 ? done / total : 0;
  },

  currentSeasonDay() {
    return this.state?.season?.currentDay || 0;
  },
};

// ── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
