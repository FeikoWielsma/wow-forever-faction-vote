/* =========================================================
   AZEROTH ELECTORAL COLLEGE & BATTLEGROUND DISTRICT DATA
   ========================================================= */
const AZEROTH_STATES = [
  // Kalimdor
  { id: "TEL", name: "Teldrassil & Darkshore", continent: "Kalimdor", ev: 3, bias: "Alliance", isSwing: false, icon: "🌳", lore: "Ancient World Tree of Darnassus. Core Night Elf heartland.", voterIds: [27, 28, 29] }, // monarch, bob, Biolume
  { id: "ASH", name: "Ashenvale", continent: "Kalimdor", ev: 4, bias: "Tossup", isSwing: true, icon: "🌲", lore: "The Lumber Wars: Warsong Outriders clash with Silverwing Sentinels. Bloodiest border warzone.", voterIds: [13, 14, 32, 33] }, // megadave, Maxibon, cloggy, malc
  { id: "DUR", name: "Durotar", continent: "Kalimdor", ev: 3, bias: "Horde", isSwing: false, icon: "🐺", lore: "Orgrimmar citadel and the harsh red rock home of the Horde.", voterIds: [1, 2, 22] }, // rkkixlol, drey, brokest boi
  { id: "MUL", name: "Mulgore", continent: "Kalimdor", ev: 3, bias: "Horde", isSwing: false, icon: "🦬", lore: "High bluffs of Thunder Bluff and rolling golden plains of the Tauren.", voterIds: [4, 5, 6] }, // xak, edd, bosse
  { id: "BAR", name: "The Barrens", continent: "Kalimdor", ev: 4, bias: "Tossup", isSwing: true, icon: "🌾", lore: "The Crossroads savanna. Famous world PvP skirmishes and Chuck Norris banter.", voterIds: [19, 3, 38, 39] }, // Vanargand, korovaemae, chobo, port
  { id: "SIL", name: "Silithus & Tanaris", continent: "Kalimdor", ev: 3, bias: "Tossup", isSwing: true, icon: "🏜️", lore: "The Shifting Sands and Gadgetzan desert arena. Crucial endgame contested front.", voterIds: [40, 41, 42] }, // droggo, atoz, noxqs

  // Eastern Kingdoms
  { id: "TIR", name: "Tirisfal & Silverpine", continent: "Eastern Kingdoms", ev: 3, bias: "Horde", isSwing: false, icon: "🧟", lore: "The Undercity and Shadowfang Keep. Core domain of the Forsaken.", voterIds: [7, 8, 9] }, // bancai, raksodwarf, Erelja
  { id: "HIL", name: "Hillsbrad Foothills", continent: "Eastern Kingdoms", ev: 5, bias: "Tossup", isSwing: true, icon: "⚔️", lore: "Tarren Mill vs Southshore. The most legendary Vanilla world PvP warzone.", voterIds: [10, 11, 12, 30, 31] }, // sam, ayer, elstongnome, purpleman, yucca
  { id: "ALT", name: "Alterac & Arathi", continent: "Eastern Kingdoms", ev: 4, bias: "Tossup", isSwing: true, icon: "🚩", lore: "Stormpike vs Frostwolf in AV, League of Arathor vs Defilers in AB.", voterIds: [17, 18, 36, 37] }, // fartlordx, Nexu / Deneve, starfirebeam, celth
  { id: "DUN", name: "Dun Morogh & Loch Modan", continent: "Eastern Kingdoms", ev: 3, bias: "Alliance", isSwing: false, icon: "🏔️", lore: "Snowy peaks of Khaz Modan and the impenetrable Great Forge of Ironforge.", voterIds: [24, 25, 26] }, // neych, grimzzy, mcflash
  { id: "ELW", name: "Elwynn & Westfall", continent: "Eastern Kingdoms", ev: 4, bias: "Alliance", isSwing: false, icon: "🏰", lore: "Kingdom of Stormwind, Goldshire, and the Deadmines of Westfall.", voterIds: [20, 21, 23, 35] }, // sodam, falkoro, thistlewind, zerodas
  { id: "STV", name: "Stranglethorn Vale", continent: "Eastern Kingdoms", ev: 4, bias: "Tossup", isSwing: true, icon: "🌴", lore: "The jungle meat grinder: Gurubashi Arena, Nesingwary camp, Booty Bay.", voterIds: [15, 16, 34, 43] } // scam, wondo, glen, plukkd
];

