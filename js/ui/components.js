/**
 * Reusable UI Components
 */
'use strict';

const Comps = {

  // Maps any screen name to the correct bottom-nav tab ID
  _tabMap: {
    teamHub:     'home',
    roster:      'roster',
    lineup:      'roster',
    rotation:    'roster',
    playerCard:  'roster',
    standings:   'season',
    schedule:    'season',
    boxScore:    'season',
    leaders:     'stats',
    awards:      'stats',
    tradeCenter: 'trades',
    frontOffice: 'office',
    freeAgency:  'office',
    offseason:   'office',
  },

  bottomNav(activeScreen) {
    const activeTab = this._tabMap[activeScreen] || 'home';

    const tabs = [
      { id: 'home',   icon: '🏠', label: 'Home',    screen: 'teamHub'     },
      { id: 'roster', icon: '👥', label: 'Roster',  screen: 'roster'      },
      { id: 'season', icon: '📅', label: 'Season',  screen: 'standings'   },
      { id: 'stats',  icon: '📊', label: 'Stats',   screen: 'leaders'     },
      { id: 'trades', icon: '🔄', label: 'Trades',  screen: 'tradeCenter' },
      { id: 'office', icon: '🏢', label: 'Office',  screen: 'frontOffice' },
    ];

    return `
      <nav class="bottom-nav">
        ${tabs.map(t => `
          <button class="nav-tab ${t.id === activeTab ? 'active' : ''}"
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

  // Injury notification popup overlay
  injuryPopup(injuries) {
    if (!injuries || injuries.length === 0) return '';
    return `
      <div class="popup-overlay" id="injuryPopup">
        <div class="popup-card popup-injury">
          <div class="popup-header">
            <span class="popup-icon">🏥</span>
            <span class="popup-title">Injury Report</span>
            <button class="popup-close" data-action="dismissPopup">✕</button>
          </div>
          <div class="popup-body">
            ${injuries.map(inj => `
              <div class="popup-item">
                <span class="il-badge il-${inj.il.toLowerCase()}">${inj.il}</span>
                <div class="popup-item-info">
                  <div class="popup-item-name">${inj.playerName}</div>
                  <div class="popup-item-detail">${inj.type} · Est. ${inj.daysRemaining} days out</div>
                </div>
              </div>`).join('')}
          </div>
          <button class="btn btn-secondary popup-action-btn" data-action="dismissPopup">Got It</button>
        </div>
      </div>`;
  },

  // Player return / activation popup
  returnPopup(playerNames) {
    if (!playerNames || playerNames.length === 0) return '';
    return `
      <div class="popup-overlay" id="injuryPopup">
        <div class="popup-card popup-return">
          <div class="popup-header">
            <span class="popup-icon">💪</span>
            <span class="popup-title">Players Activated</span>
            <button class="popup-close" data-action="dismissPopup">✕</button>
          </div>
          <div class="popup-body">
            ${playerNames.map(name => `
              <div class="popup-item">
                <span class="il-badge il-return">ACTIVE</span>
                <div class="popup-item-info">
                  <div class="popup-item-name">${name}</div>
                  <div class="popup-item-detail">Activated from injured list</div>
                </div>
              </div>`).join('')}
          </div>
          <button class="btn btn-secondary popup-action-btn" data-action="dismissPopup">Awesome!</button>
        </div>
      </div>`;
  },
};

window.Comps = Comps;
