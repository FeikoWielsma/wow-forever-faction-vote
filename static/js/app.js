const DEFAULT_PLAYERS = [
  // Horde (20)
  { id: 1, name: "rkkixlol", faction: "Horde", c: true, s: false, r: false },
  { id: 2, name: "drey", faction: "Horde", c: true, s: true, r: true },
  { id: 3, name: "korovaemae", faction: "Horde", c: false, s: false, r: false },
  { id: 4, name: "xak", faction: "Horde", c: true, s: true, r: true },
  { id: 5, name: "edd", faction: "Horde", c: true, s: true, r: true },
  { id: 6, name: "bosse", faction: "Horde", c: false, s: true, r: false },
  { id: 7, name: "bancai", faction: "Horde", c: true, s: true, r: false },
  { id: 8, name: "raksodwarf", faction: "Horde", c: false, s: true, r: true },
  { id: 9, name: "Erelja", faction: "Horde", c: false, s: true, r: true },
  { id: 10, name: "sam", faction: "Horde", c: false, s: false, r: true },
  { id: 11, name: "ayer", faction: "Horde", c: true, s: true, r: true },
  { id: 12, name: "elstongnome", faction: "Horde", c: false, s: true, r: true },
  { id: 13, name: "megadave", faction: "Horde", c: true, s: true, r: false },
  { id: 14, name: "Maxibon", faction: "Horde", c: true, s: true, r: false },
  { id: 15, name: "scam", faction: "Horde", c: true, s: true, r: true },
  { id: 16, name: "wondo", faction: "Horde", c: true, s: false, r: true },
  { id: 17, name: "fartlordx", faction: "Horde", c: true, s: true, r: true },
  { id: 18, name: "Nexu / Deneve", faction: "Horde", c: true, s: true, r: false },
  { id: 19, name: "Vanargand", faction: "Horde", c: true, s: false, r: true },
  { id: 22, name: "brokest boi", faction: "Horde", c: true, s: true, r: true },

  // Alliance (22)
  { id: 20, name: "sodam", isSodam: true, faction: "Alliance", c: true, s: true, r: true },
  { id: 21, name: "falkoro", faction: "Alliance", c: false, s: false, r: false },
  { id: 23, name: "thistlewind", faction: "Alliance", c: false, s: true, r: true },
  { id: 24, name: "neych", faction: "Alliance", c: false, s: true, r: true },
  { id: 25, name: "grimzzy", faction: "Alliance", c: true, s: true, r: true },
  { id: 26, name: "mcflash", faction: "Alliance", c: false, s: true, r: true },
  { id: 27, name: "monarch", faction: "Alliance", c: true, s: true, r: false },
  { id: 28, name: "bob", faction: "Alliance", c: false, s: true, r: true },
  { id: 29, name: "Biolume", faction: "Alliance", c: false, s: true, r: false },
  { id: 30, name: "purpleman", faction: "Alliance", c: true, s: true, r: true },
  { id: 31, name: "yucca", faction: "Alliance", c: true, s: true, r: false },
  { id: 32, name: "cloggy", faction: "Alliance", c: false, s: true, r: true },
  { id: 33, name: "malc", faction: "Alliance", c: true, s: true, r: true },
  { id: 34, name: "glen", faction: "Alliance", c: false, s: true, r: false },
  { id: 35, name: "zerodas", faction: "Alliance", c: false, s: true, r: true },
  { id: 36, name: "starfirebeam", faction: "Alliance", c: false, s: true, r: true },
  { id: 37, name: "celth", faction: "Alliance", c: true, s: true, r: false },
  { id: 38, name: "chobo", faction: "Alliance", c: false, s: false, r: false },
  { id: 39, name: "port", faction: "Alliance", c: true, s: true, r: true },
  { id: 40, name: "droggo", faction: "Alliance", c: true, s: true, r: false },
  { id: 41, name: "atoz", faction: "Alliance", c: true, s: false, r: false },
  { id: 42, name: "noxqs", faction: "Alliance", c: false, s: true, r: false }
];

const isAdmin = window.location.pathname.startsWith("/admin") || 
                window.location.pathname.startsWith("/manage") || 
                new URLSearchParams(window.location.search).has("admin");

if (isAdmin) {
  document.body.classList.add("is-admin");
}

let players = [];
let votingMode = "onevote"; // 'weighted' or 'onevote'
let isBackendConnected = false;
let debounceSettingsTimeout = null;

