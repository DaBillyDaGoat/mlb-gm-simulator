/**
 * Screen Renderers
 * Each function returns an HTML string for a full screen
 */
'use strict';

// Helper: inline team logo img tag with fallback
function logoImg(teamId, cls = 'team-logo-sm') {
  return `<img src="assets/logos/${teamId}.png" alt="${teamId}" class="${cls}" onerror="this.style.display='none'">`;
}

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
          const isRivalry = isDivisional;
          return `
            <div class="next-game-card" style="--opp-primary:${opp.primary}${isRivalry ? ';border-color:var(--red)' : ''}">
              <div class="ng-label">${isHome ? 'HOME' : 'AWAY'} · Day ${g.day}${isRivalry ? '<span class="rivalry-badge">RIVALRY</span>' : ''}${g.isDoubleheader ? '<span class="dh-badge">DH</span>' : ''}</div>
              <div class="ng-matchup">
                ${logoImg(oppId, 'team-logo-sm')}
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

    // Injury / return popups
    const injPopup = (state.pendingInjuryPopups?.length > 0)
      ? Comps.injuryPopup(state.pendingInjuryPopups) : '';
    const retPopup = (!injPopup && state.pendingReturnPopups?.length > 0)
      ? Comps.returnPopup(state.pendingReturnPopups) : '';
    // Achievement popup
    const achPopup = (!injPopup && !retPopup && state.pendingAchievements?.length > 0)
      ? Comps.achievementPopup(state.pendingAchievements) : '';
    // HOF popup
    const hofPopup = (!injPopup && !retPopup && !achPopup && state.pendingHOF?.length > 0)
      ? Comps.hofPopup(state.pendingHOF) : '';
    // Manager decision overlay
    const decisionOverlay = state.pendingDecision
      ? Comps.decisionCard(state.pendingDecision) : '';
    // Milestone toast (show first pending)
    const milestoneToast = (!injPopup && !retPopup && !achPopup && state.pendingMilestones?.length > 0)
      ? Comps.milestoneToast(state.pendingMilestones[0].msg) : '';

    // Rivalry check
    const isDivisional = (() => {
      const next = upcoming[0];
      if (!next) return false;
      const oppId = next.homeTeamId === state.userTeamId ? next.awayTeamId : next.homeTeamId;
      const userMeta = TEAMS_META.find(t => t.id === state.userTeamId);
      const oppMeta  = TEAMS_META.find(t => t.id === oppId);
      return userMeta && oppMeta && userMeta.league === oppMeta.league && userMeta.division === oppMeta.division;
    })();

    // Game recap for last played game
    const lastGameRecap = (() => {
      if (!params.lastGame) return '';
      const recap = state.gameRecaps?.[params.lastGame];
      if (!recap) return '';
      return `<div class="news-item" style="font-style:italic;color:var(--text2);padding:10px 14px;border-left:2px solid var(--accent);margin:8px 14px;background:var(--bg2);border-radius:var(--radius)">"${recap}"</div>`;
    })();

    // Sound toggle
    const soundEnabled = typeof Sound !== 'undefined' ? Sound.enabled : true;

    // Roster expansion banner
    const expansionBanner = state.rosterExpanded
      ? `<div class="expansion-banner">🗓️ September — Roster expanded to 40 players</div>` : '';

    return `
      ${injPopup || retPopup || achPopup || hofPopup}
      ${decisionOverlay}
      ${milestoneToast}
      <div class="screen hub-screen">
        <div class="hub-header" style="--team-primary:${tm.primary};--team-secondary:${tm.secondary}">
          <div class="hub-top-row">
            ${logoImg(state.userTeamId, 'team-logo-hub')}
            <div>
              <div class="hub-teamname">${tm.city} <strong>${tm.name}</strong></div>
              <div class="hub-record">${rec.wins}–${rec.losses} <span class="hub-pct">.${String(Math.round(pct * 10)).padStart(3,'0')}</span></div>
            </div>
          </div>
          <div class="hub-streak">${streakStr(rec.streak)}</div>
          <div class="hub-day">Day ${day} · ${seasonPct}% Complete</div>
        </div>

        ${msgHTML}

        <div class="hub-content">
          ${nextGameCard}

          ${expansionBanner}

          <div class="sim-buttons">
            ${phase === 'regular_season' ? `
              <button class="btn btn-sim" data-action="simDay">Sim Day${state.pendingDecision ? '<span class="sim-btn-badge">!</span>' : ''}</button>
              <button class="btn btn-sim" data-action="simWeek">Sim Week</button>
              <button class="btn btn-sim btn-sim-season" data-action="simSeason">Sim Season</button>
            ` : phase === 'playoffs' ? `
              <div class="offseason-banner">🏆 Regular season complete! Time for the playoffs.</div>
              <button class="btn btn-primary" data-action="startPlayoffs">▶ Sim Playoffs</button>
            ` : `
              <div class="offseason-banner">🏆 Season Complete!</div>
              ${state.playoffs ? `<button class="btn btn-secondary" data-action="viewPlayoffs">View Playoffs Bracket</button>` : ''}
              ${state.awards ? `<button class="btn btn-secondary" data-action="viewAwards">View Awards</button>` : ''}
              ${state.seasonRecaps?.length > 0 ? `<button class="btn btn-secondary" data-action="viewSeasonRecap">📊 Year in Review</button>` : ''}
              ${state.offseasonPhase === 'free_agency' ? `<button class="btn btn-primary" data-action="runFreeAgency">Run Free Agency</button>` : ''}
              ${state.offseasonPhase === 'draft' ? `<button class="btn btn-primary" data-action="runDraft">Run MLB Draft</button>` : ''}
              ${state.offseasonPhase === 'complete' ? `<button class="btn btn-primary" data-action="startNewSeason">Start ${(state.season.year || 2026) + 1} Season</button>` : ''}
            `}
          </div>

          ${lastGameRecap}
          ${recentHTML}

          ${(() => {
            // Injuries panel for user team
            const injuries = app.getTeamInjuries ? app.getTeamInjuries(state.userTeamId) : [];
            if (injuries.length === 0) return '';
            return `<div class="news-section">
              <div class="section-label">Injured Players (${injuries.length})</div>
              ${injuries.slice(0, 4).map(inj => {
                const p = App.playerMap[inj.playerId];
                return `<div class="news-item injury-item">🏥 ${inj.playerName || p?.name || inj.playerId} — ${inj.il} (${inj.daysRemaining}d left)</div>`;
              }).join('')}
            </div>`;
          })()}

          ${newsHTML}

          ${(state.waiverPool?.length > 0 && phase === 'regular_season') ? `
            <div class="news-section" style="margin-top:0">
              <button class="fo-nav-btn" onclick="App.go('waiverWire')" style="border-radius:var(--radius);background:var(--card)">
                <span>🛒 Waiver Wire <span style="color:var(--text2);font-size:12px">${state.waiverPool.filter(id=>App.playerMap[id]&&!App.playerMap[id].isWaived).length} available</span></span>
                <span class="fo-btn-arrow">›</span>
              </button>
            </div>` : ''}

          <div style="padding:0 14px 4px;display:flex;justify-content:flex-end">
            <button class="sound-toggle ${soundEnabled ? 'on' : 'off'}" data-action="toggleSound">
              ${soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
            </button>
          </div>

          ${userStanding ? `
            <div class="division-snapshot">
              <div class="section-label">Division Standing</div>
              <div class="div-pos">
                ${userStanding.gb === 0 ? '🥇 Division Leader' : `${userStanding.gb.toFixed(1)} GB`}
                &nbsp;·&nbsp; ${userStanding.division} Division
              </div>
              ${(() => {
                const payroll = app.getTeamPayroll ? app.getTeamPayroll(state.userTeamId) : 0;
                const budget = app.getTeamMeta(state.userTeamId).budget || 150000;
                const pct = Math.min(100, Math.round(payroll / (budget * 1.1) * 100));
                return payroll > 0 ? `<div class="payroll-bar-wrap">
                  <span class="payroll-label">Payroll: $${(payroll/1000).toFixed(0)}M / $${(budget/1000).toFixed(0)}M</span>
                  <div class="payroll-bar-bg"><div class="payroll-bar ${pct > 100 ? 'over-budget' : ''}" style="width:${Math.min(pct,100)}%"></div></div>
                </div>` : '';
              })()}
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
    const injuries = state.injuries || {};

    const filtered = filter === 'sp'  ? players.filter(p => p.position === 'SP')
                   : filter === 'rp'  ? players.filter(p => p.position === 'RP')
                   : filter === 'pos' ? players.filter(p => !['SP','RP'].includes(p.position))
                   : filter === 'il'  ? players.filter(p => injuries[p.id])
                   : players;

    const rowsHTML = filtered.map(p => {
      const batSt = seasonStats.batting[p.id];
      const pitSt = seasonStats.pitching[p.id];
      const isPit = ['SP','RP','TWP'].includes(p.position);
      const inj   = injuries[p.id];
      const streak = app.getPlayerStreak ? app.getPlayerStreak(p.id) : null;
      const streakBadge = streak && streak.mod > 0 ? ' 🔥' : streak && streak.mod < 0 ? ' 🥶' : '';

      let statStr = '';
      if (isPit && pitSt && pitSt.ip > 0) {
        statStr = `${pitSt.w}-${pitSt.l} ERA ${calcERA(pitSt)}`;
      } else if (batSt && batSt.ab > 0) {
        statStr = `${calcAVG(batSt)} ${batSt.hr}HR ${batSt.rbi}RBI ${batSt.sb > 0 ? batSt.sb + 'SB' : ''}`.trim();
      } else {
        statStr = `OVR ${p.overall}`;
      }

      const injBadge = inj ? `<span class="il-badge il-${inj.il.toLowerCase()}">${inj.il}</span>` : '';

      return `
        <button class="player-row ${inj ? 'injured' : ''}" data-action="viewPlayer" data-player-id="${p.id}">
          <span class="pr-pos ${p.position.replace('/','')}">${p.position}</span>
          <span class="pr-num">${p.jerseyNumber}</span>
          <span class="pr-name">${p.name}${streakBadge}${injBadge}</span>
          <span class="pr-stats">${statStr}</span>
          <span class="pr-arrow">›</span>
        </button>`;
    }).join('');

    const injCount = players.filter(p => injuries[p.id]).length;

    return `
      <div class="screen roster-screen">
        <div class="screen-header" style="--team-primary:${tm.primary}">
          <h1>${tm.name} Roster</h1>
          <div class="filter-tabs">
            <button class="filter-tab ${filter==='all'?'active':''}" data-action="nav" data-screen="roster">All</button>
            <button class="filter-tab ${filter==='sp'?'active':''}" onclick="App.go('roster',{filter:'sp'})">SP</button>
            <button class="filter-tab ${filter==='rp'?'active':''}" onclick="App.go('roster',{filter:'rp'})">RP</button>
            <button class="filter-tab ${filter==='pos'?'active':''}" onclick="App.go('roster',{filter:'pos'})">Pos</button>
            ${injCount > 0 ? `<button class="filter-tab ${filter==='il'?'active':''}" onclick="App.go('roster',{filter:'il'})">IL (${injCount})</button>` : ''}
          </div>
        </div>
        <div class="roster-mgmt-links">
          <button class="roster-mgmt-link" onclick="App.go('lineup')">📋 Batting Lineup</button>
          <button class="roster-mgmt-link" onclick="App.go('rotation')">⚾ Rotation &amp; Bullpen</button>
        </div>
        <div class="player-list">${rowsHTML || '<div class="empty-state">No players found</div>'}</div>
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
                    ${logoImg(t.teamId, 'team-logo-xs')}
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
            <button class="tab" onclick="App.go('schedule')" style="margin-left:auto">Schedule ›</button>
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

        <div class="box-matchup-header">
          <div class="box-team-side">
            ${logoImg(result.awayTeamId, 'team-logo-md')}
            <span style="color:${away.primary};font-weight:700">${away.id}</span>
          </div>
          <div class="box-vs-score">
            <span class="${!homeWon ? 'box-winner-score' : ''}">${result.awayScore}</span>
            <span class="box-vs-sep">—</span>
            <span class="${homeWon ? 'box-winner-score' : ''}">${result.homeScore}</span>
          </div>
          <div class="box-team-side box-team-side-right">
            <span style="color:${home.primary};font-weight:700">${home.id}</span>
            ${logoImg(result.homeTeamId, 'team-logo-md')}
          </div>
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
      </div>
      <div class="leaders-group">
        <div class="lg-title">Stolen Bases</div>
        ${Comps.leaderTable(leaders.sb || [], 'sb', (l) => l.sb)}
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

    const userMeta = app.getTeamMeta(state.userTeamId);
    const rows = userGames.map(g => {
      const isHome = g.homeTeamId === state.userTeamId;
      const oppId  = isHome ? g.awayTeamId : g.homeTeamId;
      const opp    = app.getTeamMeta(oppId);
      const isRival = opp.league === userMeta.league && opp.division === userMeta.division;
      const dhBadge = g.isDoubleheader ? `<span class="dh-badge">DH</span>` : '';
      const rvBadge = isRival ? `<span class="rivalry-badge" style="font-size:8px;padding:1px 4px">RIV</span>` : '';

      if (g.status === 'completed' && g.result) {
        const myScore  = isHome ? g.result.homeScore : g.result.awayScore;
        const oppScore = isHome ? g.result.awayScore : g.result.homeScore;
        const won = myScore > oppScore;
        const boxId = g.result.gameId;
        const hasBox = state.boxScores.some(b => b.gameId === boxId);
        return `
          <div class="schedule-row completed ${won ? 'won' : 'lost'}"
               ${hasBox ? `data-action="viewBoxScore" data-game-id="${boxId}" style="cursor:pointer"` : ''}>
            <span class="sr-day">D${g.day}</span>
            <span class="sr-ha">${isHome ? 'vs' : '@'}</span>
            ${logoImg(oppId, 'team-logo-xs')}
            <span class="sr-opp">${opp.name}${rvBadge}${dhBadge}</span>
            <span class="sr-score">${myScore}–${oppScore}</span>
            <span class="sr-result">${won ? 'W' : 'L'}</span>
          </div>`;
      } else {
        return `
          <div class="schedule-row upcoming">
            <span class="sr-day">D${g.day}</span>
            <span class="sr-ha">${isHome ? 'vs' : '@'}</span>
            ${logoImg(oppId, 'team-logo-xs')}
            <span class="sr-opp">${opp.name}${rvBadge}${dhBadge}</span>
            <span class="sr-score">—</span>
            <span class="sr-result sr-upcoming">•</span>
          </div>`;
      }
    }).join('');

    return `
      <div class="screen schedule-screen">
        <div class="screen-header" style="--team-primary:${tm.primary}">
          <h1>${tm.name} Schedule</h1>
          <div class="tab-bar" style="margin-top:8px">
            <button class="tab" onclick="App.go('standings')">‹ Standings</button>
          </div>
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
          <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
            ${logoImg(player.teamId, 'team-logo-md')}
            <div>
              <div class="pc-num">#${player.jerseyNumber}</div>
              <div class="pc-name">${player.name}</div>
              <div class="pc-info">${player.position} · ${tm.name}</div>
            </div>
          </div>
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

        ${(() => {
          // Career stats section
          if (!app.state.careerStats?.[player.id]) return '';
          const totals = typeof getCareerTotals === 'function'
            ? getCareerTotals(app.state.careerStats, player.id)
            : null;
          if (!totals) return '';
          const seasons = [...(totals.battingHistory || []), ...(totals.pitchingHistory || [])];
          if (seasons.length === 0) return '';

          const histRows = (isPit || isTWP ? totals.pitchingHistory : totals.battingHistory).map(s => {
            const tm2 = app.getTeamMeta(player.teamId);
            let statStr = '';
            if (isPit || isTWP) {
              const era = s.ip > 0 ? ((s.er || 0) * 9 / s.ip).toFixed(2) : '—';
              statStr = `${s.w || 0}-${s.l || 0} ${era} ERA ${Math.round(s.ip || 0)}IP ${s.k || 0}K`;
            } else {
              const avg = s.ab > 0 ? (s.h / s.ab).toFixed(3).replace('0.','.') : '.000';
              statStr = `${avg} ${s.hr || 0}HR ${s.rbi || 0}RBI ${s.sb > 0 ? (s.sb + 'SB') : ''}`.trim();
            }
            return `
              <div class="career-row">
                <span class="career-year">${s.year}</span>
                <span class="career-team">${tm2.id}</span>
                <span class="career-stats">${statStr}</span>
              </div>`;
          }).join('');

          if (!histRows) return '';
          return `
            <div class="section-label" style="padding:14px 16px 6px">Career Stats</div>
            <div class="career-history" style="padding:0 16px 14px">${histRows}</div>`;
        })()}

        ${Comps.bottomNav('roster')}
      </div>`;
  },
  // ── Playoffs Screen ────────────────────────────────────────────────────────

  playoffs(app, params = {}) {
    const { state } = app;
    const po = state.playoffs;

    if (!po) {
      return `
        <div class="screen">
          <div class="screen-header"><h1>Playoffs</h1></div>
          <div class="empty-state">
            <p>Playoffs haven't started yet.</p>
            ${state.season.phase === 'playoffs'
              ? `<button class="btn btn-primary" data-action="startPlayoffs">▶ Sim Playoffs</button>`
              : '<p>Finish the regular season first.</p>'}
          </div>
          ${Comps.bottomNav('standings')}
        </div>`;
    }

    const teamName = (id) => {
      const m = TEAMS_META.find(t => t.id === id);
      return m ? m.name : (id || '?');
    };
    const teamColor = (id) => {
      const m = TEAMS_META.find(t => t.id === id);
      return m ? m.primary : '#444';
    };

    const seriesBlock = (series, label) => {
      if (!series) return '';
      const wName = teamName(series.winner);
      const lName = teamName(series.loser);
      const wWins = series.winner === series.team1 ? series.t1Wins : series.t2Wins;
      const lWins = series.winner === series.team1 ? series.t2Wins : series.t1Wins;
      const isUserInvolved = series.team1 === state.userTeamId || series.team2 === state.userTeamId;
      return `
        <div class="po-series ${isUserInvolved ? 'user-series' : ''}">
          <div class="po-series-label">${label}</div>
          <div class="po-winner" style="color:${teamColor(series.winner)}">${wName} <span class="po-wins">${wWins}</span></div>
          <div class="po-loser">${lName} <span class="po-wins">${lWins}</span></div>
        </div>`;
    };

    const leagueBracket = (league) => {
      const lb = po[league];
      if (!lb) return '';
      return `
        <div class="po-league">
          <div class="po-league-title">${league}</div>
          <div class="po-round-label">Wild Card</div>
          <div class="po-round">
            ${seriesBlock(lb.wildCard[0], 'WC1')}
            ${seriesBlock(lb.wildCard[1], 'WC2')}
          </div>
          <div class="po-round-label">Division Series</div>
          <div class="po-round">
            ${seriesBlock(lb.divisionSeries[0], 'DS1')}
            ${seriesBlock(lb.divisionSeries[1], 'DS2')}
          </div>
          <div class="po-round-label">Championship Series</div>
          <div class="po-round">
            ${seriesBlock(lb.championshipSeries, 'CS')}
          </div>
          <div class="po-champion">
            <span>League Champion:</span>
            <strong style="color:${teamColor(lb.champion)}">${teamName(lb.champion)}</strong>
          </div>
        </div>`;
    };

    const wsBlock = po.worldSeries ? (() => {
      const ws = po.worldSeries;
      const wWins = ws.winner === ws.team1 ? ws.t1Wins : ws.t2Wins;
      const lWins = ws.winner === ws.team1 ? ws.t2Wins : ws.t1Wins;
      return `
        <div class="po-world-series">
          <div class="po-ws-title">🏆 World Series</div>
          <div class="po-ws-result">
            <div class="po-ws-winner" style="color:${teamColor(ws.winner)}">${teamName(ws.winner)}</div>
            <div class="po-ws-score">${wWins} — ${lWins}</div>
            <div class="po-ws-loser">${teamName(ws.loser)}</div>
          </div>
          <div class="po-ws-champ">World Series Champion: <strong style="color:${teamColor(ws.winner)}">${teamName(ws.winner)}</strong></div>
        </div>`;
    })() : '';

    return `
      <div class="screen playoffs-screen">
        <div class="screen-header">
          <h1>Playoffs</h1>
          <p>${state.season.year || 2026} MLB Playoffs</p>
        </div>
        <div class="po-content">
          ${wsBlock}
          <div class="po-leagues">
            ${leagueBracket('AL')}
            ${leagueBracket('NL')}
          </div>
          ${state.offseasonPhase === 'free_agency' ? `
            <div class="po-action">
              <button class="btn btn-primary" data-action="runFreeAgency">Start Free Agency</button>
            </div>` : ''}
        </div>
        ${Comps.bottomNav('standings')}
      </div>`;
  },

  // ── Awards Screen ──────────────────────────────────────────────────────────

  awards(app, params = {}) {
    const { state } = app;
    const awards = state.awards;

    if (!awards) {
      return `
        <div class="screen">
          <div class="screen-header"><h1>Awards</h1></div>
          <div class="empty-state"><p>Season awards will be announced at the end of the regular season.</p></div>
          ${Comps.bottomNav('leaders')}
        </div>`;
    }

    const teamColor = (id) => {
      const m = TEAMS_META.find(t => t.id === id);
      return m ? m.primary : '#888';
    };

    const awardCard = (award, title, icon) => {
      if (!award) return `<div class="award-card"><div class="award-title">${icon} ${title}</div><div class="award-winner empty">Not yet announced</div></div>`;
      return `
        <div class="award-card" data-action="viewPlayer" data-player-id="${award.playerId}" style="cursor:pointer">
          <div class="award-title">${icon} ${title}</div>
          <div class="award-winner" style="color:${teamColor(award.teamId)}">${award.name}</div>
          <div class="award-team">${award.teamId} · ${award.stat}</div>
        </div>`;
    };

    const allStarBlock = state.allStarResult ? `
      <div class="award-section">
        <div class="section-label">All-Star Game</div>
        <div class="allstar-result">
          <span class="as-winner">${state.allStarResult.winner} wins</span>
          <span class="as-score">${state.allStarResult.alScore}–${state.allStarResult.nlScore}</span>
          <span class="as-mvp">MVP: ${state.allStarResult.mvp} (${state.allStarResult.mvpTeam})</span>
        </div>
      </div>` : '';

    return `
      <div class="screen awards-screen">
        <div class="screen-header">
          <h1>Season Awards</h1>
          <p>${state.season.year || 2026}</p>
        </div>
        <div class="awards-content">
          ${allStarBlock}
          <div class="award-section">
            <div class="section-label">American League</div>
            ${awardCard(awards.AL?.mvp,     'MVP',         '🏆')}
            ${awardCard(awards.AL?.cyYoung, 'Cy Young',    '⚾')}
            ${awardCard(awards.AL?.roy,     'Rookie of the Year', '⭐')}
          </div>
          <div class="award-section">
            <div class="section-label">National League</div>
            ${awardCard(awards.NL?.mvp,     'MVP',         '🏆')}
            ${awardCard(awards.NL?.cyYoung, 'Cy Young',    '⚾')}
            ${awardCard(awards.NL?.roy,     'Rookie of the Year', '⭐')}
          </div>
        </div>
        ${Comps.bottomNav('leaders')}
      </div>`;
  },

  // ── Offseason Screen ───────────────────────────────────────────────────────

  offseason(app, params = {}) {
    const { state } = app;
    const phase = params.phase || state.offseasonPhase;

    const faList = (state.faNews || []).slice(0, 15);
    const draftList = (state.draftNews || []).slice(0, 30);

    const faBlock = faList.length > 0 ? `
      <div class="os-section">
        <div class="section-label">Free Agency Signings</div>
        ${faList.map(n => `<div class="os-news-item">${n}</div>`).join('')}
      </div>` : '';

    const draftBlock = draftList.length > 0 ? `
      <div class="os-section">
        <div class="section-label">Draft Results (Round 1 + Your Picks)</div>
        ${draftList.map(n => `<div class="os-news-item">${n}</div>`).join('')}
      </div>` : '';

    const actionBlock = (() => {
      if (phase === 'free_agency') {
        return `<div class="os-action"><p>Run free agency to see veteran players change teams based on budget and team needs.</p>
          <button class="btn btn-primary" data-action="runFreeAgency">Run Free Agency</button></div>`;
      } else if (phase === 'draft') {
        return `<div class="os-action">${faBlock}<p>Time for the MLB Draft! 5 rounds, 30 teams. Worst records pick first.</p>
          <button class="btn btn-primary" data-action="runDraft">Run Draft</button></div>`;
      } else if (phase === 'complete') {
        return `<div class="os-action">${faBlock}${draftBlock}
          <button class="btn btn-primary" data-action="startNewSeason">Start ${(state.season.year || 2026) + 1} Season</button></div>`;
      }
      return '';
    })();

    return `
      <div class="screen offseason-screen">
        <div class="screen-header">
          <h1>Offseason</h1>
          <p>${state.season.year || 2026} Offseason</p>
        </div>
        <div class="os-content">
          ${actionBlock || '<div class="empty-state">Offseason not yet started. Complete the playoffs first.</div>'}
        </div>
        ${Comps.bottomNav('teamHub')}
      </div>`;
  },

  // ── Batting Lineup Management ──────────────────────────────────────────────

  lineup(app, params = {}) {
    const { state } = app;
    const tm = app.getTeamMeta(state.userTeamId);
    const lineup = app.getLineup(state.userTeamId);
    const injuries = state.injuries || {};
    const seasonStats = state.seasonStats;
    const selected = App.lineupSelect;

    const rows = lineup.map((pid, i) => {
      const p = App.playerMap[pid];
      if (!p) return '';
      const inj = injuries[pid];
      const batSt = seasonStats.batting[pid];
      let statStr = batSt && batSt.ab > 0
        ? `${calcAVG(batSt)} · ${batSt.hr}HR · ${batSt.rbi}RBI`
        : `OVR ${p.overall}`;
      const isSelected = selected !== null && selected !== undefined && selected === i;

      return `
        <button class="lineup-slot ${isSelected ? 'selected' : ''} ${inj ? 'on-il' : ''}"
                data-action="lineupTap" data-slot="${i}">
          <span class="ls-order">${i + 1}</span>
          <span class="ls-pos">${p.position}</span>
          <span class="ls-name">${p.name}${inj ? ' 🏥' : ''}</span>
          <span class="ls-stat">${statStr}</span>
        </button>`;
    }).join('');

    const instructions = (selected !== null && selected !== undefined)
      ? `Tap another player to swap with #${selected + 1} · <strong>Tap same player to cancel</strong>`
      : 'Tap a player to select · Tap another to swap positions';

    return `
      <div class="screen lineup-screen">
        <div class="screen-header" style="--team-primary:${tm.primary}">
          <h1>${tm.name} Lineup</h1>
          <div class="filter-tabs">
            <button class="filter-tab" onclick="App.go('roster')">‹ Roster</button>
            <button class="filter-tab active">Lineup</button>
            <button class="filter-tab" onclick="App.go('rotation')">Rotation</button>
          </div>
        </div>
        <div class="lineup-instructions">${instructions}</div>
        <div class="lineup-list">${rows || '<div class="empty-state">No position players found</div>'}</div>
        ${Comps.bottomNav('lineup')}
      </div>`;
  },

  // ── Pitching Rotation & Bullpen Management ─────────────────────────────────

  rotation(app, params = {}) {
    const { state } = app;
    const tm = app.getTeamMeta(state.userTeamId);
    const rotation = app.getRotation(state.userTeamId);
    const bullpen = app.getTeamPlayers(state.userTeamId).filter(p => p.position === 'RP');
    const roles = state.bullpenRoles?.[state.userTeamId] || {};
    const injuries = state.injuries || {};
    const seasonStats = state.seasonStats;
    const selected = App.rotSelect;

    const rotRows = rotation.map((pid, i) => {
      const p = App.playerMap[pid];
      if (!p) return '';
      const inj = injuries[pid];
      const pitSt = seasonStats.pitching[pid];
      const statStr = pitSt && pitSt.ip > 0
        ? `${pitSt.w}-${pitSt.l} ERA ${calcERA(pitSt)}`
        : `OVR ${p.overall}`;
      const isSelected = selected !== null && selected !== undefined && selected === i;

      return `
        <button class="lineup-slot ${isSelected ? 'selected' : ''} ${inj ? 'on-il' : ''}"
                data-action="rotationTap" data-slot="${i}">
          <span class="ls-order">${i + 1}</span>
          <span class="ls-pos">SP</span>
          <span class="ls-name">${p.name}${inj ? ' 🏥' : ''}</span>
          <span class="ls-stat">${statStr}</span>
        </button>`;
    }).join('');

    const bullpenRows = bullpen.map(p => {
      const inj = injuries[p.id];
      const role = roles[p.id] || 'middle';
      const pitSt = seasonStats.pitching[p.id];
      const statStr = pitSt && pitSt.ip > 0 ? `${pitSt.sv || 0}SV ${calcERA(pitSt)} ERA` : `OVR ${p.overall}`;
      return `
        <div class="bullpen-role-row ${inj ? 'on-il' : ''}">
          <div class="brr-name">${p.name}${inj ? ' 🏥' : ''}<br><small style="color:var(--text3)">${statStr}</small></div>
          <button class="role-btn ${role==='closer'?'active-closer':''}"
                  data-action="setBullpenRole" data-player-id="${p.id}" data-role="closer">CL</button>
          <button class="role-btn ${role==='setup'?'active-setup':''}"
                  data-action="setBullpenRole" data-player-id="${p.id}" data-role="setup">SU</button>
          <button class="role-btn ${role==='middle'?'active-middle':''}"
                  data-action="setBullpenRole" data-player-id="${p.id}" data-role="middle">MR</button>
        </div>`;
    }).join('');

    const instructions = (selected !== null && selected !== undefined)
      ? `Tap another starter to swap with #${selected + 1}`
      : 'Tap a starter to reorder the rotation';

    return `
      <div class="screen rotation-screen">
        <div class="screen-header" style="--team-primary:${tm.primary}">
          <h1>${tm.name} Pitching</h1>
          <div class="filter-tabs">
            <button class="filter-tab" onclick="App.go('roster')">‹ Roster</button>
            <button class="filter-tab" onclick="App.go('lineup')">Lineup</button>
            <button class="filter-tab active">Rotation</button>
          </div>
        </div>

        <div class="rotation-section" style="margin-top:12px">
          <div class="rotation-label">Starting Rotation</div>
          <div class="lineup-instructions">${instructions}</div>
          <div class="lineup-list" style="padding:0">${rotRows || '<div class="empty-state">No starting pitchers found</div>'}</div>
        </div>

        ${bullpen.length > 0 ? `
          <div class="rotation-section">
            <div class="rotation-label">Bullpen Roles</div>
            ${bullpenRows}
            <div style="font-size:11px;color:var(--text3);margin-top:6px;padding:0 2px">CL = Closer · SU = Setup · MR = Middle Relief</div>
          </div>` : ''}

        ${Comps.bottomNav('rotation')}
      </div>`;
  },

  // ── Trade Center ───────────────────────────────────────────────────────────

  tradeCenter(app, params = {}) {
    const { state } = app;
    if (!state) return `<div class="screen"><div class="empty-state">Start a game first.</div>${Comps.bottomNav('tradeCenter')}</div>`;

    const draft = App.tradeDraft || { opponentId: null, myPlayers: [], theirPlayers: [] };
    const tradeHistory = state.tradeHistory || [];

    // ── Result card (after proposing)
    if (params.result) {
      const r = params.result;
      return `
        <div class="screen trade-center-screen">
          <div class="screen-header"><h1>Trade Center</h1></div>
          <div class="trade-result-card ${r.accepted ? 'accepted' : 'rejected'}">
            <div class="tr-icon">${r.accepted ? '✅' : '❌'}</div>
            <div class="tr-title">${r.accepted ? 'Trade Accepted!' : 'Trade Rejected'}</div>
            <div class="tr-detail">${r.message}</div>
          </div>
          <div style="padding:0 12px;display:flex;flex-direction:column;gap:8px;margin-top:4px">
            <button class="btn btn-primary" data-action="clearTrade">Make Another Trade</button>
            <button class="btn btn-secondary" data-action="nav" data-screen="roster">View Roster</button>
          </div>
          ${Comps.bottomNav('tradeCenter')}
        </div>`;
    }

    // ── Step 1: pick opponent
    if (!draft.opponentId) {
      const aiTeams = TEAMS_META.filter(t => t.id !== state.userTeamId);
      const teamCards = aiTeams.map(t => {
        const rec = app.getTeamRecord(t.id);
        return `
          <button class="trade-team-card" data-action="selectTradeOpponent" data-team-id="${t.id}"
                  style="border-left:3px solid ${t.primary}">
            ${logoImg(t.id, 'team-logo-sm')}
            <div class="ttc-abbr" style="color:${t.primary}">${t.id}</div>
            <div class="ttc-record">${rec.wins}–${rec.losses}</div>
          </button>`;
      }).join('');

      const historyHTML = tradeHistory.length > 0 ? `
        <div class="trade-history-section">
          <div class="section-label" style="padding:0 0 4px">Trade History</div>
          ${tradeHistory.slice(-5).reverse().map(tr => `
            <div class="trade-history-item">🔄 ${tr.summary}</div>`).join('')}
        </div>` : '';

      // AI-initiated trade offers
      const pendingOffers = state.pendingTradeOffers || [];
      const offersHTML = pendingOffers.length > 0 ? `
        <div class="trade-history-section">
          <div class="section-label" style="padding:0 0 6px;color:var(--gold)">📨 Incoming Trade Offers (${pendingOffers.length})</div>
          ${pendingOffers.map(offer => {
            const aiMeta = app.getTeamMeta(offer.fromTeamId);
            const theyGive = offer.theyOffer.map(id => {
              const p = App.playerMap[id];
              return p ? `${p.name} (${p.position}, OVR ${p.overall})` : id;
            }).join(', ');
            const theyWant = offer.theyWant.map(id => {
              const p = App.playerMap[id];
              return p ? `${p.name} (${p.position}, OVR ${p.overall})` : id;
            }).join(', ');
            return `
              <div class="trade-history-item" style="border:1px solid rgba(244,200,66,0.3);background:rgba(244,200,66,0.05);border-radius:8px;padding:12px;margin-bottom:8px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                  ${logoImg(offer.fromTeamId, 'team-logo-sm')}
                  <strong style="color:${aiMeta.primary}">${aiMeta.name}</strong> proposes:
                </div>
                <div style="font-size:12px;line-height:1.6">
                  They offer: <strong>${theyGive}</strong><br>
                  They want: <strong>${theyWant}</strong>
                </div>
                <div style="display:flex;gap:8px;margin-top:10px">
                  <button class="btn btn-primary btn-sm" style="flex:1" data-action="acceptTradeOffer" data-offer-id="${offer.id}">✓ Accept</button>
                  <button class="btn btn-danger btn-sm" style="flex:1" data-action="rejectTradeOffer" data-offer-id="${offer.id}">✗ Decline</button>
                </div>
              </div>`;
          }).join('')}
        </div>` : '';

      return `
        <div class="screen trade-center-screen">
          <div class="screen-header">
            <h1>Trade Center</h1>
            <p style="font-size:13px;color:var(--text2);margin-top:4px">Select a team to propose a trade</p>
          </div>
          ${offersHTML}
          ${historyHTML}
          <div class="trade-team-grid">${teamCards}</div>
          ${Comps.bottomNav('tradeCenter')}
        </div>`;
    }

    // ── Step 2: build trade
    const oppMeta = app.getTeamMeta(draft.opponentId);
    const mySelected  = new Set(draft.myPlayers);
    const oppSelected = new Set(draft.theirPlayers);

    const myRoster = app.getTeamPlayers(state.userTeamId)
      .filter(p => !['SP','RP'].includes(p.position) || p.position === 'SP')
      .sort((a,b) => b.overall - a.overall)
      .slice(0, 15);

    const oppRoster = app.getTeamPlayers(draft.opponentId)
      .sort((a,b) => b.overall - a.overall)
      .slice(0, 15);

    const playerRow = (p, action, selected) => `
      <button class="trade-player-row ${selected ? 'selected' : ''}"
              data-action="${action}" data-player-id="${p.id}">
        <div class="tpr-check">${selected ? '✓' : ''}</div>
        <span class="tpr-pos">${p.position}</span>
        <span class="tpr-name">${p.name}</span>
        <span class="tpr-ovr">OVR ${p.overall}</span>
      </button>`;

    const myOVR   = draft.myPlayers.reduce((s, id) => s + (App.playerMap[id]?.overall || 0), 0);
    const oppOVR  = draft.theirPlayers.reduce((s, id) => s + (App.playerMap[id]?.overall || 0), 0);
    const diff    = myOVR - oppOVR;
    const fairMsg = myOVR === 0 && oppOVR === 0 ? 'Select players on both sides'
                  : diff >= 0 ? '✓ Fair or better for both sides'
                  : Math.abs(diff) <= 8 ? '~ Close — AI may accept'
                  : '✗ You need to offer more value';
    const fairCls = diff >= 0 ? 'fair' : Math.abs(diff) <= 8 ? 'neutral' : 'unfair';

    return `
      <div class="screen trade-center-screen">
        <div class="screen-header">
          <h1>Trade Proposal</h1>
          <button class="btn btn-secondary btn-sm" data-action="clearTrade" style="margin-top:8px;width:auto;display:inline-block">← Change Team</button>
        </div>

        <div class="trade-builder">
          <div class="trade-side-header">Your Offer <span style="color:var(--text3)">(tap to select)</span></div>
          ${myRoster.map(p => playerRow(p, 'toggleMyTradePick', mySelected.has(p.id))).join('')}

          <div class="trade-side-header" style="margin-top:8px">Requesting from <span style="color:${oppMeta.primary}">${oppMeta.name}</span></div>
          ${oppRoster.map(p => playerRow(p, 'toggleTheirTradePick', oppSelected.has(p.id))).join('')}

          <div class="trade-fairness-bar">
            <div class="tfb-label">Trade Value</div>
            <div class="tfb-values">
              <span class="tfb-you">You: ${myOVR}</span>
              <span class="tfb-vs">OVR</span>
              <span class="tfb-them">Them: ${oppOVR}</span>
            </div>
            <div class="tfb-status ${fairCls}">${fairMsg}</div>
          </div>

          ${mySelected.size > 0 && oppSelected.size > 0
            ? `<button class="btn btn-primary" data-action="proposeTrade" style="margin-bottom:12px">Propose Trade</button>`
            : `<button class="btn btn-secondary" disabled style="margin-bottom:12px;opacity:0.4">Select players on both sides</button>`}
        </div>

        ${Comps.bottomNav('tradeCenter')}
      </div>`;
  },

  // ── Front Office ───────────────────────────────────────────────────────────

  frontOffice(app, params = {}) {
    const { state } = app;
    if (!state) return `<div class="screen"><div class="empty-state">Start a game first.</div>${Comps.bottomNav('frontOffice')}</div>`;

    const tm       = app.getTeamMeta(state.userTeamId);
    const rec      = app.getUserRecord();
    const payroll  = app.getTeamPayroll(state.userTeamId);
    const budget   = tm.budget || 150000;
    const roster   = app.getTeamPlayers(state.userTeamId);
    const phase    = state.season.phase;
    const offPhase = state.offseasonPhase;

    const payrollPct = Math.min(100, Math.round(payroll / (budget * 1.1) * 100));
    const overBudget = payroll > budget * 1.1;

    const payrollBar = `
      <div class="payroll-bar-wrap" style="margin:0">
        <span class="payroll-label">Payroll: $${(payroll/1000).toFixed(1)}M / $${(budget/1000).toFixed(0)}M ${overBudget ? '⚠️ Over budget' : ''}</span>
        <div class="payroll-bar-bg" style="height:8px;border-radius:4px">
          <div class="payroll-bar ${overBudget ? 'over-budget' : ''}" style="width:${payrollPct}%"></div>
        </div>
      </div>`;

    const statsGrid = `
      <div class="fo-stats-grid">
        <div class="fo-stat-card">
          <div class="fo-stat-val">${rec.wins}–${rec.losses}</div>
          <div class="fo-stat-label">Record</div>
        </div>
        <div class="fo-stat-card">
          <div class="fo-stat-val">${roster.length}</div>
          <div class="fo-stat-label">Roster Size</div>
        </div>
        <div class="fo-stat-card">
          <div class="fo-stat-val">$${(payroll/1000).toFixed(1)}M</div>
          <div class="fo-stat-label">Payroll</div>
        </div>
        <div class="fo-stat-card">
          <div class="fo-stat-val">${app.getTeamInjuries(state.userTeamId).length}</div>
          <div class="fo-stat-label">On IL</div>
        </div>
      </div>`;

    // Roster management links (always shown during regular season or earlier)
    const rosterMgmt = `
      <div class="fo-section">
        <div class="section-label">Roster Management</div>
        <button class="fo-nav-btn" onclick="App.go('lineup')">
          <span>📋 Batting Lineup</span><span class="fo-btn-arrow">›</span>
        </button>
        <button class="fo-nav-btn" onclick="App.go('rotation')">
          <span>⚾ Pitching Rotation & Bullpen</span><span class="fo-btn-arrow">›</span>
        </button>
        ${(state.waiverPool?.length > 0) ? `
        <button class="fo-nav-btn" onclick="App.go('waiverWire')">
          <span>🛒 Waiver Wire</span><span class="fo-btn-arrow">›</span>
        </button>` : ''}
      </div>
      <div class="fo-section">
        <div class="section-label">Franchise History</div>
        <button class="fo-nav-btn" onclick="App.go('trophyCase')">
          <span>🏅 Trophy Case</span>
          <span style="display:flex;align-items:center;gap:4px">
            <span style="font-size:12px;color:var(--gold)">${Object.values(state.achievements||{}).filter(a=>a.unlocked).length} Unlocked</span>
            <span class="fo-btn-arrow">›</span>
          </span>
        </button>
        <button class="fo-nav-btn" onclick="App.go('hofTracker')">
          <span>🏛️ Hall of Fame</span>
          <span style="display:flex;align-items:center;gap:4px">
            <span style="font-size:12px;color:var(--gold)">${(state.hofMembers||[]).length} Inducted</span>
            <span class="fo-btn-arrow">›</span>
          </span>
        </button>
        ${state.seasonRecaps?.length > 0 ? `
        <button class="fo-nav-btn" data-action="viewSeasonRecap">
          <span>📊 Year in Review</span><span class="fo-btn-arrow">›</span>
        </button>` : ''}
      </div>`;

    // Offseason actions
    let offseasonBlock = '';
    if (phase === 'offseason' || phase === 'playoffs') {
      const faCount = (state.freeAgentPool || []).filter(f => !f.signed).length;
      offseasonBlock = `
        <div class="fo-section">
          <div class="section-label">Offseason</div>
          ${state.playoffs ? `
            <button class="fo-nav-btn" data-action="viewPlayoffs">
              <span>🏆 View Playoffs Bracket</span><span class="fo-btn-arrow">›</span>
            </button>` : ''}
          ${state.awards ? `
            <button class="fo-nav-btn" data-action="viewAwards">
              <span>🥇 Season Awards</span><span class="fo-btn-arrow">›</span>
            </button>` : ''}
          ${offPhase === 'free_agency' ? `
            <div class="fo-action-card">
              <h3>Free Agency${faCount > 0 ? ` (${faCount} available)` : ''}</h3>
              <p>Browse and sign available free agents before AI teams claim them.</p>
              <button class="btn btn-primary" data-action="showFreeAgency">Browse Free Agents</button>
              <button class="btn btn-secondary" style="margin-top:8px" data-action="runFreeAgency">Skip — Run AI Free Agency</button>
            </div>` : ''}
          ${offPhase === 'draft' ? `
            <div class="fo-action-card">
              <h3>MLB Draft</h3>
              <p>5 rounds, 30 teams. Worst records pick first. Your picks shown in detail.</p>
              <button class="btn btn-primary" data-action="runDraft">Run MLB Draft</button>
            </div>` : ''}
          ${offPhase === 'complete' ? `
            <div class="fo-action-card">
              <h3>New Season Ready</h3>
              <p>Free agency and draft are complete. Ready to start the ${(state.season.year || 2026) + 1} season!</p>
              <button class="btn btn-primary" data-action="startNewSeason">Start ${(state.season.year || 2026) + 1} Season</button>
            </div>` : ''}
          ${offPhase === 'free_agency' ? '' : (state.faNews?.length > 0 ? `
            <div class="section-label" style="margin-top:12px">Recent FA Signings</div>
            ${state.faNews.slice(0, 5).map(n => `<div class="trade-history-item">${n}</div>`).join('')}` : '')}
        </div>`;
    }

    const msg = params.message
      ? `<div class="sim-message win" style="margin:8px 12px 0">${params.message}</div>` : '';

    return `
      <div class="screen front-office-screen">
        <div class="screen-header" style="--team-primary:${tm.primary}">
          <h1>Front Office</h1>
          <p style="font-size:13px;color:var(--text2);margin-top:2px">${tm.full}</p>
        </div>
        ${msg}
        ${statsGrid}
        <div style="padding:0 12px 8px">${payrollBar}</div>
        ${rosterMgmt}
        ${offseasonBlock}
        ${Comps.bottomNav('frontOffice')}
      </div>`;
  },

  // ── Free Agency Browser ────────────────────────────────────────────────────

  freeAgency(app, params = {}) {
    const { state } = app;
    if (!state) return `<div class="screen"><div class="empty-state">Start a game first.</div>${Comps.bottomNav('frontOffice')}</div>`;

    // Generate pool if not yet done
    if (!state.freeAgentPool || state.freeAgentPool.length === 0) {
      App._generateFAPool();
    }

    const pool = state.freeAgentPool || [];
    const posFilter = params.posFilter || 'all';

    const filtered = posFilter === 'sp'  ? pool.filter(f => f.position === 'SP')
                   : posFilter === 'rp'  ? pool.filter(f => f.position === 'RP')
                   : posFilter === 'pos' ? pool.filter(f => !['SP','RP'].includes(f.position))
                   : pool;

    const signedCount = pool.filter(f => f.signed).length;

    const cards = filtered.map(fa => {
      const signed = fa.signed;
      const ovrCls = fa.overall >= 85 ? 'ovr-elite' : fa.overall >= 75 ? 'ovr-star' : fa.overall >= 65 ? 'ovr-good' : 'ovr-avg';
      return `
        <div class="fa-player-card ${signed ? 'signed' : ''}">
          <div class="fa-pc-left">
            <span class="fa-pc-pos">${fa.position}</span>
            <div class="fa-pc-name">${fa.name} <span class="ovr-badge ${ovrCls}" style="font-size:11px">${fa.overall}</span></div>
            <div class="fa-pc-meta">Age ${fa.age} · ${fa.bats}/${fa.throws} · ${fa.height}</div>
          </div>
          <div class="fa-pc-right">
            <div class="fa-pc-salary">$${(fa.salary/1000).toFixed(1)}M</div>
            <div class="fa-pc-salary-label">/ year</div>
            ${signed
              ? `<div class="fa-signed-label">Signed ✓</div>`
              : `<button class="fa-sign-btn" data-action="signFreeAgent" data-player-id="${fa.playerId}">Sign</button>`}
          </div>
        </div>`;
    }).join('');

    const msg = params.message
      ? `<div class="fa-signed-msg">✍️ ${params.message}</div>` : '';

    return `
      <div class="screen free-agency-screen">
        <div class="screen-header">
          <h1>Free Agent Market</h1>
          <div class="filter-tabs" style="margin-top:10px">
            <button class="filter-tab ${posFilter==='all'?'active':''}"  onclick="App.go('freeAgency',{posFilter:'all'})">All</button>
            <button class="filter-tab ${posFilter==='sp'?'active':''}"   onclick="App.go('freeAgency',{posFilter:'sp'})">SP</button>
            <button class="filter-tab ${posFilter==='rp'?'active':''}"   onclick="App.go('freeAgency',{posFilter:'rp'})">RP</button>
            <button class="filter-tab ${posFilter==='pos'?'active':''}"  onclick="App.go('freeAgency',{posFilter:'pos'})">Pos</button>
          </div>
        </div>
        ${msg}
        <div style="padding:8px 12px 0;font-size:12px;color:var(--text3)">${pool.length - signedCount} available · ${signedCount} signed</div>
        <div class="fa-pool-list" style="margin-top:8px">
          ${cards || `<div class="fa-empty">No free agents available at this position.</div>`}
        </div>
        <div style="padding:12px;margin-top:4px">
          <button class="btn btn-secondary" data-action="runFreeAgency">Run AI Free Agency →</button>
        </div>
        ${Comps.bottomNav('frontOffice')}
      </div>`;
  },

  // ── Waiver Wire ────────────────────────────────────────────────────────────

  waiverWire(app, params = {}) {
    const { state } = app;
    const pool = (state.waiverPool || [])
      .map(id => App.playerMap[id])
      .filter(Boolean)
      .filter(p => !p.isWaived); // exclude already claimed

    const maxRoster = state.rosterExpanded ? 40 : 26;
    const currentRoster = app.getTeamPlayers(state.userTeamId).length;
    const rosterFull = currentRoster >= maxRoster;
    const posFilter = params.posFilter || 'all';

    const filtered = posFilter === 'sp'  ? pool.filter(p => p.position === 'SP')
                   : posFilter === 'rp'  ? pool.filter(p => p.position === 'RP')
                   : posFilter === 'pos' ? pool.filter(p => !['SP','RP'].includes(p.position))
                   : pool;

    const expBadge = state.rosterExpanded
      ? `<span class="expansion-badge">September Expanded (40-man)</span>` : '';

    const msg = params.message
      ? `<div class="sim-message win" style="margin:8px 12px 0">${params.message}</div>` : '';

    const rows = filtered.map(p => {
      const batSt = state.seasonStats.batting[p.id];
      const pitSt = state.seasonStats.pitching[p.id];
      const isPit = ['SP','RP','TWP'].includes(p.position);
      let statStr = '';
      if (isPit && pitSt?.ip > 0) statStr = `${pitSt.w}-${pitSt.l} ${calcERA(pitSt)} ERA`;
      else if (batSt?.ab > 0) statStr = `${calcAVG(batSt)} ${batSt.hr}HR`;
      else statStr = `Age ${p.age}`;

      return `
        <div class="waiver-row">
          <span class="waiver-pos">${p.position}</span>
          <div class="waiver-info">
            <div class="waiver-name">${p.name}</div>
            <div class="waiver-meta">${statStr} · ${p.teamId}</div>
          </div>
          <span class="waiver-ovr">OVR ${p.overall}</span>
          ${rosterFull
            ? `<button class="waiver-claim-btn" disabled style="opacity:0.4">Full</button>`
            : `<button class="waiver-claim-btn" data-action="claimWaiver" data-player-id="${p.id}">Claim</button>`
          }
        </div>`;
    }).join('');

    return `
      <div class="screen waiver-screen">
        <div class="screen-header">
          <h1>Waiver Wire ${expBadge}</h1>
          <div class="filter-tabs" style="margin-top:8px">
            <button class="filter-tab ${posFilter==='all'?'active':''}"  onclick="App.go('waiverWire',{posFilter:'all'})">All</button>
            <button class="filter-tab ${posFilter==='sp'?'active':''}"   onclick="App.go('waiverWire',{posFilter:'sp'})">SP</button>
            <button class="filter-tab ${posFilter==='rp'?'active':''}"   onclick="App.go('waiverWire',{posFilter:'rp'})">RP</button>
            <button class="filter-tab ${posFilter==='pos'?'active':''}"  onclick="App.go('waiverWire',{posFilter:'pos'})">Pos</button>
          </div>
        </div>
        ${msg}
        ${rosterFull ? `<div class="roster-full-note">⚠️ Roster full (${currentRoster}/${maxRoster}). Release a player first.</div>` : ''}
        <div style="padding:6px 14px;font-size:12px;color:var(--text3)">${currentRoster}/${maxRoster} roster spots used</div>
        <div class="waiver-list">
          ${rows || '<div class="empty-state" style="padding:40px 20px;text-align:center">No waiver wire players available yet.<br><small>They appear after games are simulated.</small></div>'}
        </div>
        ${Comps.bottomNav('frontOffice')}
      </div>`;
  },

  // ── Trophy Case ────────────────────────────────────────────────────────────

  trophyCase(app, params = {}) {
    const { state } = app;
    const achievements = state.achievements || {};
    const unlocked = ACHIEVEMENTS.filter(a => achievements[a.id]?.unlocked);
    const locked   = ACHIEVEMENTS.filter(a => !achievements[a.id]?.unlocked);
    const total    = ACHIEVEMENTS.length;

    const cards = ACHIEVEMENTS.map(ach => {
      const info = achievements[ach.id];
      const isUnlocked = info?.unlocked;
      return `
        <div class="trophy-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="trophy-icon">${ach.icon}</div>
          <div class="trophy-name">${ach.name}</div>
          <div class="trophy-desc">${ach.desc}</div>
          ${isUnlocked ? `<div class="trophy-season">${info.season} Season</div>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="screen trophy-screen">
        <div class="screen-header">
          <h1>Trophy Case</h1>
          <p style="font-size:13px;color:var(--text2);margin-top:2px">${unlocked.length} / ${total} Unlocked</p>
        </div>
        <div class="trophy-grid">
          ${cards}
        </div>
        ${Comps.bottomNav('stats')}
      </div>`;
  },

  // ── Hall of Fame ───────────────────────────────────────────────────────────

  hofTracker(app, params = {}) {
    const { state } = app;
    const members = state.hofMembers || [];

    const rows = members.map(m => {
      const tm = app.getTeamMeta(m.previousTeam);
      const isUserAlum = m.previousTeam === state.userTeamId;
      return `
        <div class="hof-member ${isUserAlum ? 'user-team' : ''}" style="${isUserAlum ? 'background:rgba(79,142,247,0.07);' : ''}">
          <div class="hof-icon">🏛️</div>
          <div class="hof-info">
            <div class="hof-name">${m.name} ${isUserAlum ? '⭐' : ''}</div>
            <div class="hof-meta">${m.position} · ${m.reason}</div>
            <div class="hof-team" style="color:${tm.primary}">Previously: ${tm.full}</div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="screen hof-screen">
        <div class="screen-header">
          <h1>Hall of Fame</h1>
          <p style="font-size:13px;color:var(--text2);margin-top:2px">${members.length} Inductee${members.length !== 1 ? 's' : ''}</p>
        </div>
        ${rows.length > 0
          ? `<div>${rows}</div>`
          : `<div class="hof-empty">
              <div style="font-size:40px;margin-bottom:12px">🏛️</div>
              <p>No inductees yet.</p>
              <p style="font-size:12px;margin-top:6px">Players with exceptional careers are inducted when they retire (age 37+).</p>
            </div>`
        }
        ${Comps.bottomNav('stats')}
      </div>`;
  },

  // ── Season Recap ───────────────────────────────────────────────────────────

  seasonRecap(app, params = {}) {
    const { state } = app;
    const recap = (state.seasonRecaps || []).slice(-1)[0];
    const tm = app.getTeamMeta(state.userTeamId);

    if (!recap) {
      return `
        <div class="screen recap-screen">
          <div class="screen-header"><h1>Season Recap</h1></div>
          <div class="empty-state">Complete a full season to see the recap.</div>
          ${Comps.bottomNav('teamHub')}
        </div>`;
    }

    const champMeta = app.getTeamMeta(recap.champion || '');
    const isUserChamp = recap.champion === state.userTeamId;

    const statCards = [
      recap.topBatter ? { label: 'Top Batter',  value: recap.topBatter.name,  sub: recap.topBatterStat } : null,
      recap.topPitcher ? { label: 'Top Pitcher', value: recap.topPitcher.name, sub: recap.topPitcherStat } : null,
      { label: 'Final Record', value: `${recap.wins}–${recap.losses}`, sub: recap.divFinish || '' },
      { label: 'Runs Scored',  value: recap.runsFor || '–', sub: `${recap.runsAgainst || '–'} allowed` },
    ].filter(Boolean);

    return `
      <div class="screen recap-screen">
        <div class="recap-hero">
          <div class="recap-year">${recap.year} Season Recap</div>
          <div class="recap-title">${tm.city} ${tm.name}</div>
          <div class="recap-record">${recap.wins}–${recap.losses}</div>
        </div>

        ${isUserChamp ? `
          <div class="recap-champ-banner">
            <div class="recap-champ-label">🏆 World Series Champions!</div>
            <div class="recap-champ-name">${tm.full}</div>
          </div>` : recap.champion ? `
          <div style="padding:12px 14px;font-size:14px;text-align:center;color:var(--text2)">
            🏆 World Series Champion: <strong style="color:${champMeta.primary}">${champMeta.full}</strong>
          </div>` : ''
        }

        <div class="recap-cards">
          ${statCards.map(c => `
            <div class="recap-card">
              <div class="recap-card-label">${c.label}</div>
              <div class="recap-card-value">${c.value}</div>
              <div class="recap-card-sub">${c.sub}</div>
            </div>`).join('')}
        </div>

        ${recap.topMoments?.length > 0 ? `
          <div class="recap-section">
            <div class="recap-section-title">Top Moments</div>
            ${recap.topMoments.map(m => `<div class="news-item">⚡ ${m}</div>`).join('')}
          </div>` : ''}

        ${recap.awards?.length > 0 ? `
          <div class="recap-section">
            <div class="recap-section-title">Awards</div>
            ${recap.awards.map(a => `<div class="news-item">🏆 ${a}</div>`).join('')}
          </div>` : ''}

        <div style="padding:0 14px 14px">
          <button class="btn btn-secondary" onclick="App.go('teamHub')">‹ Back to Franchise</button>
        </div>

        ${Comps.bottomNav('teamHub')}
      </div>`;
  },

};

window.Screens = Screens;
