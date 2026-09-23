import { applyLang, className, detectLang, t } from "./i18n.js";
import {
  loadIndex, loadMeta, loadOperator, loadImage, spriteURL, theta,
} from "./gsvd.js";
import {
  angleColor, clear, createCospan, createDial, createHistogram,
  drawBlocks, drawScatter,
} from "./viz.js";

/* Published MNIST numbers, transcribed from the paper's metrics table.
   The playground recomputes its own from a fresh random draw; these are the
   ones to cite. */
const PUBLISHED = [
  { pair: "1 vs 5", accuracy: 0.9608, cka: 0.1147, f1a: 0.9597, f1b: 0.9618 },
  { pair: "0 vs 7", accuracy: 0.9719, cka: 0.2184, f1a: 0.9725, f1b: 0.9714 },
  { pair: "3 vs 9", accuracy: 0.9604, cka: 0.3355, f1a: 0.9614, f1b: 0.9592 },
  { pair: "4 vs 9", accuracy: 0.8987, cka: 0.7402, f1a: 0.9056, f1b: 0.8906 },
];

let lang = detectLang();
const state = { slug: null, meta: null, op: null, testSprite: null };

/* ======================= chrome: theme, language, nav ================== */

function initTheme() {
  const btn = document.getElementById("theme-toggle");
  const stored = (() => { try { return localStorage.getItem("gsvd-theme"); } catch { return null; } })();
  if (stored) document.documentElement.setAttribute("data-theme", stored);
  const label = () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark"
      || (!document.documentElement.hasAttribute("data-theme")
          && matchMedia("(prefers-color-scheme: dark)").matches);
    btn.textContent = dark ? "☾" : "☀";
  };
  label();
  btn.addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark"
      || (!document.documentElement.hasAttribute("data-theme")
          && matchMedia("(prefers-color-scheme: dark)").matches);
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("gsvd-theme", next); } catch { /* ignore */ }
    label();
    redrawAll();
  });
}

function initLang() {
  const btn = document.getElementById("lang-toggle");
  applyLang(lang);
  btn.addEventListener("click", () => {
    lang = lang === "en" ? "pt" : "en";
    applyLang(lang);
  });
  document.addEventListener("langchange", (ev) => {
    lang = ev.detail.lang;
    redrawAll();
  });
}