async function init() {
  updateStatusBadge("Connecting…", "connecting");
  try {
    const res = await fetch("/api/state");
    if (res.ok) {
      const data = await res.json();
      players = data.players;
      if (data.settings) {
        if (data.settings.w_classic !== undefined) document.getElementById("w-classic").value = data.settings.w_classic;
        if (data.settings.w_sod !== undefined) document.getElementById("w-sod").value = data.settings.w_sod;
        if (data.settings.w_retail !== undefined) document.getElementById("w-retail").value = data.settings.w_retail;
        if (data.settings.voting_mode) votingMode = data.settings.voting_mode;
      }
      isBackendConnected = true;
      updateStatusBadge("Live", "connected");
      startPolling();
    } else {
      fallbackToDefaults();
    }
  } catch (err) {
    fallbackToDefaults();
  }
  updateModeUI();
  renderTable();
  recalc();
}

function fallbackToDefaults() {
  isBackendConnected = false;
  updateStatusBadge("Offline", "offline");
  players = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
}

function updateStatusBadge(text, state) {
  const badge = document.getElementById("db-status-badge");
  const label = document.getElementById("db-status-text");
  if (!badge || !label) return;
  label.textContent = text;
  badge.dataset.state = state;
}

async function setVotingMode(mode) {
  if (!isAdmin) return;
  votingMode = mode;
  updateModeUI();
  renderTable();
  recalc();
  syncSettingsToDb({ voting_mode: mode });
}

function updateModeUI() {
  const isOneVote = votingMode === "onevote";
  document.getElementById("btn-mode-weighted").className = `mode-switch-btn ${!isOneVote ? 'active' : ''}`;
  document.getElementById("btn-mode-onevote").className = `mode-switch-btn ${isOneVote ? 'active' : ''}`;
  
  const wSection = document.getElementById("weights-container");
  const presetsBar = document.getElementById("presets-bar");
  if (isOneVote) {
    wSection.classList.add("disabled");
    presetsBar.style.opacity = "0.35";
    presetsBar.style.pointerEvents = "none";
  } else {
    wSection.classList.remove("disabled");
    presetsBar.style.opacity = "1";
    presetsBar.style.pointerEvents = "auto";
  }

  if (!isAdmin) {
    document.getElementById("btn-mode-weighted").style.pointerEvents = "none";
    document.getElementById("btn-mode-onevote").style.pointerEvents = "none";
    document.querySelectorAll(".weight-input").forEach(i => i.disabled = true);
  }
}

let editingPlayerId = null;

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function startEditName(id) {
  if (!isAdmin) return;
  editingPlayerId = id;
  renderTable();
  const input = document.getElementById(`edit_input_${id}`);
  if (input) {
    input.focus();
    input.select();
  }
}

function handleNameKey(event, id, input) {
  if (event.key === "Enter") {
    input.blur();
  } else if (event.key === "Escape") {
    editingPlayerId = null;
    renderTable();
  }
}

async function savePlayerName(id, newName) {
  if (!isAdmin) return;
  const cleanName = (newName || "").trim();
  const p = players.find(x => x.id === id);
  if (!p) {
    editingPlayerId = null;
    renderTable();
    return;
  }
  if (!cleanName || cleanName === p.name) {
    editingPlayerId = null;
    renderTable();
    return;
  }
  p.name = cleanName;
  editingPlayerId = null;
  renderTable();
  recalc();
  syncPlayerToDb(id, { name: cleanName });
  showToast(`Renamed to "${cleanName}"`);
}

function toggleAddPlayerPanel(show) {
  if (!isAdmin) return;
  const panel = document.getElementById("add-player-panel");
  if (!panel) return;
  const shouldShow = show !== undefined ? show : (panel.style.display === "none");
  panel.style.display = shouldShow ? "block" : "none";
  if (shouldShow) {
    const input = document.getElementById("new-player-name");
    if (input) input.focus();
  }
}

