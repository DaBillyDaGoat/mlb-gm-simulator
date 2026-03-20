/**
 * Reusable UI Components
 */
'use strict';

const Comps = {

  bottomNav(activeScreen) {
    const tabs = [
      { id: 'teamHub',   icon: '🏠', label: 'Home',      screen: 'teamHub'  },
      { id: 'roster',    icon: '👥', label: 'Roster',    screen: 'roster'   },
      { id: 'schedule',  icon: '📅', label: 'Games',     screen: 'schedule' },
      { id: 'standings', icon: '📊', label: 'Standings', screen: 'standings'},
      { id: 'leaders',   icon: '🏆', label: 'Leaders',   screen: 'leaders'  },
    ];

    return `
      <nav class="bottom-nav">
        ${tabs.map(t => `
          <button class="nav-tab ${t.id === activeScreen ? 'active' : ''}"
                  data-action="nav" data-screen="${t.screen}">
            <span class="nav-icon">${t.icon}</span>
            <span class="nav-label">${t.label}</span>
          </button>`).join('')}
      </nav>`;
  },

  leaderTable(leaders, statKey, statFn) {
    if (!leaders || leaders.length === 0) {
      return `<div class="empty-state">No qualified players yet</div>`;
    }

    return `
      <div class="leader-table">
        ${leaders.map((l, i) => {
          const tm = App.getTeamMeta(l.teamId);
          return `
            <button class="leader-row" data-action="viewPlayer" data-player-id="${l.pid}">
              <span class="lr-rank">${i + 1}</span>
              <span class="lr-dot" style="background:${tm.primary}"></span>
              <span class="lr-name">${l.name}</span>
              <span class="lr-team">${l.teamId}</span>
              <span class="lr-stat">${statFn(l)}</span>
            </button>`;
        }).join('')}
      </div>`;
  },

  teamBadge(teamId, size = 'sm') {
    const tm = App.getTeamMeta(teamId);
    return `<span class="team-badge team-badge-${size}" style="--tc:${tm.primary}">${tm.id}</span>`;
  },

  ovr(val) {
    const cls = val >= 90 ? 'ovr-elite' : val >= 80 ? 'ovr-star' : val >= 70 ? 'ovr-good' : 'ovr-avg';
    return `<span class="ovr-badge ${cls}">${val}</span>`;
  },
};

window.Comps = Comps;
