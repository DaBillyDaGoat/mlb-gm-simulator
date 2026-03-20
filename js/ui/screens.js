/**
 * Screen Renderers
 * Each function returns an HTML string for a full screen
 */
'use strict';

const Screens = {

  // ── Main Menu ─────────────────────────────────────────────────────────────

  mainMenu(app) {
    const hasSave = SaveManager.exists();
    const saveInfo = hasSave && app.state
      ? (() => {
          const rec = app.getUserRecord();
          const tm = app.getTeamMeta(app.state.userTeamId);
          const pct = Math.round(app.seasonProgress() * 100);
          return `<p class="save-info">${tm.full} · ${rec.wins}–${rec.losses} · ${pct}% complete</p>`;
        })()
      : '';

    return `
      <div class="screen menu-screen">
        <div class="menu-hero">
          <div class="menu-logo">⚾</div>
          <h1 class="menu-title">Baseball<br>Franchise<br>Simulator</h1>
          <p class="menu-subtitle">MLB The Show 26 Rosters · 30 Teams · Full Season</p>
        </div>

        <div class="menu-buttons">
          ${hasSave ? `
            <button class="btn btn-primary btn-lg" data-action="continue">
              ▶ Continue Franchise
            </button>
            ${saveInfo}
          ` : ''}
          <button class="btn ${hasSave ? 'btn-secondary' : 'btn-primary btn-lg'}" data-action="newGame">
            ${hasSave ? '+ New Game' : '▶ New Game'}
          </button>
          ${hasSave ? `<button class="btn btn-danger btn-sm" data-action="deleteSave">Delete Save</button>` : ''}
        </div>

        <p class="menu-version">Phase 1 Alpha · 2026 Rosters</p>
      </div>`;
  },

  // ── Team Select ───────────────────────────────────────────────────────────

  teamSelect(app) {
    const leagues = [
      { name: 'American League', league: 'AL', divisions: ['East', 'Central', 'West'] },
      { name: 'National League', league: 'NL', divisions: ['East', 'Central', 'West'] },
    ];

    const divHTML = leagues.map(lg => `
      <div class="league-section">
        <h2 class="league-header">${lg.name}</h2>
        ${lg.divisions.map(div => {
          const divTeams = TEAMS_META.filter(t => t.league === lg.league && t.division === div);
          return `
            <div class="division-section">
              <h3 class="division-label">${div}</h3>
              <div class="team-grid">
                ${divTeams.map(team => {
                  const players = PLAYERS_DATA.filter(p => p.teamId === team.id);
                  const roster = players.sort((a,b) => b.overall - a.overall).slice(0, 3);
                  const avgOVR = players.length
                    ? Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length)
                    : 0;
                  return `
                    <button class="team-card" data-action="selectTeam" data-team-id="${team.id}"
                            style="--team-primary:${team.primary};--team-secondary:${team.secondary}">
                      <div class="team-card-badge">${team.id}</div>
                      <div class="team-card-name">${team.city}<br><strong>${team.name}</strong></div>
                      <div class="team-card-stars">OVR ${avgOVR}</div>
                      <div class="team-card-players">${roster.map(p => p.name.split(' ').pop()).join(' · ')}</div>
                    </button>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`).join('');

    return `
      <div class="screen team-select-screen">
        <div class="screen-header">
          <h1>Choose Your Team</h1>
          <p>Select one of the 30 MLB franchises to manage</p>
        </div>
        <div class="team-select-content">${divHTML}</div>
      </div>`;
  },

  // ── Team Hub ──────────────────────────────────────────────────────────────

  teamHub(app, params = {}) {
    const { state } = app;
    if (!state) return Screens.mainMenu(app);

    const tm     = app.getTeamMeta(state.userTeamId);
    const rec    = app.getUserRecord();
    const pct    = rec.wins + rec.losses > 0
      ? Math.round(rec.wins / (rec.wins + rec.losses) * 1000) / 10
      : 0;

    const upcoming = app.getUpcomingGames(state.userTeamId, 1);
    const recent   = app.getRecentGames(state.userTeamId, 3);
    const standings = app.getStandings();
    const userStanding = standings[state.userTeamId];
    const day    = state.season.currentDay;
    const phase  = state.season.phase;

    // Next game card
    const nextGameCard = upcoming.length > 0
      ? (() => {
          const g  = upcoming[0];
          const isHome = g.homeTeamId === state.userTeamId;
          const oppId  = isHome ? g.awayTeamId : g.homeTeamId;
          const opp    = app.getTeamMeta(oppId);
          const oppRec = app.getTeamRecord(oppId);
          return `
            <div class="next-game-card" style="--opp-primary:${opp.primary}">
              <div class="ng-label">${isHome ? 'HOME' : 'AWAY'} · Day ${g.day}</div>
              <div class="ng-matchup">
                <span class="ng-team">vs. <strong>${opp.name}</strong></span>
                <span class="ng-record">${oppRec.wins}–${oppRec.losses}</span>
              </div>
            </div>`;
        })()
      : phase === 'offseason'
        ? `<div class="next-game-card"><div class="ng-label">SEASON COMPLETE</div><div class="ng-matchup"><span class="ng-team">View Final Standings</span></div></div>`
        : `<div class="next-game-card"><div class="ng-label">OFF DAY</div></div>`;

    // Recent results
    const recentHTML = recent.length > 0
      ? `<div class="recent-games">
          ${recent.map(g => {
            const isHome = g.homeTeamId === state.userTeamId;
            const myScore  = isHome ? g.result.homeScore : g.result.awayScore;
            const oppScore = isHome ? g.result.awayScore : g.result.homeScore;
            const oppId    = isHome ? g.awayTeamId : g.homeTeamId;
            const opp      = app.getTeamMeta(oppId);
            const won      = myScore > oppScore;
            return `
              <button class="recent-game-row ${won ? 'won' : 'lost'}" data-action="viewBoxScore" data-game-id="${g.gameId}">
                <span class="rg-result">${won ? 'W' : 'L'}</span>
                <span class="rg-score">${myScore}–${oppScore}</span>
                <span class="rg-opp">vs. ${opp.name}</span>
                <span class="rg-arrow">›</span>
              </button>`;
          }).join('')}
        </div>`
      : '';

    // Sim message
    const msgHTML = params.simMessage
      ? `<div class="sim-message ${params.simMessage.startsWith('✅') ? 'win' : params.simMessage.startsWith('❌') ? 'loss' : ''}">${params.simMessage}</div>`
      : '';

    // News ticker
    const newsHTML = state.news?.length > 0
      ? `<div class="news-section">
          <div class="section-label">News</div>
          ${state.news.slice(0, 5).map(n => `<div class="news-item">${n}</div>`).join('')}
        </div>`
      : '';

    const seasonPct = Math.round(app.seasonProgress() * 100);

    return `
      <div class="screen hub-screen">
        <div class="hub-header" style="--team-primary:${tm.primary};--team-secondary:${tm.secondary}">
          <div class="hub-teamname">${tm.city} <strong>${tm.name}</strong></div>
          <div class="hub-record">${rec.wins}–${rec.losses} <span class="hub-pct">.${String(Math.round(pct * 10)).padStart(3,'0')}</span></div>
          <div class="hub-streak">${streakStr(rec.streak)}</div>
          <div class="hub-day">Day ${day} · ${seasonPct}% Complete</div>
        </div>

        ${msgHTML}

        <div class="hub-content">
          ${nextGameCard}

          <div class="sim-buttons">
            ${phase !== 'offseason' ? `
              <button class="btn btn-sim" data-action="simDay">Sim Day</button>
              <button class="btn btn-sim" data-action="simWeek">Sim Week</button>
              <button class="btn btn-sim btn-sim-season" data-action="simSeason">Sim Season</button>
            ` : `<div class="offseason-banner">🏆 Season Complete! Check standings for final results.</div>`}
          </div>

          ${recentHTML}
          ${newsHTML}

          ${userStanding ? `
            <div class="division-snapshot">
              <div class="section-label">Division Standing</div>
              <div class="div-pos">
                ${userStanding.gb === 0 ? '🥇 Division Leader' : `${userStanding.gb.toFixed(1)} GB`}
                &nbsp;·&nbsp; ${userStanding.division} Division
              </div>
            </div>
          ` : ''}
        </div>

        ${Comps.bottomNav('teamHub')}
      </div>`;
  },

  // ── Roster Screen ─────────────────────────────────────────────────────────

  roster(app, params = {}) {
    const { state } = app;
    const tm = app.getTeamMeta(state.userTeamId);
    const players = app.getTeamPlayers(state.userTeamId)
      .sort((a, b) => {
        if (a.position === b.position) return b.overall - a.overall;
        const posOrder = { SP:1, RP:2, C:3, '1B':4, '2B':5, '3B':6, SS:7, LF:8, CF:9, RF:10, DH:11, TWP:12 };
        return (posOrder[a.position] || 99) - (posOrder[b.position] || 99);
      });

    const seasonStats = state.seasonStats;
    const filter = params.filter || 'all';

    const filtered = filter === 'sp'  ? players.filter(p => p.position === 'SP')
                   : filter === 'rp'  ? players.filter(p => p.position === 'RP')
                   : filter === 'pos' ? players.filter(p => !['SP','RP'].includes(p.position))
                   : players;

    const rowsHTML = filtered.map(p => {
      const batSt = seasonStats.batting[p.id];
      const pitSt = seasonStats.pitching[p.id];
      const isPit = ['SP','RP','TWP'].includes(p.position);

      let statStr = '';
      if (isPit && pitSt && pitSt.ip > 0) {
        statStr = `${pitSt.w}-${pitSt.l} ERA ${calcERA(pitSt)}`;
      } else if (batSt && batSt.ab > 0) {
        statStr = `.${calcAVG(batSt).replace('.', '')} ${batSt.hr}HR ${batSt.rbi}RBI`;
      } else {
        statStr = `OVR ${p.overall}`;
      }

      return `
        <button class="player-row" data-action="viewPlayer" data-player-id="${p.id}">
          <span class="pr-pos ${p.position.replace('/','')}">${p.position}</span>
          <span class="pr-num">${p.jerseyNumber}</span>
          <span class="pr-name">${p.name}</span>
          <span class="pr-stats">${statStr}</span>
          <span class="pr-arrow">›</span>
        </button>`;
    }).join('');

    return `
      <div class="screen roster-screen">
        <div class="screen-header" style="--team-primary:${tm.primary}">
          <h1>${tm.name} Roster</h1>
          <div class="filter-tabs">
            <button class="filter-tab ${filter==='all'?'active':''}" data-action="nav" data-screen="roster">All</button>
            <button class="filter-tab ${filter==='sp'?'active':''}" onclick="App.go('roster',{filter:'sp'})">SP</button>
            <button class="filter-tab ${filter==='rp'?'active':''}" onclick="App.go('roster',{filter:'rp'})">RP</button>
            <button class="filter-tab ${filter==='pos'?'active':''}" onclick="App.go('roster',{filter:'pos'})">Pos</button>
          </div>
        </div>
        <div class="player-list">${rowsHTML}</div>
        ${Comps.bottomNav('roster')}
      </div>`;
  },

  // ── Standings Screen ──────────────────────────────────────────────────────

  standings(app, params = {}) {
    const standings = app.getStandings();
    const userTeamId = app.state.userTeamId;
    const tab = params.tab || 'AL';

    const divOrder = [
      { league: 'AL', div: 'East',    label: 'AL East' },
      { league: 'AL', div: 'Central', label: 'AL Central' },
      { league: 'AL', div: 'West',    label: 'AL West' },
      { league: 'NL', div: 'East',    label: 'NL East' },
      { league: 'NL', div: 'Central', label: 'NL Central' },
      { league: 'NL', div: 'West',    label: 'NL West' },
    ].filter(d => d.league === tab);

    const tableHTML = divOrder.map(({ league, div, label }) => {
      const divTeams = Object.values(standings)
        .filter(t => t.league === league && t.division === div)
        .sort((a, b) => b.pct - a.pct || b.wins - a.wins);

      return `
        <div class="standings-division">
          <div class="div-header">${label}</div>
          <div class="standings-table">
            <div class="st-header">
              <span class="st-team">Team</span>
              <span class="st-w">W</span>
              <span class="st-l">L</span>
              <span class="st-pct">PCT</span>
              <span class="st-gb">GB</span>
              <span class="st-strk">STK</span>
            </div>
            ${divTeams.map((t, i) => {
              const tm = app.getTeamMeta(t.teamId);
              const isUser = t.teamId === userTeamId;
              return `
                <div class="st-row ${isUser ? 'user-team' : ''} ${i === 0 ? 'leader' : ''}">
                  <span class="st-team" style="--tc:${tm.primary}">
                    <span class="st-abbr">${t.teamId}</span>
                    <span class="st-name">${t.name}</span>
                  </span>
                  <span class="st-w">${t.wins}</span>
                  <span class="st-l">${t.losses}</span>
                  <span class="st-pct">${t.pct.toFixed(3).replace('0.','.').replace('1.000','1.000')}</span>
                  <span class="st-gb">${t.gb === 0 ? '—' : t.gb % 1 === 0.5 ? t.gb.toFixed(1) : t.gb.toFixed(1)}</span>
                  <span class="st-strk ${t.streak?.type === 'W' ? 'streak-w' : 'streak-l'}">${streakStr(t.streak)}</span>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="screen standings-screen">
        <div class="screen-header">
          <h1>Standings</h1>
          <div class="tab-bar">
            <button class="tab ${tab==='AL'?'active':''}" onclick="App.go('standings',{tab:'AL'})">AL</button>
            <button class="tab ${tab==='NL'?'active':''}" onclick="App.go('standings',{tab:'NL'})">NL</button>
          </div>
        </div>
        <div class="standings-content">${tableHTML}</div>
        ${Comps.bottomNav('standings')}
      </div>`;
  },

  // ── Box Score Screen ──────────────────────────────────────────────────────

  boxScore(app, params = {}) {
    const { gameId } = params;
    const result = app.getBoxScore(gameId);

    if (!result) {
      return `
        <div class="screen">
          <div class="screen-header"><h1>Box Score</h1></div>
          <div class="empty-state">Game data not available</div>
          ${Comps.bottomNav('standings')}
        </div>`;
    }

    const home = app.getTeamMeta(result.homeTeamId);
    const away = app.getTeamMeta(result.awayTeamId);
    const homeWon = result.homeScore > result.awayScore;

    // Line score
    const maxInning = result.inningScores.length || 9;
    const inningHeaders = Array.from({ length: maxInning }, (_, i) => `<span>${i + 1}</span>`).join('');
    const awayLine = result.inningScores.map(i => `<span>${i.top ?? '-'}</span>`).join('');
    const homeLine = result.inningScores.map(i => `<span>${i.bot ?? '-'}</span>`).join('');

    // Batting lines
    const batRows = (teamId, lineup) => {
      const teamPlayers = PLAYERS_DATA.filter(p => p.teamId === teamId);
      // Collect batters from gameStats
      const batters = Object.entries(result.gameStats?.batting || {})
        .filter(([pid]) => {
          const p = App.playerMap[pid];
          return p && p.teamId === teamId;
        })
        .map(([pid, s]) => ({ pid, ...s, name: App.playerMap[pid]?.name || pid }))
        .filter(b => b.ab > 0 || b.bb > 0 || b.hbp > 0);

      if (batters.length === 0) return '<div class="empty-state">No batting data</div>';

      return `
        <div class="box-batting">
          <div class="box-bat-header">
            <span class="bh-name">Batter</span>
            <span>AB</span><span>R</span><span>H</span><span>RBI</span><span>BB</span><span>K</span>
          </div>
          ${batters.map(b => `
            <div class="box-bat-row">
              <span class="bh-name">${b.name}</span>
              <span>${b.ab||0}</span>
              <span>${b.r||0}</span>
              <span>${b.h||0}</span>
              <span>${b.rbi||0}</span>
              <span>${b.bb||0}</span>
              <span>${b.k||0}</span>
            </div>`).join('')}
        </div>`;
    };

    // Pitching lines
    const pitRows = (teamId) => {
      const pitchers = Object.entries(result.gameStats?.pitching || {})
        .filter(([pid]) => {
          const p = App.playerMap[pid];
          return p && p.teamId === teamId;
        })
        .map(([pid, s]) => ({ pid, ...s, name: App.playerMap[pid]?.name || pid }))
        .filter(p => p.ip > 0 || p.pitches > 0);

      if (pitchers.length === 0) return '<div class="empty-state">No pitching data</div>';

      return `
        <div class="box-pitching">
          <div class="box-pit-header">
            <span class="bh-name">Pitcher</span>
            <span>IP</span><span>H</span><span>R</span><span>ER</span><span>BB</span><span>K</span>
          </div>
          ${pitchers.map(p => `
            <div class="box-pit-row ${p.wins ? 'wp' : p.losses ? 'lp' : ''}">
              <span class="bh-name">${p.name}${p.wins ? ' (W)' : p.losses ? ' (L)' : ''}</span>
              <span>${fmtIP(p.ip||0)}</span>
              <span>${p.h||0}</span>
              <span>${p.r||0}</span>
              <span>${p.er||0}</span>
              <span>${p.bb||0}</span>
              <span>${p.k||0}</span>
            </div>`).join('')}
        </div>`;
    };

    // Play-by-play (last 20 events)
    const pbp = (result.playByPlay || []).slice(-20);

    return `
      <div class="screen box-score-screen">
        <div class="screen-header">
          <h1>Box Score</h1>
        </div>

        <div class="linescore-card">
          <div class="ls-grid">
            <div class="ls-header"><span class="ls-team-label"></span>${inningHeaders}<span class="ls-total">R</span></div>
            <div class="ls-row ${homeWon ? '' : 'winner'}">
              <span class="ls-team-label">${away.id}</span>
              ${awayLine}
              <span class="ls-total">${result.awayScore}</span>
            </div>
            <div class="ls-row ${homeWon ? 'winner' : ''}">
              <span class="ls-team-label">${home.id}</span>
              ${homeLine}
              <span class="ls-total">${result.homeScore}</span>
            </div>
          </div>
        </div>

        <div class="box-section">
          <div class="box-team-header" style="--tc:${away.primary}">${away.full} Batting</div>
          ${batRows(result.awayTeamId)}
        </div>

        <div class="box-section">
          <div class="box-team-header" style="--tc:${home.primary}">${home.full} Batting</div>
          ${batRows(result.homeTeamId)}
        </div>

        <div class="box-section">
          <div class="box-team-header" style="--tc:${away.primary}">${away.full} Pitching</div>
          ${pitRows(result.awayTeamId)}
        </div>

        <div class="box-section">
          <div class="box-team-header" style="--tc:${home.primary}">${home.full} Pitching</div>
          ${pitRows(result.homeTeamId)}
        </div>

        ${pbp.length > 0 ? `
          <div class="box-section">
            <div class="box-team-header">Play by Play</div>
            <div class="pbp-log">
              ${pbp.map(p => `<div class="pbp-line">${p}</div>`).join('')}
            </div>
          </div>
        ` : ''}

        ${Comps.bottomNav('standings')}
      </div>`;
  },

  // ── Season Leaders ─────────────────────────────────────────────────────────

  leaders(app, params = {}) {
    const { state } = app;
    const leaders = getLeaders(state.seasonStats, App.playerMap, 10);
    const tab = params.tab || 'batting';

    const battingLeaders = `
      <div class="leaders-group">
        <div class="lg-title">Batting Average</div>
        ${Comps.leaderTable(leaders.avg, 'avg', (l) => calcAVG(l.stats))}
      </div>
      <div class="leaders-group">
        <div class="lg-title">Home Runs</div>
        ${Comps.leaderTable(leaders.hr, 'hr', (l) => l.hr)}
      </div>
      <div class="leaders-group">
        <div class="lg-title">RBI</div>
        ${Comps.leaderTable(leaders.rbi, 'rbi', (l) => l.rbi)}
      </div>`;

    const pitchingLeaders = `
      <div class="leaders-group">
        <div class="lg-title">ERA</div>
        ${Comps.leaderTable(leaders.era, 'era', (l) => calcERA(l.stats))}
      </div>
      <div class="leaders-group">
        <div class="lg-title">Wins</div>
        ${Comps.leaderTable(leaders.wins, 'wins', (l) => l.w)}
      </div>
      <div class="leaders-group">
        <div class="lg-title">Strikeouts</div>
        ${Comps.leaderTable(leaders.k, 'k', (l) => l.k)}
      </div>`;

    const noStats = Object.keys(state.seasonStats.batting).length === 0;

    return `
      <div class="screen leaders-screen">
        <div class="screen-header">
          <h1>Season Leaders</h1>
          <div class="tab-bar">
            <button class="tab ${tab==='batting'?'active':''}" onclick="App.go('leaders',{tab:'batting'})">Batting</button>
            <button class="tab ${tab==='pitching'?'active':''}" onclick="App.go('leaders',{tab:'pitching'})">Pitching</button>
          </div>
        </div>
        <div class="leaders-content">
          ${noStats
            ? `<div class="empty-state"><p>No stats yet — simulate some games first!</p></div>`
            : tab === 'batting' ? battingLeaders : pitchingLeaders
          }
        </div>
        ${Comps.bottomNav('leaders')}
      </div>`;
  },

  // ── Schedule Screen ────────────────────────────────────────────────────────

  schedule(app, params = {}) {
    const { state } = app;
    const tm = app.getTeamMeta(state.userTeamId);

    const userGames = state.schedule
      .filter(g => g.homeTeamId === state.userTeamId || g.awayTeamId === state.userTeamId)
      .slice(0, 50); // show next 50 games

    const rows = userGames.map(g => {
      const isHome = g.homeTeamId === state.userTeamId;
      const oppId  = isHome ? g.awayTeamId : g.homeTeamId;
      const opp    = app.getTeamMeta(oppId);

      if (g.status === 'completed' && g.result) {
        const myScore  = isHome ? g.result.homeScore : g.result.awayScore;
        const oppScore = isHome ? g.result.awayScore : g.result.homeScore;
        const won = myScore > oppScore;
        const boxId = g.result.gameId;
        // Check if box score available
        const hasBox = state.boxScores.some(b => b.gameId === boxId);
        return `
          <div class="schedule-row completed ${won ? 'won' : 'lost'}"
               ${hasBox ? `data-action="viewBoxScore" data-game-id="${boxId}" style="cursor:pointer"` : ''}>
            <span class="sr-day">D${g.day}</span>
            <span class="sr-ha">${isHome ? 'vs' : '@'}</span>
            <span class="sr-opp">${opp.name}</span>
            <span class="sr-score">${myScore}–${oppScore}</span>
            <span class="sr-result">${won ? 'W' : 'L'}</span>
          </div>`;
      } else {
        return `
          <div class="schedule-row upcoming">
            <span class="sr-day">D${g.day}</span>
            <span class="sr-ha">${isHome ? 'vs' : '@'}</span>
            <span class="sr-opp">${opp.name}</span>
            <span class="sr-score">—</span>
            <span class="sr-result sr-upcoming">•</span>
          </div>`;
      }
    }).join('');

    return `
      <div class="screen schedule-screen">
        <div class="screen-header" style="--team-primary:${tm.primary}">
          <h1>${tm.name} Schedule</h1>
        </div>
        <div class="schedule-list">${rows || '<div class="empty-state">No games scheduled</div>'}</div>
        ${Comps.bottomNav('schedule')}
      </div>`;
  },

  // ── Player Card ────────────────────────────────────────────────────────────

  playerCard(app, params = {}) {
    const player = App.playerMap[params.playerId];
    if (!player) {
      return `<div class="screen"><div class="empty-state">Player not found</div>${Comps.bottomNav('roster')}</div>`;
    }

    const tm = app.getTeamMeta(player.teamId);
    const batSt = app.state.seasonStats.batting[player.id]  || emptyBattingStats();
    const pitSt = app.state.seasonStats.pitching[player.id] || emptyPitchingStats();
    const isPit = ['SP','RP'].includes(player.position);
    const isTWP = player.position === 'TWP';

    const attrBar = (label, val, max = 99) => {
      const pct = Math.round((val / max) * 100);
      const cls = pct >= 80 ? 'attr-elite' : pct >= 60 ? 'attr-good' : pct >= 40 ? 'attr-avg' : 'attr-poor';
      return `
        <div class="attr-row">
          <span class="attr-label">${label}</span>
          <div class="attr-bar-bg">
            <div class="attr-bar ${cls}" style="width:${pct}%"></div>
          </div>
          <span class="attr-val">${val}</span>
        </div>`;
    };

    const battingAttrs = `
      ${attrBar('Con vs R', player.batting.contactR, 125)}
      ${attrBar('Con vs L', player.batting.contactL, 125)}
      ${attrBar('Pow vs R', player.batting.powerR, 125)}
      ${attrBar('Pow vs L', player.batting.powerL, 125)}
      ${attrBar('Speed', player.batting.speed)}
      ${attrBar('Clutch', player.batting.clutch)}`;

    const pitchingAttrs = `
      ${attrBar('Velocity', player.pitching.velocity)}
      ${attrBar('Control', player.pitching.control)}
      ${attrBar('Break', player.pitching.break)}
      ${attrBar('Stamina', player.pitching.stamina)}`;

    const statsBlock = isPit || isTWP
      ? `<div class="stat-grid">
          <div class="stat-box"><div class="sb-val">${pitSt.w}-${pitSt.l}</div><div class="sb-label">W-L</div></div>
          <div class="stat-box"><div class="sb-val">${calcERA(pitSt)}</div><div class="sb-label">ERA</div></div>
          <div class="stat-box"><div class="sb-val">${fmtIP(pitSt.ip)}</div><div class="sb-label">IP</div></div>
          <div class="stat-box"><div class="sb-val">${pitSt.k}</div><div class="sb-label">K</div></div>
          <div class="stat-box"><div class="sb-val">${pitSt.bb}</div><div class="sb-label">BB</div></div>
          <div class="stat-box"><div class="sb-val">${calcWHIP(pitSt)}</div><div class="sb-label">WHIP</div></div>
        </div>`
      : `<div class="stat-grid">
          <div class="stat-box"><div class="sb-val">${calcAVG(batSt)}</div><div class="sb-label">AVG</div></div>
          <div class="stat-box"><div class="sb-val">${calcOPS(batSt)}</div><div class="sb-label">OPS</div></div>
          <div class="stat-box"><div class="sb-val">${batSt.hr}</div><div class="sb-label">HR</div></div>
          <div class="stat-box"><div class="sb-val">${batSt.rbi}</div><div class="sb-label">RBI</div></div>
          <div class="stat-box"><div class="sb-val">${batSt.r}</div><div class="sb-label">R</div></div>
          <div class="stat-box"><div class="sb-val">${batSt.h}</div><div class="sb-label">H</div></div>
        </div>`;

    const pitches = player.pitching.pitches || [];

    return `
      <div class="screen player-card-screen">
        <div class="pc-header" style="--team-primary:${tm.primary};--team-secondary:${tm.secondary}">
          <button class="back-btn" onclick="App.go('roster')">‹ Back</button>
          <div class="pc-num">#${player.jerseyNumber}</div>
          <div class="pc-name">${player.name}</div>
          <div class="pc-info">${player.position} · ${tm.name}</div>
          <div class="pc-ovr">OVR ${player.overall}</div>
        </div>

        <div class="pc-body">
          <div class="pc-bio">
            <span>${player.height} · ${player.weight} lbs</span>
            <span>Age ${player.age}</span>
            <span>B/T: ${player.bats}/${player.throws}</span>
            <span>$${(player.salary / 1000).toFixed(1)}M</span>
          </div>

          <div class="section-label">2026 Stats</div>
          ${statsBlock}

          <div class="section-label">Batting Attributes</div>
          <div class="attrs">${battingAttrs}</div>

          ${isPit || isTWP ? `
            <div class="section-label">Pitching Attributes</div>
            <div class="attrs">${pitchingAttrs}</div>
            ${pitches.length ? `
              <div class="section-label">Pitch Repertoire</div>
              <div class="pitch-list">
                ${pitches.map(p => `
                  <div class="pitch-row">
                    <span class="pitch-type">${p.type}</span>
                    <div class="attr-bar-bg"><div class="attr-bar ${p.rating>=80?'attr-elite':p.rating>=60?'attr-good':'attr-avg'}" style="width:${p.rating}%"></div></div>
                    <span class="attr-val">${p.rating}</span>
                  </div>`).join('')}
              </div>
            ` : ''}
          ` : ''}
        </div>

        ${Comps.bottomNav('roster')}
      </div>`;
  },
};

window.Screens = Screens;
