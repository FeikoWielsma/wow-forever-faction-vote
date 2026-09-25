/* =========================================================
   FINAL RESULTS PAGE
   Final tally, stats and awards from /api/state + /api/history.
   The race chart is rebuilt by walking the vote history backwards
   from the final roster.
   ========================================================= */

// election-map.js reads these globals in calculateElectionResults()
let players = [];
let votingMode = "onevote";

const FACTIONS = ["Horde", "Alliance", "Abstain"];
let settings = {};
let raceData = null;

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Same vote power as the main scoreboard (app.js recalc)
function votePower(p) {
  if (votingMode === "onevote") return (p.c || p.s || p.r) ? 1 : 0;
  return (p.c ? settings.w_classic : 0) + (p.s ? settings.w_sod : 0) + (p.r ? settings.w_retail : 0);
}

// SQLite CURRENT_TIMESTAMP is UTC without a zone: "YYYY-MM-DD HH:MM:SS"
function parseTs(ts) {
  if (!ts) return null;
  const d = new Date(ts.replace(" ", "T") + (ts.endsWith("Z") ? "" : "Z"));
  return isNaN(d.getTime()) ? null : d;
}

const fmtDay = d => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtWhen = d => d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const plural = (n, word, many) => `${n} ${n === 1 ? word : (many || word + "s")}`;
const isSwitch = e => (e.old_faction === "Horde" && e.new_faction === "Alliance") || (e.old_faction === "Alliance" && e.new_faction === "Horde");

function formatLead(margin) {
  // margin = Alliance − Horde
  if (margin > 0) return `Alliance +${margin}`;
  if (margin < 0) return `Horde +${-margin}`;
  return "Tied";
}

function formatDuration(ms) {
  const h = ms / 3600000;
  if (h < 1) return plural(Math.max(1, Math.round(ms / 60000)), "minute");
  if (h < 48) return plural(Math.round(h), "hour");
  return plural(Math.round(h / 24), "day");
}

async function init() {
  try {
    const [stateRes, histRes] = await Promise.all([fetch("/api/state"), fetch("/api/history?limit=100000")]);
    if (!stateRes.ok || !histRes.ok) throw new Error("API unavailable");
    const state = await stateRes.json();
    const history = await histRes.json();

    players = state.players;
    settings = state.settings;
    votingMode = settings.voting_mode || "onevote";
    document.getElementById("w-classic").value = settings.w_classic;
    document.getElementById("w-sod").value = settings.w_sod;
    document.getElementById("w-retail").value = settings.w_retail;

    // Oldest first; 'initial' rows are the seed baseline, not vote changes
    const events = history.filter(h => h.changed_by !== "initial").sort((a, b) => a.id - b.id);

    const tally = finalTally();
    const race = buildRace(events, tally);
    renderResult(tally);
    renderStats(events, race, tally);
    renderRaceChart(race);
    renderAwards(events, race, tally);
    renderFinalMap();
    renderRoll(events);
  } catch (err) {
    console.error("Failed to load results:", err);
    document.getElementById("hero-tagline").textContent = "The results could not be loaded. Try refreshing.";
  }
}

/* ---------- Final tally ---------- */
function finalTally() {
  const t = { Horde: 0, Alliance: 0, Abstain: 0 };
  const count = { Horde: 0, Alliance: 0, Abstain: 0 };
  players.forEach(p => {
    const w = votePower(p);
    if (!(p.faction in t)) return;
    t[p.faction] += w;
    if (w > 0) count[p.faction]++;
  });
  const margin = t.Alliance - t.Horde;
  const winner = margin > 0 ? "Alliance" : margin < 0 ? "Horde" : null;
  return { points: t, count, margin, winner, loser: winner === "Alliance" ? "Horde" : winner === "Horde" ? "Alliance" : null };
}

const TAGLINES = {
  Horde: "Lok'tar ogar! Victory or death, and this time it was victory. WoW Forever rolls Horde.",
  Alliance: "For the Alliance! The bells of Stormwind ring out. WoW Forever rolls Alliance.",
  Tie: "Neither banner flies. A perfect deadlock: the council must decide.",
};

