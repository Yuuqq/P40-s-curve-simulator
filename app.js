const seedEl = document.getElementById("seed");
const rateEl = document.getElementById("rate");
const resistanceEl = document.getElementById("resistance");
const seedValEl = document.getElementById("seedVal");
const rateValEl = document.getElementById("rateVal");
const resistanceValEl = document.getElementById("resistanceVal");

const addCompareBtn = document.getElementById("addCompareBtn");
const clearCompareBtn = document.getElementById("clearCompareBtn");
const compareMetaEl = document.getElementById("compareMeta");

const statusEl = document.getElementById("status");
const inflectionTEl = document.getElementById("inflectionT");
const inflectionYEl = document.getElementById("inflectionY");
const saturationT90El = document.getElementById("saturationT90");

const chartHost = document.getElementById("chart");

const STORAGE_COMPARE = "p40_compare_groups_v1";

const SERIES_FALLBACKS = [
  "#A2402F",
  "#51724B",
  "#8C6A2F",
  "#3A2E20",
  "#7C2F22",
  "#6E5B41"
];

function token(name, fallback) {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  } catch (_e) {
    return fallback;
  }
}

function seriesColors() {
  return [
    token("--cinnabar", SERIES_FALLBACKS[0]),
    token("--verdigris", SERIES_FALLBACKS[1]),
    token("--gold", SERIES_FALLBACKS[2]),
    token("--ink", SERIES_FALLBACKS[3]),
    token("--accent-hover", SERIES_FALLBACKS[4]),
    token("--ink-secondary", SERIES_FALLBACKS[5])
  ];
}

