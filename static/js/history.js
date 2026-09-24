let historyData = [];

async function fetchHistory() {
  try {
    const res = await fetch("/api/history?limit=250");
    if (res.ok) {
      historyData = await res.json();
      renderStats();
      renderHistoryTable();
    }
  } catch (err) {
    console.error("Failed to fetch history:", err);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRelativeTime(tsStr) {
  if (!tsStr) return "Just now";
  // Parse SQLite UTC timestamp
  const date = new Date(tsStr + (tsStr.endsWith("Z") ? "" : "Z"));
  if (isNaN(date.getTime())) return tsStr;

  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 45) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderStats() {
  let total = 0;
  let h2a = 0;
  let a2h = 0;
  let abstain = 0;

  historyData.forEach(h => {
    if (h.changed_by === 'initial') return;
    total++;
    if (h.old_faction === 'Horde' && h.new_faction === 'Alliance') h2a++;
    else if (h.old_faction === 'Alliance' && h.new_faction === 'Horde') a2h++;
    else if (h.new_faction === 'Abstain') abstain++;
  });

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-h2a").textContent = h2a;
  document.getElementById("stat-a2h").textContent = a2h;
  document.getElementById("stat-abstain").textContent = abstain;
}

function factionBadge(faction) {
  if (!faction) return `<span class="faction-badge none">Unassigned</span>`;
  return `<span class="faction-badge ${escapeHtml(faction.toLowerCase())}">${escapeHtml(faction)}</span>`;
}

const SOURCE_BADGES = {
  discord_sync: `<span class="source-badge discord">Discord poll</span>`,
  admin: `<span class="source-badge admin">Admin</span>`,
};

function renderHistoryTable() {
  const tbody = document.getElementById("history-tbody");
  tbody.innerHTML = "";

  const q = document.getElementById("search-box").value.toLowerCase().trim();
  const fType = document.getElementById("filter-type").value;
  const fSource = document.getElementById("filter-source").value;

  const filtered = historyData.filter(h => {
    if (h.changed_by === 'initial') return false; // Hide seed baseline from active swap feed
    if (q && !h.player_name.toLowerCase().includes(q)) return false;
    if (fSource !== 'all' && h.changed_by !== fSource) return false;

    if (fType === 'h2a' && !(h.old_faction === 'Horde' && h.new_faction === 'Alliance')) return false;
    if (fType === 'a2h' && !(h.old_faction === 'Alliance' && h.new_faction === 'Horde')) return false;
    if (fType === 'to_abstain' && h.new_faction !== 'Abstain') return false;
    if (fType === 'from_abstain' && h.old_faction !== 'Abstain') return false;

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No changes match this filter.</td></tr>`;
    return;
  }

  filtered.forEach(h => {
    const tr = document.createElement("tr");
    const sourceHtml = SOURCE_BADGES[h.changed_by] || `<span class="source-badge initial">Baseline</span>`;

    tr.innerHTML = `
      <td class="id-cell">${h.id}</td>
      <td class="time-cell" title="${escapeHtml(h.timestamp)}">${formatRelativeTime(h.timestamp)}</td>
      <td class="player-name">${escapeHtml(h.player_name)}</td>
      <td>${factionBadge(h.old_faction)}<span class="swap-arrow">→</span>${factionBadge(h.new_faction)}</td>
      <td>${sourceHtml}</td>
      <td class="details-cell">${escapeHtml(h.details || '')}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Initial fetch and auto-refresh loop
fetchHistory();
setInterval(fetchHistory, 4000);