let selectedZoneId = "HIL";
let lastElectionData = null;

function calculateElectionResults() {
  const isOneVote = votingMode === "onevote";
  let totalAllianceEV = 0;
  let totalHordeEV = 0;
  let totalTossupEV = 0;
  let solidAllianceEV = 0;
  let leanAllianceEV = 0;
  let leanHordeEV = 0;
  let solidHordeEV = 0;

  const stateResults = {};
  const playerMap = new Map(players.map(p => [p.id, p]));

  // Dynamically assign any unassigned or newly added players to key battlegrounds
  const assignedIds = new Set();
  AZEROTH_STATES.forEach(st => st.voterIds.forEach(id => assignedIds.add(id)));
  
  const swingStateIds = ["HIL", "ASH", "STV", "ALT", "BAR"];
  let swingIdx = 0;
  players.forEach(p => {
    if (!assignedIds.has(p.id)) {
      const targetState = AZEROTH_STATES.find(s => s.id === swingStateIds[swingIdx % swingStateIds.length]);
      if (targetState) {
        targetState.voterIds.push(p.id);
        assignedIds.add(p.id);
        swingIdx++;
      }
    }
  });

  AZEROTH_STATES.forEach(st => {
    let aPoints = 0;
    let hPoints = 0;
    let absPoints = 0;
    const districtPlayers = [];

    st.voterIds.forEach(vid => {
      const p = playerMap.get(vid);
      if (!p) return;
      districtPlayers.push(p);

      let weight = 1;
      if (!isOneVote) {
        const wc = parseFloat(document.getElementById("w-classic").value) || 0;
        const ws = parseFloat(document.getElementById("w-sod").value) || 0;
        const wr = parseFloat(document.getElementById("w-retail").value) || 0;
        weight = (p.c ? wc : 0) + (p.s ? ws : 0) + (p.r ? wr : 0);
      }

      if (p.faction === "Alliance") aPoints += weight;
      else if (p.faction === "Horde") hPoints += weight;
      else absPoints += weight;
    });

    const diff = aPoints - hPoints;
    let statusClass = "zone-tossup";
    let statusLabel = "TOSSUP";
    let winner = "Tossup";

    if (diff >= 2) {
      statusClass = "zone-solid-alliance";
      statusLabel = "SOLID ALLIANCE";
      winner = "Alliance";
      solidAllianceEV += st.ev;
      totalAllianceEV += st.ev;
    } else if (diff === 1) {
      statusClass = "zone-lean-alliance";
      statusLabel = "LEAN ALLIANCE";
      winner = "Alliance";
      leanAllianceEV += st.ev;
      totalAllianceEV += st.ev;
    } else if (diff <= -2) {
      statusClass = "zone-solid-horde";
      statusLabel = "SOLID HORDE";
      winner = "Horde";
      solidHordeEV += st.ev;
      totalHordeEV += st.ev;
    } else if (diff === -1) {
      statusClass = "zone-lean-horde";
      statusLabel = "LEAN HORDE";
      winner = "Horde";
      leanHordeEV += st.ev;
      totalHordeEV += st.ev;
    } else {
      statusClass = "zone-tossup";
      statusLabel = "TOO CLOSE TO CALL";
      winner = "Tossup";
      totalTossupEV += st.ev;
    }

    stateResults[st.id] = {
      ...st,
      aPoints,
      hPoints,
      absPoints,
      diff,
      statusClass,
      statusLabel,
      winner,
      players: districtPlayers
    };
  });

  return {
    stateResults,
    totalAllianceEV,
    totalHordeEV,
    totalTossupEV,
    solidAllianceEV,
    leanAllianceEV,
    leanHordeEV,
    solidHordeEV,
    totalEV: totalAllianceEV + totalHordeEV + totalTossupEV
  };
}