function initNav() {
  const links = [...document.querySelectorAll(".nav-links a")];
  const targets = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle(
        "active", a.getAttribute("href") === `#${e.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  targets.forEach((s) => obs.observe(s));
}

/* ============================ hero dial =============================== */

let heroDial = null;
function initHero() {
  const host = document.getElementById("hero-dial");
  clear(host);
  heroDial = createDial(host, {
    interactive: true,
    onChange: (v) => heroDial.setValue(v, dialLabel(v)),
  });
  heroDial.setValue(31, dialLabel(31));
}
const dialLabel = (v) => (v < 38 ? t("hero.dialA", lang)
  : v > 52 ? t("hero.dialB", lang) : t("hero.dialShared", lang));

/* ========================== co-span demo ============================== */

let cospan = null;
function initCospan() {
  const host = document.getElementById("cospan-demo");
  clear(host);
  cospan = createCospan(host, {});
  cospan.setLabels(t("idea.costA", lang), t("idea.costB", lang));
}

/* ====================== machine: the shared frame ===================== */

/* The machine section browses the shared frame with its own pair, so a reader
   can compare frames here without scrolling to the playground and without
   disturbing whatever pair it is showing. It needs only the metadata and the
   H sprite — never the ~1 MB .bin operator, which exists to score drawings. */
const hState = { slug: null, meta: null, sprite: null };

/** Option text shared by both pair selectors. */
const pairLabel = (nameA, nameB, slug) =>
  `${className(nameA, lang)} vs ${className(nameB, lang)}`
  + (slug.startsWith("fashion") ? "  ·  Fashion-MNIST" : "  ·  MNIST");

/** Fill a <select> from index.json, remembering the raw names for relabelling
    when the language changes. */
function fillPairSelect(select, index) {
  index.forEach((row) => {
    const o = document.createElement("option");
    o.value = row.slug;
    o.textContent = pairLabel(row.name_A, row.name_B, row.slug);
    o.dataset.nameA = row.name_A;
    o.dataset.nameB = row.name_B;
    select.appendChild(o);
  });
}

function relabelPairSelect(selector) {
  document.querySelectorAll(`${selector} option`).forEach((o) => {
    if (!o.dataset.nameA) return;
    o.textContent = pairLabel(o.dataset.nameA, o.dataset.nameB, o.value);
  });
}

async function selectHPair(slug) {
  const status = document.getElementById("h-status");
  status.textContent = t("machine.loading", lang);
  status.hidden = false;
  try {
    const meta = await loadMeta(slug);            // cached across both sections
    const sprite = await loadImage(spriteURL(slug, "H"));
    Object.assign(hState, { slug, meta, sprite });
    status.hidden = true;
    renderMachine();
  } catch (err) {
    console.error(err);
    status.innerHTML = t("play.error", lang);
    status.hidden = false;
  }
}

/** Everything in the machine section that depends on its own pair or on the
    current language: the block figure, the endpoint captions, the slider. */
function renderMachine() {
  const { meta } = hState;
  if (!meta) return;
  drawBlocks(document.getElementById("blocks-fig"), meta.blocks, {
    a: t("machine.blockA", lang),
    shared: t("machine.blockShared", lang),
    b: t("machine.blockB", lang),
  });
  document.querySelectorAll("[data-h-slot='nameA']").forEach((n) => { n.textContent = className(meta.name_A, lang); });
  document.querySelectorAll("[data-h-slot='nameB']").forEach((n) => { n.textContent = className(meta.name_B, lang); });
  renderHSlider();
}

async function initMachine() {
  const select = document.getElementById("h-pair-select");
  fillPairSelect(select, await loadIndex());
  select.value = "mnist_4_9";                     // the pair the prose describes
  select.addEventListener("change", () => selectHPair(select.value));
  await selectHPair(select.value);
}

function renderHSlider() {
  const { meta, sprite: hSprite } = hState;
  const canvas = document.getElementById("h-canvas");
  const slider = document.getElementById("h-slider");
  const idxOut = document.getElementById("h-index");
  const angOut = document.getElementById("h-angle");
  if (!meta || !hSprite) return;

  const n = meta.sprite_H.count;
  slider.max = n - 1;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const paint = () => {
    const i = +slider.value;
    const { cols, cell } = meta.sprite_H;
    const r = Math.floor(i / cols), c = i % cols;
    ctx.clearRect(0, 0, 28, 28);
    ctx.drawImage(hSprite, c * cell, r * cell, cell, cell, 0, 0, 28, 28);
    const deg = meta.angles_H[i];
    idxOut.textContent = `${t("machine.dirLabel", lang)} ${i + 1} ${t("machine.of", lang)} ${n}`;
    angOut.textContent = `θ = ${deg.toFixed(1)}°`;
    angOut.style.color = angleColor(deg);
  };
  slider.oninput = paint;
  if (slider.dataset.pair !== hState.slug) {
    slider.value = Math.floor(n / 2);      // open on the shared middle
    slider.dataset.pair = hState.slug;
  }
  paint();
}

/* ========================= drawing pad =============================== */

const PAD = 280;
let padCtx = null;
let padDirty = false;

function initPad() {
  const canvas = document.getElementById("draw-pad");
  canvas.width = PAD; canvas.height = PAD;
  padCtx = canvas.getContext("2d", { willReadFrequently: true });
  clearPad();

  let drawing = false;
  const pos = (ev) => {
    const r = canvas.getBoundingClientRect();
    return [((ev.clientX - r.left) / r.width) * PAD,
            ((ev.clientY - r.top) / r.height) * PAD];
  };
  const start = (ev) => {
    drawing = true;
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* synthetic pointer */ }
    const [x, y] = pos(ev);
    padCtx.beginPath();
    padCtx.moveTo(x, y);
    padCtx.lineTo(x + 0.1, y);
    padCtx.stroke();
    padDirty = true;
  };
  const move = (ev) => {
    if (!drawing) return;
    ev.preventDefault();
    const [x, y] = pos(ev);
    padCtx.lineTo(x, y);
    padCtx.stroke();
    scoreDrawing();
  };
  const end = () => { if (drawing) { drawing = false; scoreDrawing(); } };

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  document.getElementById("pad-clear").addEventListener("click", () => {
    clearPad(); padDirty = false; scoreDrawing();
  });
  document.getElementById("pad-random").addEventListener("click", showRandomSample);
}

function clearPad() {
  padCtx.fillStyle = "#000";
  padCtx.fillRect(0, 0, PAD, PAD);
  padCtx.strokeStyle = "#fff";
  padCtx.lineWidth = 22;
  padCtx.lineCap = "round";
  padCtx.lineJoin = "round";
}

/** Downsample the pad to a 28x28 MNIST-style vector: crop to the ink, scale
    the longest side to 20 px, and centre by centre of mass. */
function padToVector() {
  const src = padCtx.getImageData(0, 0, PAD, PAD).data;
  let minX = PAD, minY = PAD, maxX = -1, maxY = -1;
  for (let y = 0; y < PAD; y++) {
    for (let x = 0; x < PAD; x++) {
      if (src[(y * PAD + x) * 4] > 20) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const scale = 20 / Math.max(bw, bh);
  const tw = Math.max(1, Math.round(bw * scale)), th = Math.max(1, Math.round(bh * scale));

  const tmp = document.createElement("canvas");
  tmp.width = 28; tmp.height = 28;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.fillStyle = "#000"; tctx.fillRect(0, 0, 28, 28);
  tctx.drawImage(padCtx.canvas, minX, minY, bw, bh,
                 (28 - tw) / 2, (28 - th) / 2, tw, th);

  // centre of mass shift, as MNIST does
  const d = tctx.getImageData(0, 0, 28, 28).data;
  let m = 0, mx = 0, my = 0;
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const v = d[(y * 28 + x) * 4] / 255;
      m += v; mx += v * x; my += v * y;
    }
  }
  if (m === 0) return null;
  const dx = Math.round(13.5 - mx / m), dy = Math.round(13.5 - my / m);

  const out = new Float32Array(784);
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const sx = x - dx, sy = y - dy;
      if (sx < 0 || sx > 27 || sy < 0 || sy > 27) continue;
      out[y * 28 + x] = d[(sy * 28 + sx) * 4] / 255;
    }
  }
  return out;
}

/* ========================= scoring & readout ========================= */

let playDial = null;
let histogram = null;

function scoreDrawing() {
  const verdict = document.getElementById("verdict");
  if (!state.op) return;
  const z = padDirty ? padToVector() : null;
  if (!z) {
    playDial.setValue(45, "");
    histogram.setMarker(null);
    verdict.textContent = t("play.emptyVerdict", lang);
    verdict.style.color = "var(--text-muted)";
    return;
  }
  const deg = theta(state.op, z);
  playDial.setValue(deg, "");
  histogram.setMarker(deg);
  const name = className(deg <= 45 ? state.meta.name_A : state.meta.name_B, lang);
  verdict.textContent = name;
  verdict.style.color = angleColor(deg);
}

function showRandomSample() {
  const { meta, testSprite } = state;
  if (!meta || !testSprite) return;
  const total = meta.sprite_test.n_A + meta.sprite_test.n_B;
  drawSpriteToPad(Math.floor(Math.random() * total));
}

function drawSpriteToPad(i) {
  const { meta, testSprite } = state;
  const { cols, cell } = meta.sprite_test;
  const r = Math.floor(i / cols), c = i % cols;
  padCtx.fillStyle = "#000";
  padCtx.fillRect(0, 0, PAD, PAD);
  padCtx.imageSmoothingEnabled = false;
  padCtx.drawImage(testSprite, c * cell, r * cell, cell, cell, 0, 0, PAD, PAD);
  padCtx.imageSmoothingEnabled = true;
  padCtx.strokeStyle = "#fff";
  padCtx.lineWidth = 22;
  padCtx.lineCap = "round";
  padCtx.lineJoin = "round";
  padDirty = true;
  scoreDrawing();
}

/* ======================= histogram bin drill-down ==================== */

function showBin(binIndex, lo, hi) {
  const { meta, testSprite } = state;
  const host = document.getElementById("bin-strip");
  const title = document.getElementById("bin-title");
  const nA = meta.sprite_test.n_A;

  const picks = [];
  meta.angles_A.forEach((a, i) => { if (a >= lo && a < hi) picks.push([i, "A"]); });
  meta.angles_B.forEach((a, i) => { if (a >= lo && a < hi) picks.push([nA + i, "B"]); });

  title.innerHTML = `<strong>${picks.length}</strong> ${t("play.binOf", lang)} `
    + `<strong>${lo.toFixed(0)}°</strong> ${t("play.and", lang)} <strong>${hi.toFixed(0)}°</strong>`;

  const MAXW = 24;
  const shown = picks.slice(0, MAXW * 3);
  const cols = MAXW, rows = Math.max(1, Math.ceil(shown.length / cols));
  const canvas = host;
  canvas.width = cols * 28;
  canvas.height = rows * 28 + (rows ? 4 * rows : 0);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { cols: sc, cell } = meta.sprite_test;
  shown.forEach(([idx, side], k) => {
    const r = Math.floor(k / cols), c = k % cols;
    const sr = Math.floor(idx / sc), scl = idx % sc;
    const y = r * 32;
    ctx.drawImage(testSprite, scl * cell, sr * cell, cell, cell, c * 28, y, 28, 28);
    ctx.fillStyle = side === "A"
      ? getComputedStyle(document.documentElement).getPropertyValue("--series-a")
      : getComputedStyle(document.documentElement).getPropertyValue("--series-b");
    ctx.fillRect(c * 28, y + 28, 28, 3);
  });

  canvas.hidden = false;
  canvas.dataset.bin = binIndex;
  canvas.onclick = (ev) => {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - r.left) / r.width) * cols);
    const y = Math.floor(((ev.clientY - r.top) / r.height) * rows);
    const k = y * cols + x;
    if (shown[k]) drawSpriteToPad(shown[k][0]);
  };
}

/** A shallow copy whose class names are in the reader's language; the charts
    render names verbatim. */
const localisedMeta = (meta) => ({
  ...meta,
  name_A: className(meta.name_A, lang),
  name_B: className(meta.name_B, lang),
});

/* ============================ pair loading =========================== */

async function selectPair(slug) {
  const status = document.getElementById("play-status");
  status.textContent = t("play.loading", lang);
  status.hidden = false;
  try {
    const meta = await loadMeta(slug);
    const [op, testSprite] = await Promise.all([
      loadOperator(slug, meta),
      loadImage(spriteURL(slug, "test")),
    ]);
    Object.assign(state, { slug, meta, op, testSprite });
    status.hidden = true;

    histogram.draw(localisedMeta(meta), null);
    document.getElementById("legend-a").textContent = className(meta.name_A, lang);
    document.getElementById("legend-b").textContent = className(meta.name_B, lang);
    clearPad(); padDirty = false;
    scoreDrawing();
    document.getElementById("bin-title").textContent = t("play.binHint", lang);
    const strip = document.getElementById("bin-strip");
    strip.getContext("2d").clearRect(0, 0, strip.width, strip.height);
    strip.hidden = true;
  } catch (err) {
    console.error(err);
    status.innerHTML = t("play.error", lang);
    status.hidden = false;
  }
}

async function initPlayground() {
  const select = document.getElementById("pair-select");
  fillPairSelect(select, await loadIndex());
  select.value = "mnist_4_9";
  select.addEventListener("change", () => selectPair(select.value));

  playDial = createDial(document.getElementById("play-dial"), {});
  histogram = createHistogram(document.getElementById("hist"), {
    onBin: showBin,
    labels: { theta: t("play.axisTheta", lang), count: t("play.axisCount", lang) },
  });
  await selectPair(select.value);
}

/* ============================ static results ========================= */

function renderResults() {
  const tbody = document.querySelector("#results-table tbody");
  clear(tbody);
  PUBLISHED.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.pair}</td>`
      + `<td class="hi">${(r.accuracy * 100).toFixed(2)}%</td>`
      + `<td>${r.cka.toFixed(4)}</td>`
      + `<td>${r.f1a.toFixed(4)}</td>`
      + `<td>${r.f1b.toFixed(4)}</td>`;
    tbody.appendChild(tr);
  });
  drawScatter(document.getElementById("scatter"),
    PUBLISHED.map((r) => ({ label: r.pair, cka: r.cka, accuracy: r.accuracy })),
    { x: t("results.axisCka", lang), y: t("results.axisAcc", lang) });
}

