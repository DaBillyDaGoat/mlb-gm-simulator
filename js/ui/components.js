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

  // ── Manager Decision Card ────────────────────────────────────

  decisionCard(decision) {
    if (!decision) return '';
    return `
      <div class="decision-overlay" id="decisionOverlay">
        <div class="decision-card">
          <div class="decision-badge">⚡ Manager Decision</div>
          <div class="decision-situation">${decision.situation}</div>
          <div class="decision-prompt">${decision.prompt}</div>
          <div class="decision-options">
            ${decision.options.map(opt => `
              <button class="decision-option"
                      data-action="makeDecision"
                      data-key="${opt.key}">
                <span class="decision-option-label">${opt.label}</span>
                <span class="decision-option-desc">${opt.desc}</span>
              </button>`).join('')}
          </div>
          <button class="decision-skip" data-action="skipDecision">Skip ›</button>
        </div>
      </div>`;
  },

  // ── Achievement Unlock Popup ─────────────────────────────────

  achievementPopup(achievements) {
    if (!achievements || achievements.length === 0) return '';
    const ach = achievements[0]; // show first one
    return `
      <div class="popup-overlay" id="achievePopup">
        <div class="popup-card achievement-unlock" style="background:linear-gradient(135deg,#2a1f00,#1a1600);border:1.5px solid var(--gold)">
          <div class="popup-header">
            <span class="popup-icon">🏅</span>
            <span class="popup-title" style="color:var(--gold)">Achievement Unlocked!</span>
            <button class="popup-close" data-action="dismissAchievement">✕</button>
          </div>
          <div class="popup-body">
            <div class="achievement-popup">
              <div class="achievement-popup-icon">${ach.icon}</div>
              <div class="achievement-popup-body">
                <div class="achievement-popup-label">New Achievement</div>
                <div class="achievement-popup-name">${ach.name}</div>
                <div class="achievement-popup-desc">${ach.desc}</div>
              </div>
            </div>
            ${achievements.length > 1 ? `<div style="font-size:12px;color:var(--text2);margin-top:8px;text-align:center">+${achievements.length - 1} more unlocked</div>` : ''}
          </div>
          <button class="btn popup-action-btn" style="background:var(--gold);color:#000;font-weight:800" data-action="dismissAchievement">Awesome! 🎉</button>
        </div>
      </div>`;
  },

  // ── Milestone Toast ──────────────────────────────────────────

  milestoneToast(msg) {
    return `<div class="milestone-popup" id="milestoneToast">🌟 ${msg}</div>`;
  },

  // ── HOF Induction Popup ──────────────────────────────────────

  hofPopup(members) {
    if (!members || members.length === 0) return '';
    return `
      <div class="popup-overlay" id="hofPopup">
        <div class="popup-card" style="background:linear-gradient(135deg,#1a1500,#0f0f00);border:1.5px solid var(--gold)">
          <div class="popup-header">
            <span class="popup-icon">🏛️</span>
            <span class="popup-title" style="color:var(--gold)">Hall of Fame</span>
            <button class="popup-close" data-action="dismissHOF">✕</button>
          </div>
          <div class="popup-body">
            ${members.map(m => `
              <div class="popup-item">
                <span class="popup-icon" style="font-size:20px">⭐</span>
                <div class="popup-item-info">
                  <div class="popup-item-name">${m.name}</div>
                  <div class="popup-item-detail">${m.position} · ${m.reason}</div>
                </div>
              </div>`).join('')}
          </div>
          <div style="font-size:12px;color:var(--text2);text-align:center;margin:8px 0">Inducted into the Baseball Hall of Fame</div>
          <button class="btn popup-action-btn" style="background:var(--gold);color:#000;font-weight:800" data-action="dismissHOF">Congratulations!</button>
        </div>
      </div>`;
  },
};

window.Comps = Comps;