function updateElectionMapUI(electionData) {
  lastElectionData = electionData;
  const { stateResults, totalAllianceEV, totalHordeEV, totalTossupEV, solidAllianceEV, leanAllianceEV, leanHordeEV, solidHordeEV, totalEV } = electionData;

  // 1. Update 270toWin Bar
  const aTotalEl = document.getElementById("ev-alliance-total");
  const hTotalEl = document.getElementById("ev-horde-total");
  const targetEl = document.getElementById("ev-target-number");
  
  if (aTotalEl) aTotalEl.textContent = totalAllianceEV;
  if (hTotalEl) hTotalEl.textContent = totalHordeEV;
  const neededToWin = Math.floor(totalEV / 2) + 1;
  if (targetEl) targetEl.textContent = `${neededToWin} EV`;

  if (totalEV > 0) {
    const pSolA = (solidAllianceEV / totalEV) * 100;
    const pLeanA = (leanAllianceEV / totalEV) * 100;
    const pToss = (totalTossupEV / totalEV) * 100;
    const pLeanH = (leanHordeEV / totalEV) * 100;
    const pSolH = (solidHordeEV / totalEV) * 100;

    const bSolA = document.getElementById("bar-solid-alliance");
    const bLeanA = document.getElementById("bar-lean-alliance");
    const bToss = document.getElementById("bar-tossup");
    const bLeanH = document.getElementById("bar-lean-horde");
    const bSolH = document.getElementById("bar-solid-horde");

    if (bSolA) bSolA.style.width = `${pSolA}%`;
    if (bLeanA) bLeanA.style.width = `${pLeanA}%`;
    if (bToss) bToss.style.width = `${pToss}%`;
    if (bLeanH) bLeanH.style.width = `${pLeanH}%`;
    if (bSolH) bSolH.style.width = `${pSolH}%`;
  }

  // 2. Update SVG Map Zones
  AZEROTH_STATES.forEach(st => {
    const res = stateResults[st.id];
    const gEl = document.getElementById(`zone-${st.id}`);
    if (!gEl || !res) return;

    gEl.classList.remove("selected");
    const shape = gEl.querySelector("path, polygon, rect");
    if (shape) {
      shape.setAttribute("class", res.statusClass);
    }
    if (selectedZoneId === st.id) {
      gEl.classList.add("selected");
    }
  });

  // 3. Update State Inspector
  const mapOverlay = document.getElementById("jeb-map-overlay");
  if (mapOverlay && !isJebMode) mapOverlay.style.display = "none";
  const inspMedia = document.getElementById("insp-jeb-media");
  if (inspMedia && !isJebMode) inspMedia.style.display = "none";

  const selRes = stateResults[selectedZoneId] || stateResults["HIL"];
  if (selRes) {
    const nameEl = document.getElementById("insp-name");
    const subEl = document.getElementById("insp-sub");
    const evEl = document.getElementById("insp-ev");
    const statusEl = document.getElementById("insp-status");
    const marginEl = document.getElementById("insp-margin");
    const chipsEl = document.getElementById("insp-voters-chips");
    const loreEl = document.getElementById("insp-lore");
    if (nameEl) nameEl.textContent = selRes.name;
    if (subEl) subEl.textContent = `${selRes.continent} • ${selRes.isSwing ? 'Battleground' : 'Stronghold'}`;
    if (evEl) evEl.textContent = `${selRes.ev} EV`;

    if (statusEl) {
      statusEl.textContent = selRes.statusLabel;
      statusEl.className = `insp-val ${selRes.winner.toLowerCase()}`;
    }

    if (marginEl) {
      if (selRes.diff > 0) {
        marginEl.textContent = `Alliance +${selRes.diff}`;
        marginEl.className = "insp-val alliance";
      } else if (selRes.diff < 0) {
        marginEl.textContent = `Horde +${Math.abs(selRes.diff)}`;
        marginEl.className = "insp-val horde";
      } else {
        marginEl.textContent = "DEAD HEAT";
        marginEl.className = "insp-val tossup";
      }
    }

    if (chipsEl) {
      chipsEl.innerHTML = "";
      if (selRes.players.length === 0) {
        chipsEl.innerHTML = `<span class="voter-chip">No registered voters</span>`;
      } else {
        selRes.players.forEach(p => {
          const chip = document.createElement("span");
          chip.className = `voter-chip ${p.faction.toLowerCase()}`;
          chip.textContent = p.name;
          chipsEl.appendChild(chip);
        });
      }
    }

    if (loreEl) loreEl.textContent = `"${selRes.lore}"`;
  }

  // 4. Update Key Battlegrounds Grid
  const bgGrid = document.getElementById("bg-cards-grid");
  if (bgGrid) {
    bgGrid.innerHTML = "";
    const keySwingIds = ["HIL", "ASH", "STV", "ALT", "BAR"];
    keySwingIds.forEach(kid => {
      const kRes = stateResults[kid];
      if (!kRes) return;
      const card = document.createElement("div");
      const cardType = kRes.winner === "Alliance" ? "alliance" : (kRes.winner === "Horde" ? "horde" : "tossup");
      card.className = `bg-card ${cardType}`;
      card.onclick = () => selectZone(kid);

      let marginStr = "DEAD HEAT";
      if (kRes.diff > 0) marginStr = `Alliance +${kRes.diff}`;
      else if (kRes.diff < 0) marginStr = `Horde +${Math.abs(kRes.diff)}`;

      card.innerHTML = `
        <div class="bg-card-title">
          <span>${kRes.name}</span>
          <span class="bg-card-ev">${kRes.ev} EV</span>
        </div>
        <div class="bg-card-status">${kRes.statusLabel}</div>
        <div class="bg-card-sub">${marginStr} (${kRes.aPoints}A - ${kRes.hPoints}H${kRes.absPoints > 0 ? ` - ${kRes.absPoints} Abs` : ''})</div>
      `;
      bgGrid.appendChild(card);
    });
  }

  // 5. Update Breaking News Ticker
  const tickerEl = document.getElementById("ticker-text");
  if (tickerEl) {
    const hil = stateResults["HIL"];
    const ash = stateResults["ASH"];
    const stv = stateResults["STV"];

    if (hil && ash && (hil.diff === 0 || ash.diff === 0)) {
      tickerEl.textContent = `FLASH: Hillsbrad (${hil.diff >= 0 ? '+' : ''}${hil.diff}) & Ashenvale (${ash.diff >= 0 ? '+' : ''}${ash.diff}) are dead-heat battlegrounds holding the balance of power!`;
    } else if (totalAllianceEV > totalHordeEV) {
      tickerEl.textContent = `PROJECTION: Alliance holds electoral lead (${totalAllianceEV} to ${totalHordeEV} EV). ${hil.name} leans ${hil.winner}.`;
    } else if (totalHordeEV > totalAllianceEV) {
      tickerEl.textContent = `PROJECTION: Horde holds electoral lead (${totalHordeEV} to ${totalAllianceEV} EV). ${ash.name} leans ${ash.winner}.`;
    } else {
      tickerEl.textContent = `ELECTION TIED: 21-21 in key districts. Undecided voters in Stranglethorn & Hillsbrad will decide the server faction!`;
    }
  }
}

