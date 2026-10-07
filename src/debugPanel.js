const FAB = '<button class="debug-fab" id="debug-fab" title="Debug" aria-label="Debug" data-i18n-title="debug.header">&#9881;</button>';

const PANEL = `
<div class="debug-panel" id="debug-panel">
  <div class="debug-header" id="debug-drag-handle">
    <span class="debug-title" data-i18n="debug.header">Debug</span>
    <button class="debug-icon-btn" id="debug-collapse-btn" aria-label="Collapse">&#9660;</button>
  </div>
  <div class="debug-tabs" id="debug-tabs">
    <button class="debug-tab active" data-tab="connection" data-i18n="debug.tab.connection">Connection</button>
    <button class="debug-tab" data-tab="teams" data-i18n="debug.tab.teams">Teams</button>
    <button class="debug-tab" data-tab="overlay" data-i18n="debug.tab.overlay">Overlay</button>
    <button class="debug-tab" data-tab="advanced" data-i18n="debug.tab.advanced">Advanced</button>
  </div>
  <div class="debug-body" id="debug-body">

    <div class="debug-tab-panel active" data-tab-panel="connection">
      <div class="debug-section">
        <h5 data-i18n="debug.connection">Connection</h5>
        <div class="debug-row"><span data-i18n="debug.bridge">Bridge</span><span class="val" id="dbg-conn-bridge">--</span></div>
        <div class="debug-row"><span data-i18n="debug.state">State</span><span class="val" id="dbg-conn-state">idle</span></div>
        <div class="debug-row"><span data-i18n="debug.source">Source</span><span class="val" id="dbg-conn-source">none</span></div>
        <div class="debug-row"><span data-i18n="debug.events">Events</span><span class="val" id="dbg-conn-events">0</span></div>
        <div class="debug-row"><span data-i18n="debug.error">Error</span><span class="val" id="dbg-conn-error">-</span></div>
        <div class="debug-row" style="gap:6px;margin-top:6px;">
          <input id="conn-username" placeholder="tiktok username" data-i18n-placeholder="debug.username" style="flex:1;min-width:0;background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:3px 5px;font-family:inherit;" />
          <select id="conn-mode" style="background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:3px;font-family:inherit;">
            <option value="auto" data-i18n="mode.auto">Auto</option>
            <option value="direct" data-i18n="mode.direct">Direct</option>
            <option value="tikfinity" data-i18n="mode.tikfinity">TikFinity</option>
            <option value="mock" data-i18n="mode.mock">Mock</option>
          </select>
        </div>
        <div class="debug-row" style="gap:6px;margin-top:4px;">
          <input id="conn-tikfinity-host" placeholder="127.0.0.1" style="flex:2;min-width:0;background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:3px 5px;font-family:inherit;" />
          <input id="conn-tikfinity-port" placeholder="21213" style="width:56px;background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:3px 5px;font-family:inherit;" />
        </div>
        <div class="debug-row" style="gap:6px;margin-top:6px;">
          <button class="ctrl-btn" id="btn-conn-connect" style="flex:1;" data-i18n="debug.connect">Connect</button>
          <button class="ctrl-btn" id="btn-conn-disconnect" style="flex:1;" data-i18n="debug.disconnect">Disconnect</button>
        </div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.soldiers">Soldiers</h5>
        <div class="debug-row">
          <span data-i18n="debug.soldierSpeed">Speed</span>
          <input id="soldier-speed" type="range" min="0.5" max="3" step="0.1" value="1.1" style="width:110px;">
          <span class="val" id="soldier-speed-value">1.1</span>
        </div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.tikora">Tikora Hub</h5>
        <div class="debug-row"><span data-i18n="debug.status">Status</span><span class="val" id="dbg-tikora-status">off</span></div>
        <div class="debug-row"><span data-i18n="debug.slug">Game</span><span class="val" id="dbg-tikora-slug">--</span></div>
        <div class="debug-row"><span data-i18n="debug.relay">Relay</span><span class="val" id="dbg-tikora-relay">--</span></div>
        <div class="debug-row" style="margin-top:6px;"><span style="color:#555;font-size:9px;font-style:italic;" data-i18n="debug.managedByHub">Managed by the hub</span></div>
      </div>
    </div>

    <div class="debug-tab-panel" data-tab-panel="teams">
      <div class="debug-section">
        <h5 data-i18n="debug.capital">Capital</h5>
        <div class="debug-row">
          <span data-i18n="debug.capitalSize">Size</span>
          <input id="capital-scale" type="range" min="0.5" max="2.5" step="0.1" value="1" style="width:110px;">
          <span class="val" id="capital-scale-value">1.0x</span>
        </div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.teams">Teams</h5>
        <div id="teams-panel-body"></div>
        <div class="debug-row" style="gap:6px;margin-top:6px;">
          <button class="ctrl-btn" id="btn-teams-add" style="flex:1;" data-i18n="debug.addTeam">Add Team</button>
          <button class="ctrl-btn" id="btn-teams-save" style="flex:1;" data-i18n="debug.save">Save</button>
        </div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.language">Language</h5>
        <select id="language-select" style="width:100%;background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:3px;font-family:inherit;">
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </div>
    </div>

    <div class="debug-tab-panel" data-tab-panel="overlay">
      <div class="debug-section">
        <h5 data-i18n="debug.overlay">Leaderboard Overlay</h5>
        <div class="debug-row" style="gap:6px;">
          <input id="overlay-url" readonly style="flex:1;min-width:0;background:#111;border:1px solid #333;color:#8cf;font-size:10px;padding:3px 5px;font-family:inherit;" />
        </div>
        <div class="debug-row" style="gap:6px;margin-top:6px;">
          <button class="ctrl-btn" id="btn-copy-overlay" style="flex:1;" data-i18n="debug.copy">Copy</button>
          <button class="ctrl-btn" id="btn-open-overlay" style="flex:1;" data-i18n="debug.open">Open</button>
        </div>
      </div>
    </div>

    <div class="debug-tab-panel" data-tab-panel="advanced">
      <div class="debug-section">
        <h5 data-i18n="debug.mockEvent">Mock Event</h5>
        <div class="debug-row" style="gap:6px;">
          <select id="mock-type" style="background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:3px;font-family:inherit;">
            <option value="chat" data-i18n="mock.chat">chat</option>
            <option value="gift" data-i18n="mock.gift">gift</option>
            <option value="like" data-i18n="mock.like">like</option>
            <option value="follow" data-i18n="mock.follow">follow</option>
            <option value="share" data-i18n="mock.share">share</option>
            <option value="member" data-i18n="mock.member">member</option>
          </select>
          <input id="mock-username" placeholder="viewer" data-i18n-placeholder="misc.viewer" style="flex:1;min-width:0;background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:3px 5px;font-family:inherit;" />
          <input id="mock-value" placeholder="1" value="1" style="width:38px;background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:3px 5px;font-family:inherit;" />
        </div>
        <div class="debug-row" style="gap:6px;">
          <span data-i18n="debug.bypassPrompt" style="flex:1;">Skip pick-a-side</span>
          <input id="bypass-prompt" type="checkbox" />
        </div>
        <button class="ctrl-btn" id="btn-mock-inject" style="width:100%;margin-top:6px;" data-i18n="debug.inject">Inject</button>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.viewers">Viewers</h5>
        <div class="debug-row"><span data-i18n="debug.activeViewers">Active</span><span class="val" id="dbg-viewers-active">0</span></div>
        <div class="debug-row"><span data-i18n="debug.queuedViewers">Queued</span><span class="val" id="dbg-viewers-queued">0</span></div>
        <div class="debug-row"><span data-i18n="debug.totalViewers">Total</span><span class="val" id="dbg-viewers-total">0</span></div>
        <div class="debug-row"><span data-i18n="debug.cap">Cap</span><input id="viewer-cap" type="number" min="1" max="60" value="24" style="width:50px;background:#111;border:1px solid #333;color:#ddd;font-size:10px;padding:2px 4px;font-family:inherit;" /></div>
        <div class="debug-row"><span data-i18n="debug.aiFill">AI Fill</span><input id="viewer-aifill" type="checkbox" /></div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.cinematic">Cinematic</h5>
        <div class="debug-row"><span data-i18n="debug.queue">Queue</span><span class="val" id="dbg-cine-queue">0</span></div>
        <div class="debug-row"><span data-i18n="debug.blur">Blur</span><input id="cine-blur" type="range" min="0" max="100" value="100" style="width:80px;" /></div>
        <div class="debug-row"><span data-i18n="debug.autozoom">Auto-zoom</span><input id="cine-autozoom" type="checkbox" /></div>
        <button class="ctrl-btn" id="btn-cine-skip" style="width:100%;margin-top:6px;" data-i18n="debug.skip">Skip Intro</button>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.scoring">Scoring Weights</h5>
        <div id="scoring-panel-body"></div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.winners">All-Time Winners</h5>
        <div id="winners-panel-body"></div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.content">Content — Gift Mappings</h5>
        <div id="mappings-panel-body"></div>
        <div class="debug-row" style="gap:6px;margin-top:6px;">
          <button class="ctrl-btn" id="btn-mappings-add" style="flex:1;" data-i18n="debug.addMapping">Add</button>
          <button class="ctrl-btn" id="btn-mappings-save" style="flex:1;" data-i18n="debug.save">Save</button>
        </div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.performance">Performance</h5>
        <div class="debug-row"><span>FPS</span><span class="val" id="dbg-fps">--</span></div>
        <div class="debug-row"><span data-i18n="debug.frameTime">Frame Time</span><span class="val" id="dbg-frametime">--</span></div>
        <div class="debug-row"><span data-i18n="control.map">Map</span><span class="val" id="dbg-map">--</span></div>
        <div class="debug-row"><span data-i18n="debug.claimable">Claimable</span><span class="val" id="dbg-walls">--</span></div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.particles">Particles</h5>
        <div class="debug-row"><span data-i18n="debug.active">Active</span><span class="val" id="dbg-particles">--</span></div>
        <div class="debug-row"><span data-i18n="debug.poolFree">Pool Free</span><span class="val" id="dbg-pool-free">--</span></div>
      </div>
      <div class="debug-section">
        <h5 data-i18n="debug.tileOwnership">Tile Ownership</h5>
        <div class="debug-tile-grid" id="dbg-tiles"></div>
      </div>
    </div>

  </div>
</div>`;

export function createDebugPanel() {
  document.body.insertAdjacentHTML('beforeend', FAB + PANEL);
}