function renderResult(tally) {
  const { points, count, margin, winner } = tally;
  const key = winner || "Tie";
  document.getElementById("hero").dataset.winner = key;
  document.body.dataset.winner = key;
  document.getElementById("hero-title").textContent = winner ? `Victory for the ${winner}` : "A Dead Heat";
  document.getElementById("hero-tagline").textContent = TAGLINES[key];
  document.title = `${winner ? winner + " Wins" : "Dead Heat"} | WoW Forever Faction Vote`;

  const decided = points.Horde + points.Alliance;
  const pct = v => decided > 0 ? ((v / decided) * 100).toFixed(1) : "0.0";
  const onevote = votingMode === "onevote";
  document.getElementById("res-alliance").textContent = points.Alliance;
  document.getElementById("res-horde").textContent = points.Horde;
  document.getElementById("res-alliance-sub").textContent = onevote ? `${plural(count.Alliance, "voter")} · ${pct(points.Alliance)}%` : `${pct(points.Alliance)}% of decided votes`;
  document.getElementById("res-horde-sub").textContent = onevote ? `${plural(count.Horde, "voter")} · ${pct(points.Horde)}%` : `${pct(points.Horde)}% of decided votes`;
  document.querySelector(".result-side.alliance").classList.toggle("winner", winner === "Alliance");
  document.querySelector(".result-side.horde").classList.toggle("winner", winner === "Horde");

  document.getElementById("res-margin").textContent = winner ? `+${Math.abs(margin)}` : "Even";
  document.getElementById("res-margin-sub").textContent = winner
    ? `${winner} by ${plural(Math.abs(margin), onevote ? "vote" : "point")}`
    : "Not a single vote between them";

  document.getElementById("bar-alliance").style.width = `calc(${pct(points.Alliance)}% - 1px)`;
  document.getElementById("bar-horde").style.width = `calc(${pct(points.Horde)}% - 1px)`;

  const abstainNames = players.filter(p => p.faction === "Abstain").length;
  const foot = [`${plural(players.length, "member")} on the final roster`];
  if (abstainNames) foot.push(`${abstainNames} abstained`);
  const uncounted = players.filter(p => p.faction !== "Abstain" && votePower(p) === 0).length;
  if (uncounted) foot.push(`${uncounted} without a counted vote`);
  foot.push(onevote ? "one person, one vote" : "era-weighted votes");
  document.getElementById("res-foot").textContent = foot.join(" · ");
}

/* ---------- Race reconstruction ---------- */
// Walk the history backwards from the final tally, undoing each change, to get
// the standing after every event. Removed players count as one vote each.
function buildRace(events, tally) {
  const powerById = new Map(players.map(p => [p.id, votePower(p)]));
  const power = e => powerById.has(e.player_id) ? powerById.get(e.player_id) : 1;

  const t = { ...tally.points };
  const after = new Array(events.length);
  for (let i = events.length - 1; i >= 0; i--) {
    after[i] = { ...t };
    const e = events[i], w = power(e);
    if (FACTIONS.includes(e.new_faction)) t[e.new_faction] -= w;
    if (FACTIONS.includes(e.old_faction)) t[e.old_faction] += w;
  }

  const points = [{ index: 0, event: null, tally: { ...t }, margin: t.Alliance - t.Horde, date: null }];
  events.forEach((e, i) => {
    points.push({ index: i + 1, event: e, tally: after[i], margin: after[i].Alliance - after[i].Horde, date: parseTs(e.timestamp) });
  });

  // Lead changes: the leader flips, ignoring ties in between
  let leadChanges = 0, ties = 0, lastSign = Math.sign(points[0].margin);
  for (let i = 1; i < points.length; i++) {
    const s = Math.sign(points[i].margin);
    if (s === 0 && Math.sign(points[i - 1].margin) !== 0) ties++;
    if (s !== 0) {
      if (lastSign !== 0 && s !== lastSign) leadChanges++;
      lastSign = s;
    }
  }

  // Time in front, between the first and last event
  const inFront = { Alliance: 0, Horde: 0, Tied: 0 };
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i].date, b = points[i + 1].date;
    if (!a || !b) continue;
    const who = points[i].margin > 0 ? "Alliance" : points[i].margin < 0 ? "Horde" : "Tied";
    inFront[who] += Math.max(0, b - a);
  }

  const margins = points.map(p => p.margin);
  return {
    points,
    leadChanges,
    ties,
    inFront,
    maxAlliance: Math.max(0, ...margins),
    maxHorde: Math.max(0, ...margins.map(m => -m)),
  };
}