function selectZone(zoneId) {
  selectedZoneId = zoneId;
  if (lastElectionData && !isJebMode) {
    updateElectionMapUI(lastElectionData);
  }
}

// Collapse/expand the electoral map section; the choice is restored on load by
// the inline script in index.html's <head>, which reads the same key.
const MAP_COLLAPSED_KEY = "wfv-map-collapsed";

function syncMapToggle() {
  const collapsed = document.documentElement.classList.contains("map-collapsed");
  const toggle = document.getElementById("map-toggle");
  if (toggle) toggle.setAttribute("aria-expanded", String(!collapsed));
}

function toggleMapPanel() {
  const collapsed = document.documentElement.classList.toggle("map-collapsed");
  try {
    localStorage.setItem(MAP_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch (e) {}
  syncMapToggle();
}

syncMapToggle();

let isJebMode = false;

function toggleJebMode() {
  isJebMode = !isJebMode;
  const jebBtn = document.getElementById("btn-jeb");
  if (isJebMode) {
    if (jebBtn) {
      jebBtn.textContent = "⏪ Restore Reality";
      jebBtn.classList.add("active");
    }
    applyJebLandslide();
    showToast("👏 Please clap. (Jeb! sweeps Azeroth!)");
  } else {
    if (jebBtn) {
      jebBtn.textContent = "⚡ Jeb!";
      jebBtn.classList.remove("active");
    }
    const bToss = document.getElementById("bar-tossup");
    if (bToss) bToss.className = "ev-seg tossup";
    
    const mapOverlay = document.getElementById("jeb-map-overlay");
    if (mapOverlay) mapOverlay.style.display = "none";
    const inspMedia = document.getElementById("insp-jeb-media");
    if (inspMedia) inspMedia.style.display = "none";

    recalc();
    showToast("Reality restored: Alliance vs Horde battle resumed!");
  }
}

function applyJebLandslide() {
  // Show Map Cutout Overlay and Inspector Media
  const mapOverlay = document.getElementById("jeb-map-overlay");
  if (mapOverlay) mapOverlay.style.display = "flex";

  const inspMedia = document.getElementById("insp-jeb-media");
  if (inspMedia) inspMedia.style.display = "block";

  // Turn all SVG map zones to glowing gold
  AZEROTH_STATES.forEach(st => {
    const gEl = document.getElementById(`zone-${st.id}`);
    if (gEl) {
      const shape = gEl.querySelector("path, polygon, rect");
      if (shape) {
        shape.setAttribute("class", "zone-jeb");
      }
    }
  });

  // Turn progress bar 100% gold
  const bSolA = document.getElementById("bar-solid-alliance");
  const bLeanA = document.getElementById("bar-lean-alliance");
  const bToss = document.getElementById("bar-tossup");
  const bLeanH = document.getElementById("bar-lean-horde");
  const bSolH = document.getElementById("bar-solid-horde");

  if (bSolA) bSolA.style.width = "0%";
  if (bLeanA) bLeanA.style.width = "0%";
  if (bLeanH) bLeanH.style.width = "0%";
  if (bSolH) bSolH.style.width = "0%";
  if (bToss) {
    bToss.style.width = "100%";
    bToss.className = "ev-seg jeb-landslide";
  }

  const aTotalEl = document.getElementById("ev-alliance-total");
  const hTotalEl = document.getElementById("ev-horde-total");
  const targetEl = document.getElementById("ev-target-number");
  if (aTotalEl) aTotalEl.textContent = "0";
  if (hTotalEl) hTotalEl.textContent = "0";
  if (targetEl) targetEl.textContent = "43 / 43 JEB! (100% LANDSLIDE)";

  // Update Ticker
  const tickerEl = document.getElementById("ticker-text");
  if (tickerEl) {
    tickerEl.textContent = "⚡ BREAKING: Jeb! sweeps all 43 delegates across Kalimdor & Eastern Kingdoms! (Please clap 👏)";
  }

  // Update Inspector
  const nameEl = document.getElementById("insp-name");
  const subEl = document.getElementById("insp-sub");
  const evEl = document.getElementById("insp-ev");
  const statusEl = document.getElementById("insp-status");
  const marginEl = document.getElementById("insp-margin");
  const chipsEl = document.getElementById("insp-voters-chips");
  const loreEl = document.getElementById("insp-lore");
  if (nameEl) nameEl.textContent = "Jeb! Territory";
  if (subEl) subEl.textContent = "Kalimdor & Eastern Kingdoms • Total Landslide";
  if (evEl) evEl.textContent = "43 EV";
  if (statusEl) {
    statusEl.textContent = "👑 100% JEB!";
    statusEl.className = "insp-val tossup";
  }
  if (marginEl) {
    marginEl.textContent = "+43 (UNANIMOUS)";
    marginEl.className = "insp-val tossup";
  }
  if (chipsEl) {
    chipsEl.innerHTML = "";
    players.slice(0, 15).forEach(p => {
      const chip = document.createElement("span");
      chip.className = "voter-chip jeb";
      chip.textContent = `⚡ ${p.name} (Clapping)`;
      chipsEl.appendChild(chip);
    });
    if (players.length > 15) {
      const moreChip = document.createElement("span");
      moreChip.className = "voter-chip jeb";
      moreChip.textContent = `+${players.length - 15} more cheering members`;
      chipsEl.appendChild(moreChip);
    }
  }
  if (loreEl) {
    loreEl.textContent = '"An undeniable mandate across both Kalimdor and Eastern Kingdoms. A turtle in every pocket. Please clap."';
  }

  // Update Battleground cards
  const bgGrid = document.getElementById("bg-cards-grid");
  if (bgGrid) {
    bgGrid.innerHTML = "";
    const keySwingIds = ["HIL", "ASH", "STV", "ALT", "BAR"];
    keySwingIds.forEach(kid => {
      const st = AZEROTH_STATES.find(s => s.id === kid);
      if (!st) return;
      const card = document.createElement("div");
      card.className = "bg-card tossup";
      card.innerHTML = `
        <div class="bg-card-title">
          <span>⚡ ${st.name}</span>
          <span class="bg-card-ev">${st.ev} EV</span>
        </div>
        <div class="bg-card-status">CALLED FOR JEB!</div>
        <div class="bg-card-sub">100% Mandate (Please clap)</div>
      `;
      bgGrid.appendChild(card);
    });
  }
}