function setStatus(text) {
  statusEl.textContent = `状态: ${text}`;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function fmtNum(n, digits = 2) {
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(digits);
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return "-";
  return `${(n * 100).toFixed(1)}%`;
}

function readNumber(el) {
  const v = Number(el.value);
  return Number.isFinite(v) ? v : 0;
}

function computeParams() {
  const seed = clamp(readNumber(seedEl), 1, 30) / 100;
  const rate = clamp(readNumber(rateEl), 1, 30);
  const resistance = clamp(readNumber(resistanceEl), 1, 30);

  // Keep the UI formula consistent with the on-page description.
  const k = rate / resistance;
  const x0 = 10 - seed * 8;
  return { seed, rate, resistance, k, x0, L: 1 };
}

function logistic(t, p) {
  // f(t) = L / (1 + e^{-k(t-x0)})
  const z = -p.k * (t - p.x0);
  const denom = 1 + Math.exp(z);
  return p.L / denom;
}

function computeKeyNodes(p) {
  const inflectionT = p.x0;
  const inflectionY = p.L / 2;
  const t90 = p.k > 0 ? p.x0 + Math.log(9) / p.k : Infinity;
  return { inflectionT, inflectionY, t90 };
}

function buildPoints(p, xMin, xMax, step) {
  const pts = [];
  for (let t = xMin; t <= xMax + 1e-9; t += step) {
    pts.push({ t, y: logistic(t, p) });
  }
  return pts;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPath(points, mapX, mapY) {
  if (!points.length) return "";
  const parts = [];
  points.forEach((pt, idx) => {
    const x = mapX(pt.t);
    const y = mapY(pt.y);
    parts.push(`${idx === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  });
  return parts.join(" ");
}

function saveCompareGroups(groups) {
  try {
    localStorage.setItem(STORAGE_COMPARE, JSON.stringify(groups.slice(-8)));
  } catch (_e) {}
}

function loadCompareGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_COMPARE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((g) => ({
        seed: Number(g.seed),
        rate: Number(g.rate),
        resistance: Number(g.resistance)
      }))
      .filter((g) => Number.isFinite(g.seed) && Number.isFinite(g.rate) && Number.isFinite(g.resistance));
  } catch (_e) {
    return [];
  }
}

let compareGroups = loadCompareGroups();

function renderCompareMeta() {
  compareMetaEl.textContent = `对比组: ${compareGroups.length}`;
}

function renderValues(p) {
  seedValEl.textContent = `${Math.round(p.seed * 100)}%`;
  rateValEl.textContent = String(Math.round(p.rate));
  resistanceValEl.textContent = String(Math.round(p.resistance));
}

function renderKeyNodes(p) {
  const { inflectionT, inflectionY, t90 } = computeKeyNodes(p);
  inflectionTEl.textContent = fmtNum(inflectionT, 2);
  inflectionYEl.textContent = fmtPct(inflectionY);
  saturationT90El.textContent = Number.isFinite(t90) ? fmtNum(t90, 2) : "-";
}

function renderChart(current, groups) {
  const width = 820;
  const height = 420;
  const pad = { l: 58, r: 18, t: 32, b: 56 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  const xMin = 0;
  const xMax = 20;
  const step = 0.25;

  const mapX = (t) => pad.l + (clamp(t, xMin, xMax) - xMin) / (xMax - xMin) * plotW;
  const mapY = (y) => pad.t + (1 - clamp(y, 0, 1)) * plotH;

  const colors = seriesColors();
  const inkSoft = token("--ink-secondary", "#6E5B41");
  const line = token("--line", "#D3C4A0");
  const paper = token("--bg", "#F0E6CF");
  const plot = token("--paper-hi", "#F7EFDA");
  const cinnabar = token("--cinnabar", "#A2402F");

  const gridLines = [];
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.t + (plotH * i) / 4;
    const pct = ((1 - i / 4) * 100).toFixed(0);
    gridLines.push(
      `<line x1="${pad.l}" y1="${y}" x2="${width - pad.r}" y2="${y}" stroke="${line}" />`
    );
    gridLines.push(
      `<text x="${pad.l - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="${inkSoft}">${escapeXml(pct)}%</text>`
    );
  }
  for (let i = 0; i <= 4; i += 1) {
    const x = pad.l + (plotW * i) / 4;
    const t = (xMin + ((xMax - xMin) * i) / 4).toFixed(0);
    gridLines.push(
      `<line x1="${x}" y1="${pad.t}" x2="${x}" y2="${height - pad.b}" stroke="${line}" />`
    );
    gridLines.push(
      `<text x="${x}" y="${height - pad.b + 18}" text-anchor="middle" font-size="12" fill="${inkSoft}">${escapeXml(t)}</text>`
    );
  }

  const series = [
    { label: "当前参数", p: current, color: colors[0], width: 3.2, dash: "" },
    ...groups.map((g, idx) => {
      const p = {
        seed: clamp(Number(g.seed), 1, 30) / 100,
        rate: clamp(Number(g.rate), 1, 30),
        resistance: clamp(Number(g.resistance), 1, 30)
      };
      const derived = {
        ...p,
        k: p.rate / p.resistance,
        x0: 10 - p.seed * 8,
        L: 1
      };
      return {
        label: `对比 #${idx + 1}`,
        p: derived,
        color: colors[(idx + 1) % colors.length],
        width: 2.2,
        dash: "6 6"
      };
    })
  ];

  const paths = series
    .map((s) => {
      const pts = buildPoints(s.p, xMin, xMax, step);
      const d = buildPath(pts, mapX, mapY);
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${s.dash}" />`;
    })
    .join("");

  const { inflectionT } = computeKeyNodes(current);
  const infX = mapX(inflectionT);
  const infLine = `<line x1="${infX}" y1="${pad.t}" x2="${infX}" y2="${height - pad.b}" stroke="${cinnabar}" stroke-opacity="0.55" stroke-dasharray="4 6" />`;
  const infLabel = `<text x="${infX}" y="${pad.t + 14}" text-anchor="middle" font-size="12" fill="${cinnabar}">拐点 t*</text>`;

  const legendItems = series
    .map((s, idx) => {
      const y = pad.t + 16 + idx * 18;
      return `
        <line x1="${pad.l + 8}" y1="${y - 4}" x2="${pad.l + 26}" y2="${y - 4}"
          stroke="${s.color}" stroke-width="${idx === 0 ? 3.2 : 2.2}" stroke-dasharray="${s.dash}" />
        <text x="${pad.l + 32}" y="${y}" font-size="12" fill="${inkSoft}">${escapeXml(s.label)}</text>
      `.trim();
    })
    .join("");

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" class="chartSvg" role="img" aria-label="S 曲线扩散模拟图">
      <rect x="0" y="0" width="${width}" height="${height}" rx="6" fill="${paper}"></rect>
      <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" rx="6" fill="${plot}" stroke="${line}"></rect>

      ${gridLines.join("\n")}
      ${infLine}
      ${infLabel}

      <g>${paths}</g>

      <text x="${(pad.l + width - pad.r) / 2}" y="${height - 10}" text-anchor="middle" font-size="12" fill="${inkSoft}">时间 t（0–20）</text>
      <text x="${pad.l}" y="16" font-size="12" fill="${inkSoft}">覆盖率</text>

      <g>${legendItems}</g>
    </svg>
  `.trim();

  chartHost.innerHTML = svg;
}

function update() {
  const p = computeParams();
  renderValues(p);
  renderKeyNodes(p);
  renderCompareMeta();
  renderChart(p, compareGroups);
  setStatus("已更新");
}

function currentSnapshot() {
  const seed = clamp(readNumber(seedEl), 1, 30);
  const rate = clamp(readNumber(rateEl), 1, 30);
  const resistance = clamp(readNumber(resistanceEl), 1, 30);
  return { seed, rate, resistance };
}

function addCompare() {
  const snap = currentSnapshot();
  compareGroups.unshift(snap);
  compareGroups = compareGroups.slice(0, 5);
  saveCompareGroups(compareGroups);
  renderCompareMeta();
  update();
  setStatus(`已加入对比组（共 ${compareGroups.length} 组）`);
}

function clearCompare() {
  compareGroups = [];
  saveCompareGroups(compareGroups);
  renderCompareMeta();
  update();
  setStatus("已清空对比组");
}

function bind() {
  [seedEl, rateEl, resistanceEl].forEach((el) => {
    el.addEventListener("input", () => {
      try {
        window.pmMetrics?.track?.("param_change", { control_id: el.id });
      } catch (_e) {}
      update();
    });
  });

  addCompareBtn.addEventListener("click", () => {
    try {
      window.pmMetrics?.track?.("compare_add", currentSnapshot());
    } catch (_e) {}
    addCompare();
  });

  clearCompareBtn.addEventListener("click", () => {
    try {
      window.pmMetrics?.track?.("compare_clear", {});
    } catch (_e) {}
    clearCompare();
  });

  window.addEventListener("resize", () => {
    // The SVG is viewBox-based, no expensive work here, but re-render keeps text crisp on some browsers.
    update();
  });

  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  themeQuery.addEventListener("change", update);
  new MutationObserver(update).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });
}

const DECORATIVE_EMOJI = /\p{Extended_Pictographic}/gu;

function stripDecorativeEmoji(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (parent && parent.classList.contains("arrow")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    DECORATIVE_EMOJI.lastIndex = 0;
    if (!DECORATIVE_EMOJI.test(node.nodeValue || "")) return;
    DECORATIVE_EMOJI.lastIndex = 0;
    const next = node.nodeValue.replace(DECORATIVE_EMOJI, "").replace(/[ \t]{2,}/g, " ");
    node.nodeValue = next.replace(/^\s+/, "");
  });
}

new MutationObserver((records) => {
  records.forEach((record) => {
    record.addedNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      const panels = [];
      if (node.matches?.(".pedagogy-panel, .flow-guide")) panels.push(node);
      node.querySelectorAll?.(".pedagogy-panel, .flow-guide").forEach((panel) => panels.push(panel));
      panels.forEach((panel) => {
        stripDecorativeEmoji(panel);
        if (panel.classList.contains("flow-guide")) panel.open = false;
      });
    });
  });
}).observe(document.body, { childList: true, subtree: true });

bind();
update();