/* ---------- By the numbers ---------- */
function renderStats(events, race, tally) {
  const grid = document.getElementById("stats-grid");
  const h2a = events.filter(e => e.old_faction === "Horde" && e.new_faction === "Alliance").length;
  const a2h = events.filter(e => e.old_faction === "Alliance" && e.new_faction === "Horde").length;
  const switchers = new Set(events.filter(isSwitch).map(e => e.player_id ?? e.player_name));
  const changed = new Set(events.map(e => e.player_id));
  const steadfast = players.filter(p => !changed.has(p.id)).length;

  const dates = events.map(e => parseTs(e.timestamp)).filter(Boolean);
  const first = dates[0], last = dates[dates.length - 1];

  const byDay = new Map();
  dates.forEach(d => {
    const k = d.toDateString();
    byDay.set(k, { date: d, n: (byDay.get(k)?.n || 0) + 1 });
  });
  const busiest = [...byDay.values()].sort((a, b) => b.n - a.n)[0];

  const totalFront = race.inFront.Alliance + race.inFront.Horde + race.inFront.Tied;
  let front = null;
  if (totalFront > 0) {
    const side = race.inFront.Horde >= race.inFront.Alliance ? "Horde" : "Alliance";
    front = { side, pct: Math.round((race.inFront[side] / totalFront) * 100) };
  }

  const net = h2a - a2h;
  const cards = [
    { cls: "teal", label: "Vote changes", num: events.length, sub: first && last ? `${fmtDay(first)} – ${fmtDay(last)}` : "No changes recorded" },
    { cls: "", label: "Switched sides", num: switchers.size, sub: `${plural(steadfast, "member")} never changed at all` },
    { cls: "alliance", label: "Horde → Alliance", num: h2a, sub: net > 0 ? `Net ${net} to the Alliance` : "defections" },
    { cls: "horde", label: "Alliance → Horde", num: a2h, sub: net < 0 ? `Net ${-net} to the Horde` : "defections" },
    { cls: "teal", label: "Lead changes", num: race.leadChanges, sub: race.ties ? `Tied ${plural(race.ties, "time")} along the way` : "Never tied along the way" },
    { cls: "horde", label: "Biggest Horde lead", num: race.maxHorde ? `+${race.maxHorde}` : "–", sub: race.maxHorde ? "at its peak" : "Horde never led" },
    { cls: "alliance", label: "Biggest Alliance lead", num: race.maxAlliance ? `+${race.maxAlliance}` : "–", sub: race.maxAlliance ? "at its peak" : "Alliance never led" },
    front
      ? { cls: front.side.toLowerCase(), label: "Time in front", num: `${front.pct}%`, sub: `${front.side} led for ${formatDuration(race.inFront[front.side])}` }
      : { cls: "", label: "Busiest day", num: busiest ? fmtDay(busiest.date) : "–", sub: busiest ? plural(busiest.n, "change") : "" },
  ];
  if (front && busiest) cards.push({ cls: "", label: "Busiest day", num: fmtDay(busiest.date), sub: plural(busiest.n, "change") });
  if (first && last) {
    const [n, unit] = formatDuration(last - first).split(" ");
    cards.push({ cls: "", label: "Campaign length", num: n, sub: `${unit} from first to last change` });
  }

  grid.innerHTML = cards.map(c => `
    <div class="stat-card ${c.cls}">
      <div class="stat-label">${escapeHtml(c.label)}</div>
      <div class="stat-num">${escapeHtml(c.num)}</div>
      <div class="stat-sub">${escapeHtml(c.sub)}</div>
    </div>`).join("");
}

/* ---------- Race chart ---------- */
function renderRaceChart(race) {
  raceData = race;
  drawRaceChart();
}