async function submitAddPlayer() {
  if (!isAdmin) return;
  const nameInput = document.getElementById("new-player-name");
  const factionSelect = document.getElementById("new-player-faction");
  const cCheck = document.getElementById("new-player-c");
  const sCheck = document.getElementById("new-player-s");
  const rCheck = document.getElementById("new-player-r");

  const name = (nameInput.value || "").trim();
  if (!name) {
    showToast("⚠️ Please enter a player name");
    nameInput.focus();
    return;
  }

  const faction = factionSelect.value;
  const c = cCheck.checked;
  const s = sCheck.checked;
  const r = rCheck.checked;

  updateStatusBadge("Saving…", "saving");

  const newPlayerObj = { name, faction, c, s, r };

  try {
    if (isBackendConnected) {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlayerObj)
      });
      if (!res.ok) throw new Error("Failed to add player");
      const savedPlayer = await res.json();
      players.push(savedPlayer);
      updateStatusBadge("Live", "connected");
    } else {
      const maxId = players.reduce((max, p) => Math.max(max, p.id || 0), 0);
      const offlinePlayer = {
        id: maxId + 1,
        name,
        faction,
        c,
        s,
        r,
        isSodam: false
      };
      players.push(offlinePlayer);
    }

    nameInput.value = "";
    cCheck.checked = false;
    sCheck.checked = false;
    rCheck.checked = false;
    toggleAddPlayerPanel(false);

    renderTable();
    recalc();
    showToast(`Added "${name}" to ${faction}!`);
  } catch (err) {
    console.error(err);
    updateStatusBadge("Sync Error", "offline");
    showToast("⚠️ Error adding player");
  }
}

async function removePlayer(id) {
  if (!isAdmin) return;
  const p = players.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Remove "${p.name}" from the voting roster?`)) return;

  updateStatusBadge("Saving…", "saving");
  try {
    if (isBackendConnected) {
      const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete player");
      updateStatusBadge("Live", "connected");
    }
    players = players.filter(x => x.id !== id);
    renderTable();
    recalc();
    showToast(`Removed "${p.name}"`);
  } catch (err) {
    console.error(err);
    updateStatusBadge("Sync Error", "offline");
    showToast("⚠️ Error removing player");
  }
}

function renderTable() {
  const aTbody = document.getElementById("alliance-tbody");
  const hTbody = document.getElementById("horde-tbody");
  const absTbody = document.getElementById("abstain-tbody");

  if (!aTbody || !hTbody || !absTbody) return;

  aTbody.innerHTML = "";
  hTbody.innerHTML = "";
  absTbody.innerHTML = "";

  const query = (document.getElementById("search-box").value || "").toLowerCase();

  const filtered = players.filter(p => {
    return p.name.toLowerCase().includes(query);
  });

  const allianceList = filtered.filter(p => p.faction === "Alliance");
  const hordeList = filtered.filter(p => p.faction === "Horde");
  const abstainList = filtered.filter(p => p.faction === "Abstain");

  function buildRow(p, idx) {
    const isEditing = editingPlayerId === p.id;
    const tr = document.createElement("tr");

    let nameHtml = "";
    if (isAdmin && isEditing) {
      nameHtml = `<input type="text" class="name-edit-input" id="edit_input_${p.id}" value="${escapeHtml(p.name)}" 
        onkeydown="handleNameKey(event, ${p.id}, this)" 
        onblur="savePlayerName(${p.id}, this.value)">`;
    } else if (isAdmin) {
      nameHtml = `
        <div class="name-cell">
          <span class="name-text" title="Click to rename" onclick="startEditName(${p.id})">${escapeHtml(p.name)}</span>
          ${p.isSodam ? '<span class="gm-badge">GM</span>' : ''}
          <button class="btn-edit-name" title="Rename" onclick="startEditName(${p.id})">✏️</button>
        </div>
      `;
    } else {
      nameHtml = `
        <div class="name-cell">
          <span class="name-text-safe">${escapeHtml(p.name)}</span>
          ${p.isSodam ? '<span class="gm-badge">GM</span>' : ''}
        </div>
      `;
    }

    const factionSelectHtml = `
      <select class="compact-faction-select ${p.faction.toLowerCase()}" onchange="changeFaction(${p.id}, this.value)">
        <option value="Alliance" ${p.faction === 'Alliance' ? 'selected' : ''}>🔵 Alliance</option>
        <option value="Horde" ${p.faction === 'Horde' ? 'selected' : ''}>🔴 Horde</option>
        <option value="Abstain" ${p.faction === 'Abstain' ? 'selected' : ''}>⚪ Abstain</option>
      </select>
    `;

    const checkboxC = `<td class="center"><input type="checkbox" ${p.c ? 'checked' : ''} ${isAdmin ? `onchange="toggleBox(${p.id}, 'c', this.checked)"` : 'disabled'}></td>`;
    const checkboxS = `<td class="center"><input type="checkbox" ${p.s ? 'checked' : ''} ${isAdmin ? `onchange="toggleBox(${p.id}, 's', this.checked)"` : 'disabled'}></td>`;
    const checkboxR = `<td class="center"><input type="checkbox" ${p.r ? 'checked' : ''} ${isAdmin ? `onchange="toggleBox(${p.id}, 'r', this.checked)"` : 'disabled'}></td>`;

    const adminMoveTd = isAdmin ? `<td class="center">${factionSelectHtml}</td>` : '';
    const adminDelTd = isAdmin ? `<td class="center"><button class="btn-del" title="Remove player" onclick="removePlayer(${p.id})">✕</button></td>` : '';

    tr.innerHTML = `
      <td class="row-num">${idx + 1}</td>
      <td>${nameHtml}</td>
      ${checkboxC}
      ${checkboxS}
      ${checkboxR}
      <td class="center player-score ${p.faction === 'Abstain' ? 'abstaining' : ''}" id="score_${p.id}">0</td>
      ${adminMoveTd}
      ${adminDelTd}
    `;
    return tr;
  }

  allianceList.forEach((p, idx) => aTbody.appendChild(buildRow(p, idx)));
  hordeList.forEach((p, idx) => hTbody.appendChild(buildRow(p, idx)));
  abstainList.forEach((p, idx) => absTbody.appendChild(buildRow(p, idx)));

  const colSpan = isAdmin ? 8 : 6;
  if (allianceList.length === 0) {
    aTbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-row">No Alliance voters matching filter</td></tr>`;
  }
  if (hordeList.length === 0) {
    hTbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-row">No Horde voters matching filter</td></tr>`;
  }
  if (abstainList.length === 0) {
    absTbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-row">No abstaining players matching filter</td></tr>`;
  }
}