/* ============================== citation ============================= */

function initCite() {
  const btn = document.getElementById("copy-bib");
  btn.addEventListener("click", async () => {
    const text = document.getElementById("bibtex").textContent;
    try {
      await navigator.clipboard.writeText(text);
      const old = btn.textContent;
      btn.textContent = t("cite.copied", lang);
      setTimeout(() => { btn.textContent = old; }, 1600);
    } catch { /* clipboard blocked */ }
  });
}

/* ============================== redraw =============================== */

function redrawAll() {
  initHero();
  initCospan();
  renderResults();
  relabelPairSelect("#pair-select");
  relabelPairSelect("#h-pair-select");
  renderMachine();
  if (state.meta) {
    histogram = createHistogram(document.getElementById("hist"), {
      onBin: showBin,
      labels: { theta: t("play.axisTheta", lang), count: t("play.axisCount", lang) },
    });
    histogram.draw(localisedMeta(state.meta), null);
    document.getElementById("legend-a").textContent = className(state.meta.name_A, lang);
    document.getElementById("legend-b").textContent = className(state.meta.name_B, lang);
    scoreDrawing();
  }
}

/* =============================== boot =============================== */

initLang();
initTheme();
initNav();
initHero();
initCospan();
initPad();
renderResults();
initCite();
initMachine();
initPlayground();