function drawRaceChart() {
  const wrap = document.getElementById("race-chart");
  const race = raceData;
  if (!race) return;
  if (race.points.length < 2) {
    wrap.innerHTML = `<div class="empty-state">No vote changes were recorded, so the lead never moved.</div>`;
    return;
  }

  const pts = race.points;
  const W = Math.max(320, wrap.clientWidth);
  const H = W < 560 ? 220 : 280;
  const pad = { l: 38, r: 92, t: 14, b: 26 };
  const top = Math.max(1, race.maxAlliance), bot = Math.max(1, race.maxHorde);
  const x = i => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
  const y = m => pad.t + ((top - m) / (top + bot)) * (H - pad.t - pad.b);
  const y0 = y(0);

  // Step line: the lead holds until the next change
  let d = `M${x(0)},${y(pts[0].margin)}`;
  for (let i = 1; i < pts.length; i++) d += ` H${x(i)} V${y(pts[i].margin)}`;
  const area = `${d} H${x(pts.length - 1)} V${y0} H${x(0)} Z`;

  const step = Math.max(1, Math.ceil((top + bot) / 8));
  let grid = "";
  for (let m = -bot; m <= top; m++) {
    if (m % step !== 0) continue;
    grid += `<line class="${m === 0 ? "race-zero" : "race-grid"}" x1="${pad.l}" x2="${W - pad.r}" y1="${y(m)}" y2="${y(m)}"/>`;
    grid += `<text class="race-axis" x="${pad.l - 8}" y="${y(m) + 4}" text-anchor="end">${m === 0 ? "0" : "+" + Math.abs(m)}</text>`;
  }

  const firstDate = pts[1].date, lastDate = pts[pts.length - 1].date;
  const xLabels = `
    <text class="race-axis" x="${x(1)}" y="${H - 6}" text-anchor="start">${firstDate ? escapeHtml(fmtDay(firstDate)) : "First change"}</text>
    <text class="race-axis" x="${x(pts.length - 1)}" y="${H - 6}" text-anchor="end">${lastDate ? escapeHtml(fmtDay(lastDate)) : "Last change"}</text>`;

  const end = pts[pts.length - 1];
  wrap.innerHTML = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" tabindex="0" role="img"
         aria-label="Lead over time: ${pts.length - 1} vote changes, final ${escapeHtml(formatLead(end.margin))}. Use arrow keys to step through changes.">
      <defs>
        <clipPath id="clip-above"><rect x="0" y="0" width="${W}" height="${y0}"/></clipPath>
        <clipPath id="clip-below"><rect x="0" y="${y0}" width="${W}" height="${H - y0}"/></clipPath>
      </defs>
      ${grid}
      <path class="race-area alliance" d="${area}" clip-path="url(#clip-above)"/>
      <path class="race-area horde" d="${area}" clip-path="url(#clip-below)"/>
      <path class="race-line" d="${d}"/>
      <circle class="race-dot" cx="${x(pts.length - 1)}" cy="${y(end.margin)}" r="4"/>
      <text class="race-end" x="${x(pts.length - 1) + 10}" y="${y(end.margin) + 4}">Final: ${escapeHtml(formatLead(end.margin))}</text>
      ${xLabels}
      <line class="race-cross" id="race-cross" y1="${pad.t}" y2="${H - pad.b}" visibility="hidden"/>
      <circle class="race-dot" id="race-hover-dot" r="5" visibility="hidden"/>
      <rect id="race-hit" x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}" fill="transparent"/>
    </svg>
    <div class="race-tip" id="race-tip" hidden></div>`;

  const svg = wrap.querySelector("svg");
  const cross = svg.querySelector("#race-cross");
  const dot = svg.querySelector("#race-hover-dot");
  const tip = wrap.querySelector("#race-tip");
  let current = pts.length - 1;

  function show(i) {
    current = i;
    const p = pts[i];
    cross.setAttribute("x1", x(i));
    cross.setAttribute("x2", x(i));
    cross.setAttribute("visibility", "visible");
    dot.setAttribute("cx", x(i));
    dot.setAttribute("cy", y(p.margin));
    dot.setAttribute("visibility", "visible");

    tip.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = formatLead(p.margin);
    tip.appendChild(strong);
    const line = text => { const div = document.createElement("div"); div.textContent = text; tip.appendChild(div); return div; };
    if (p.event) {
      line(`Change #${i}${p.date ? " · " + fmtWhen(p.date) : ""}`);
      const who = line("");
      const name = document.createElement("span");
      name.className = "tip-player";
      name.textContent = p.event.player_name;
      who.append(name, `: ${p.event.old_faction || "New"} → ${p.event.new_faction}`);
    } else {
      line("Before the first recorded change");
    }
    line(`Alliance ${p.tally.Alliance} · Horde ${p.tally.Horde}`);

    tip.hidden = false;
    const tw = tip.offsetWidth;
    const left = x(i) + 14 + tw > W ? x(i) - 14 - tw : x(i) + 14;
    tip.style.left = `${Math.max(0, left)}px`;
    tip.style.top = `${pad.t}px`;
  }
  function hide() {
    cross.setAttribute("visibility", "hidden");
    dot.setAttribute("visibility", "hidden");
    tip.hidden = true;
  }

  svg.addEventListener("pointermove", ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (W / r.width);
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (pts.length - 1));
    show(Math.min(pts.length - 1, Math.max(0, i)));
  });
  svg.addEventListener("pointerleave", hide);
  svg.addEventListener("focus", () => show(current));
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", ev => {
    if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
      ev.preventDefault();
      show(Math.min(pts.length - 1, Math.max(0, current + (ev.key === "ArrowRight" ? 1 : -1))));
    }
  });
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawRaceChart, 150);
});