async function changeFaction(id, newFaction) {
  if (!isAdmin) return;
  const p = players.find(x => x.id === id);
  if (p) {
    p.faction = newFaction;
    renderTable();
    recalc();
    syncPlayerToDb(id, { faction: newFaction });
  }
}

async function toggleBox(id, era, isChecked) {
  if (!isAdmin) return;
  const p = players.find(x => x.id === id);
  if (p) {
    p[era] = isChecked;
    recalc();
    syncPlayerToDb(id, { [era]: isChecked });
  }
}

async function syncPlayerToDb(id, patchData) {
  if (!isBackendConnected) return;
  updateStatusBadge("Saving…", "saving");
  try {
    await fetch(`/api/players/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchData)
    });
    updateStatusBadge("Live", "connected");
  } catch (err) {
    console.error("Failed to sync player to DB:", err);
    updateStatusBadge("Sync Error", "offline");
  }
}

async function applyPreset(wc, ws, wr, btn) {
  if (!isAdmin) return;
  if (votingMode === "onevote") setVotingMode("weighted");
  document.getElementById("w-classic").value = wc;
  document.getElementById("w-sod").value = ws;
  document.getElementById("w-retail").value = wr;
  document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  recalc();
  syncSettingsToDb({ w_classic: wc, w_sod: ws, w_retail: wr, voting_mode: votingMode });
}

function onWeightInput() {
  if (!isAdmin) return;
  recalc();
  if (debounceSettingsTimeout) clearTimeout(debounceSettingsTimeout);
  debounceSettingsTimeout = setTimeout(() => {
    const wc = parseFloat(document.getElementById("w-classic").value) || 0;
    const ws = parseFloat(document.getElementById("w-sod").value) || 0;
    const wr = parseFloat(document.getElementById("w-retail").value) || 0;
    syncSettingsToDb({ w_classic: wc, w_sod: ws, w_retail: wr, voting_mode: votingMode });
  }, 400);
}

async function syncSettingsToDb(settingsObj) {
  if (!isBackendConnected) return;
  updateStatusBadge("Saving settings...", "saving");
  try {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsObj)
    });
    updateStatusBadge("Live", "connected");
  } catch (err) {
    console.error("Failed to sync settings to DB:", err);
  }
}

let pollTimer = null;
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (document.hidden || editingPlayerId !== null || 
        document.activeElement === document.getElementById("search-box") || 
        document.activeElement === document.getElementById("new-player-name") ||
        (document.activeElement && document.activeElement.classList.contains("name-edit-input"))) {
      return;
    }
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        const incomingJson = JSON.stringify(data.players);
        const currentJson = JSON.stringify(players);
        if (incomingJson !== currentJson) {
          players = data.players;
          renderTable();
          recalc();
        }
      }
    } catch (e) {
      // silently ignore transient offline
    }
  }, 3000);
}

function recalc() {
  if (isJebMode) {
    applyJebLandslide();
    return;
  }
  const wc = parseFloat(document.getElementById("w-classic").value) || 0;
  const ws = parseFloat(document.getElementById("w-sod").value) || 0;
  const wr = parseFloat(document.getElementById("w-retail").value) || 0;
  const isOneVote = votingMode === "onevote";

  let hordeTotal = 0;
  let allianceTotal = 0;
  let abstainTotal = 0;

  let hordeCount = 0;
  let allianceCount = 0;
  let abstainCount = 0;

  const sodamPlayer = players.find(p => p.isSodam);
  let sodamPower = 0;

  players.forEach(p => {
    let power = 0;
    const hasPlayedAny = p.c || p.s || p.r;

    if (isOneVote) {
      power = hasPlayedAny ? 1 : 0;
    } else {
      power = (p.c ? wc : 0) + (p.s ? ws : 0) + (p.r ? wr : 0);
    }

    if (p.isSodam) sodamPower = power;

    const scoreEl = document.getElementById(`score_${p.id}`);
    if (scoreEl) {
      if (p.faction === "Abstain") {
        scoreEl.textContent = `${power} (idle)`;
        scoreEl.className = "center player-score abstaining";
      } else {
        scoreEl.textContent = power;
        scoreEl.className = "center player-score";
      }
    }

    if (p.faction === "Horde") {
      hordeTotal += power;
      if (power > 0) hordeCount++;
    } else if (p.faction === "Alliance") {
      allianceTotal += power;
      if (power > 0) allianceCount++;
    } else if (p.faction === "Abstain") {
      abstainTotal += power;
      if (power > 0) abstainCount++;
    }
  });

  const decidedTotal = hordeTotal + allianceTotal;
  const grandTotal = decidedTotal + abstainTotal;

  const hPct = decidedTotal > 0 ? ((hordeTotal / decidedTotal) * 100).toFixed(1) : 0;
  const aPct = decidedTotal > 0 ? ((allianceTotal / decidedTotal) * 100).toFixed(1) : 0;
  const absPct = grandTotal > 0 ? ((abstainTotal / grandTotal) * 100).toFixed(1) : 0;

  document.getElementById("horde-score").textContent = hordeTotal;
  document.getElementById("horde-pct").textContent = isOneVote 
    ? `${hordeCount} voters · ${hPct}%` 
    : `${hPct}% of decided votes`;

  document.getElementById("alliance-score").textContent = allianceTotal;
  document.getElementById("alliance-pct").textContent = isOneVote 
    ? `${allianceCount} voters · ${aPct}%` 
    : `${aPct}% of decided votes`;

  document.getElementById("abstain-score").textContent = abstainTotal;
  document.getElementById("abstain-sub").textContent = isOneVote
    ? `${abstainCount} players · ${absPct}%`
    : `${abstainCount} players · ${absPct}% of pool`;

  // Update column sub-headers
  const aCountEl = document.getElementById("alliance-col-count");
  if (aCountEl) aCountEl.textContent = `${allianceCount} voters`;
  const aScoreEl = document.getElementById("alliance-col-score");
  if (aScoreEl) aScoreEl.textContent = `${allianceTotal} ${isOneVote ? 'votes' : 'pts'}`;

  const hCountEl = document.getElementById("horde-col-count");
  if (hCountEl) hCountEl.textContent = `${hordeCount} voters`;
  const hScoreEl = document.getElementById("horde-col-score");
  if (hScoreEl) hScoreEl.textContent = `${hordeTotal} ${isOneVote ? 'votes' : 'pts'}`;

  const absCountEl = document.getElementById("abstain-col-count");
  if (absCountEl) absCountEl.textContent = `${abstainCount} players`;
  const absScoreEl = document.getElementById("abstain-col-score");
  if (absScoreEl) absScoreEl.textContent = `${abstainTotal} ${isOneVote ? 'potential votes' : 'potential pts'}`;

  const margin = Math.abs(hordeTotal - allianceTotal);
  const swingBadge = document.getElementById("abstain-swing-badge");
  const unit = isOneVote ? "votes" : "pts";

  if (margin === 0) {
    if (abstainTotal > 0) {
      swingBadge.className = "swing-alert warning";
      swingBadge.textContent = `Dead Heat (${abstainTotal} ${unit} can break tie)`;
    } else {
      swingBadge.className = "swing-alert safe";
      swingBadge.textContent = `Dead Heat (0 abstaining)`;
    }
  } else if (abstainTotal > margin) {
    swingBadge.className = "swing-alert critical";
    swingBadge.textContent = `Could Flip Lead (${abstainTotal} uncast > ${margin} lead)`;
  } else if (abstainTotal === margin) {
    swingBadge.className = "swing-alert warning";
    swingBadge.textContent = `Could Force Tie (${abstainTotal} uncast = ${margin} lead)`;
  } else if (abstainTotal > 0) {
    swingBadge.className = "swing-alert safe";
    swingBadge.textContent = `✓ Lead Holds (${margin} lead > ${abstainTotal} uncast)`;
  } else {
    swingBadge.className = "swing-alert safe";
    swingBadge.textContent = `✓ All votes cast`;
  }

  const winnerEl = document.getElementById("winner-badge");
  const marginEl = document.getElementById("margin-text");

  let currentLeader = "Tie";
  if (hordeTotal > allianceTotal) {
    currentLeader = "Horde";
    winnerEl.textContent = "HORDE WINS";
    winnerEl.style.color = "var(--horde-red)";
    marginEl.textContent = `Horde leads by +${margin} ${isOneVote ? 'votes' : 'pts'} (+${(hPct - aPct).toFixed(1)}%)`;
  } else if (allianceTotal > hordeTotal) {
    currentLeader = "Alliance";
    winnerEl.textContent = "ALLIANCE WINS";
    winnerEl.style.color = "var(--alliance-blue)";
    marginEl.textContent = `Alliance leads by +${margin} ${isOneVote ? 'votes' : 'pts'} (+${(aPct - hPct).toFixed(1)}%)`;
  } else {
    winnerEl.textContent = "DEAD TIE";
    winnerEl.style.color = "#d97706";
    marginEl.textContent = "Active votes are completely tied";
  }

  // UPDATE AZEROTH ELECTORAL COLLEGE & BATTLEGROUND MAP
  const electionData = calculateElectionResults();
  updateElectionMapUI(electionData);
}

function copyPublicLink() {
  const publicUrl = window.location.origin + "/";
  navigator.clipboard.writeText(publicUrl).then(() => {
    showToast("📋 Copied Public Safe View URL to clipboard!");
  });
}

function copyTSV() {
  let tsv = "Player Name\tFaction Vote\tClassic\tSoD\tRetail\n";
  players.forEach(p => {
    tsv += `${p.name}\t${p.faction}\t${p.c ? 'TRUE' : 'FALSE'}\t${p.s ? 'TRUE' : 'FALSE'}\t${p.r ? 'TRUE' : 'FALSE'}\n`;
  });
  navigator.clipboard.writeText(tsv).then(() => {
    showToast(`Copied ${players.length} players to clipboard! Paste directly into Google Sheets.`);
  });
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 3000);
}

async function syncDiscordVotes() {
  const btn = document.getElementById("btn-discord-sync");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Syncing...";
  }
  showToast("Fetching live votes from Discord poll in #sign-up-forever...");
  try {
    const token = window.prompt("Enter the sync token to run a manual Discord sync:");
    if (!token) return;
    const res = await fetch("/api/discord/sync", {
      method: "POST",
      headers: { "X-Sync-Token": token }
    });
    if (res.ok) {
      const data = await res.json();
      const allyCount = data.alliance_poll_votes ?? data.total_alliance_reactions ?? 0;
      const hordeCount = data.horde_poll_votes ?? data.total_horde_reactions ?? 0;
      showToast(`✅ Synced ${data.synced_count} Discord voters (${allyCount} Alliance, ${hordeCount} Horde)!`);
      const stateRes = await fetch("/api/state");
      if (stateRes.ok) {
        const sdata = await stateRes.json();
        players = sdata.players;
        renderTable();
        recalc();
      }
    } else {
      showToast("❌ Failed to sync from Discord.");
    }
  } catch (err) {
    console.error("Discord sync error:", err);
    showToast("❌ Discord sync connection error.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🤖 Sync Discord Poll";
    }
  }
}

init();