/* ---------- Hall of fame ---------- */
function renderAwards(events, race, tally) {
  const awards = [];
  const names = list => list.length <= 3 ? list.join(", ") : `${list.slice(0, 3).join(", ")} +${list.length - 3}`;
  const when = e => { const d = parseTs(e.timestamp); return d ? ` on ${fmtWhen(d)}` : ""; };

  // Most changes by one player
  const perPlayer = new Map();
  events.forEach(e => {
    const k = e.player_id ?? e.player_name;
    const cur = perPlayer.get(k) || { name: e.player_name, n: 0, trail: [e.old_faction || "New"] };
    cur.n++;
    cur.name = e.player_name;
    cur.trail.push(e.new_faction);
    perPlayer.set(k, cur);
  });
  const ranked = [...perPlayer.values()].sort((a, b) => b.n - a.n);
  if (ranked.length && ranked[0].n > 1) {
    const top = ranked.filter(r => r.n === ranked[0].n);
    awards.push({
      icon: "🌀", title: "The Weathervane", name: names(top.map(r => r.name)),
      desc: top.length === 1
        ? `Changed their vote ${ranked[0].n} times: ${top[0].trail.join(" → ")}.`
        : `Each changed their vote ${ranked[0].n} times. Nobody spun faster.`,
    });
  }

  // First to cross the floor
  const firstSwitch = events.find(isSwitch);
  if (firstSwitch) {
    awards.push({
      icon: "🚪", title: "First Through the Portal", name: firstSwitch.player_name,
      desc: `The first to switch sides, ${firstSwitch.old_faction} → ${firstSwitch.new_faction}${when(firstSwitch)}.`,
    });
  }

  // The change that put the winner ahead for good
  if (tally.winner && events.length) {
    const sign = tally.winner === "Alliance" ? 1 : -1;
    const pts = race.points;
    let lastNot = -1;
    pts.forEach((p, i) => { if (Math.sign(p.margin) !== sign) lastNot = i; });
    if (lastNot === -1) {
      awards.push({
        icon: "🏁", title: "Wire to Wire", name: `The ${tally.winner}`,
        desc: `Led from the first recorded change to the last. The ${tally.loser} never got in front.`,
      });
    } else if (lastNot + 1 < pts.length && pts[lastNot + 1].event) {
      const e = pts[lastNot + 1].event;
      awards.push({
        icon: "👑", title: "The Kingmaker", name: e.player_name,
        desc: `${e.old_faction || "New"} → ${e.new_faction}${when(e)} put the ${tally.winner} ahead for good.`,
      });
    }
  }

  // Players who left and came back
  const roundTrips = [...perPlayer.values()].filter(r => r.n > 1 && r.trail[0] === r.trail[r.trail.length - 1] && r.trail.some(f => f !== r.trail[0]));
  if (roundTrips.length) {
    awards.push({
      icon: "🪃", title: "Prodigal Return", name: names(roundTrips.map(r => r.name)),
      desc: "Changed their vote, then changed it back. Right where they started.",
    });
  }

  // Deserted the losing side
  if (tally.winner) {
    const joined = new Set(events.filter(e => e.old_faction === tally.loser && e.new_faction === tally.winner).map(e => e.player_id));
    const bandwagon = players.filter(p => joined.has(p.id) && p.faction === tally.winner).map(p => p.name);
    if (bandwagon.length) {
      awards.push({
        icon: "🎺", title: "On the Bandwagon", name: names(bandwagon),
        desc: `Left the ${tally.loser} and ended up on the winning side.`,
      });
    }
  }

  // The very last change
  const lastEvent = events[events.length - 1];
  if (lastEvent) {
    awards.push({
      icon: "🔔", title: "The Last Word", name: lastEvent.player_name,
      desc: `The final recorded change: ${lastEvent.old_faction || "New"} → ${lastEvent.new_faction}${when(lastEvent)}.`,
    });
  }

  // Loyal to the end
  const changed = new Set(events.map(e => e.player_id));
  const loyal = players.filter(p => !changed.has(p.id) && p.faction === tally.winner);
  if (tally.winner && loyal.length) {
    awards.push({
      icon: "🛡️", title: "Never Wavered", name: plural(loyal.length, "loyalist"),
      desc: `Voted ${tally.winner} from the start and never touched their ballot.`,
    });
  }

  const grid = document.getElementById("awards-grid");
  if (!awards.length) {
    grid.innerHTML = `<div class="award"><div class="award-desc">A quiet vote: nobody changed their mind.</div></div>`;
    return;
  }
  grid.innerHTML = awards.map(a => `
    <div class="award">
      <span class="award-icon" aria-hidden="true">${a.icon}</span>
      <div class="award-title">${escapeHtml(a.title)}</div>
      <div class="award-name">${escapeHtml(a.name)}</div>
      <div class="award-desc">${escapeHtml(a.desc)}</div>
    </div>`).join("");
}

/* ---------- Final map ---------- */
function renderFinalMap() {
  const data = calculateElectionResults();
  const needed = Math.floor(data.totalEV / 2) + 1;
  document.getElementById("ev-alliance").textContent = data.totalAllianceEV;
  document.getElementById("ev-horde").textContent = data.totalHordeEV;

  const won = side => AZEROTH_STATES.filter(st => data.stateResults[st.id].winner === side).length;
  const sub = [`${data.totalEV} electoral votes across ${AZEROTH_STATES.length} districts, ${needed} to win.`];
  sub.push(`Alliance carried ${won("Alliance")}, Horde carried ${won("Horde")}`);
  if (data.totalTossupEV) sub[1] += `, ${plural(won("Tossup"), "district")} ended dead even`;
  document.getElementById("map-sub").textContent = sub.join(" ") + ".";

  const list = document.getElementById("district-list");
  list.replaceChildren();
  [...AZEROTH_STATES].sort((a, b) => b.ev - a.ev || a.name.localeCompare(b.name)).forEach(st => {
    const res = data.stateResults[st.id];
    const label = `${res.name}: ${res.statusLabel.toLowerCase()} (${formatLead(res.diff)})`;

    const gEl = document.getElementById(`zone-${st.id}`);
    const shape = gEl && gEl.querySelector("path, polygon, rect");
    if (shape) {
      shape.setAttribute("class", res.statusClass);
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = label;
      gEl.prepend(title);
    }

    const li = document.createElement("li");
    li.title = label;
    const key = document.createElement("span");
    key.className = `district-key ${res.statusClass}`;
    const name = document.createElement("span");
    name.className = "district-name";
    name.textContent = res.name;
    const ev = document.createElement("small");
    ev.textContent = `${res.ev} EV`;
    name.appendChild(ev);
    const margin = document.createElement("span");
    margin.className = "district-margin";
    margin.textContent = formatLead(res.diff);
    li.append(key, name, margin);
    list.appendChild(li);
  });
}

/* ---------- Final roll ---------- */
function renderRoll(events) {
  const switched = new Set(events.filter(isSwitch).map(e => e.player_id));
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

  FACTIONS.forEach(f => {
    const members = players.filter(p => p.faction === f).sort(byName);
    const box = document.getElementById(`roll-${f.toLowerCase()}`);
    box.replaceChildren(...members.map(p => {
      const chip = document.createElement("span");
      chip.className = "chip" + (switched.has(p.id) ? " switched" : "");
      chip.textContent = p.name;
      if (switched.has(p.id)) chip.title = "Switched sides during the vote";
      return chip;
    }));
    document.getElementById(`roll-${f.toLowerCase()}-count`).textContent = plural(members.length, "member");
    if (f === "Abstain") document.getElementById("roll-abstain-wrap").hidden = members.length === 0;
  });

  if (switched.size) {
    const note = document.createElement("div");
    note.className = "roll-note";
    note.textContent = "⇄ switched sides during the vote";
    document.querySelector(".roll-grid").after(note);
  }
}

init();
