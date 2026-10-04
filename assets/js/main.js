import { applyLang, className, detectLang, t } from "./i18n.js?v=20261004";
import {
  loadIndex, loadMeta, loadOperator, loadImage, spriteURL, theta,
} from "./gsvd.js?v=20261004";
import {
  angleColor, clear, createCospan, createDial, createHistogram,
  drawBlocks, drawLevelCurve, drawScatter, drawSpectrum,
} from "./viz.js?v=20261004";

/* MNIST pairs shown in the results table. Their numbers are read from the
   generated data/<slug>.json (tools/precompute.py, pooled centering), so the
   table always matches the playground. */
const RESULT_PAIRS = [
  ["1 vs 5", "mnist_1_5"], ["0 vs 7", "mnist_0_7"],
  ["3 vs 9", "mnist_3_9"], ["4 vs 9", "mnist_4_9"],
];
let resultRows = null;

let lang = detectLang();
const TAU_DEFAULT = 45;
const state = { slug: null, meta: null, op: null, testSprite: null, threshold: TAU_DEFAULT };

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
   H sprite — never the ~1 MB .op.json operator, which exists to score drawings. */
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

/** A colour chip for an angle. The number or label keeps an ink colour so it
    stays legible, while the hue beside it still carries the reading. */
function dot(deg) {
  const d = document.createElement("span");
  d.className = "angle-dot";
  d.style.background = angleColor(deg);
  return d;
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
    angOut.replaceChildren(dot(deg), document.createTextNode(`θ = ${deg.toFixed(1)}°`));
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
/* Brush width on the 280 px pad. A digit drawn ~200 px tall is scaled by
   0.1, so this gives ~2.8 px strokes, close to MNIST's. */
const BRUSH = 28;
let padCtx = null;
let padDirty = false;
let padFromSample = false;   // the pad holds a loaded test sample (see padToVector)

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
  padFromSample = false;
  padCtx.fillStyle = "#000";
  padCtx.fillRect(0, 0, PAD, PAD);
  padCtx.strokeStyle = "#fff";
  padCtx.lineWidth = BRUSH;
  padCtx.lineCap = "round";
  padCtx.lineJoin = "round";
}

/** Pad -> 28x28 vector.

    A test sample loaded into the pad is already MNIST-normalised and was
    drawn as 10x10 blocks, so it is read back by averaging each block: the
    untouched sample gives back its exact pixels, and strokes added on top
    stay where they were drawn.

    A free drawing is normalised the way MNIST was built: crop to the ink,
    scale the longest side to 20 px with an area average (plain canvas
    downscaling skips pixels and breaks thin strokes), paste into 28x28 and
    shift the centre of mass to the middle. */
function padToVector() {
  const src = padCtx.getImageData(0, 0, PAD, PAD).data;
  const at = (x, y) => src[(y * PAD + x) * 4] / 255;
  const BLOCK = PAD / 28;

  if (padFromSample) {
    const out = new Float32Array(784);
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        let sum = 0;
        for (let v = 0; v < BLOCK; v++) for (let u = 0; u < BLOCK; u++) sum += at(x * BLOCK + u, y * BLOCK + v);
        out[y * 28 + x] = sum / (BLOCK * BLOCK);
      }
    }
    return out;
  }

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

  // area average: each target pixel is the mean of an 8x8 grid of samples
  // spread over the source box it covers
  const SS = 8;
  const img = new Float32Array(784);
  const ox = Math.floor((28 - tw) / 2), oy = Math.floor((28 - th) / 2);
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      let sum = 0;
      for (let v = 0; v < SS; v++) {
        const sy = Math.min(maxY, Math.floor(minY + (ty + (v + 0.5) / SS) * bh / th));
        for (let u = 0; u < SS; u++) {
          const sx = Math.min(maxX, Math.floor(minX + (tx + (u + 0.5) / SS) * bw / tw));
          sum += at(sx, sy);
        }
      }
      img[(oy + ty) * 28 + ox + tx] = sum / (SS * SS);
    }
  }

  // centre of mass shift, as MNIST does
  let m = 0, mx = 0, my = 0;
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const v = img[y * 28 + x];
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
      out[y * 28 + x] = img[sy * 28 + sx];
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
  const name = className(deg < state.threshold ? state.meta.name_A : state.meta.name_B, lang);
  verdict.style.color = "var(--text-primary)";
  verdict.replaceChildren(dot(deg), document.createTextNode(name));
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
  padCtx.lineWidth = BRUSH;
  padCtx.lineCap = "round";
  padCtx.lineJoin = "round";
  padFromSample = true;
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
    labelRecoButton();
    setThreshold(state.threshold);
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
  histogram = makeHistogram();
  initThreshold();
  await selectPair(select.value);
}

/* ======================== decision threshold ======================== */

/* One decimal, with the reader's decimal separator. */
const fmtDeg = (v) => {
  const s = v.toFixed(1).replace(/\.0$/, "");
  return lang === "pt" ? s.replace(".", ",") : s;
};
const fmtPct = (x) => {
  const s = (x * 100).toFixed(1);
  return (lang === "pt" ? s.replace(".", ",") : s) + "%";
};
/* Accepts "42.3" or "42,3"; null unless it is a number in [0, 90]. */
function parseDeg(str) {
  const v = Number(String(str).trim().replace(",", "."));
  if (String(str).trim() === "" || !Number.isFinite(v) || v < 0 || v > 90) return null;
  return Math.round(v * 10) / 10;
}

function makeHistogram() {
  return createHistogram(document.getElementById("hist"), {
    onBin: showBin,
    threshold: state.threshold,
    labels: {
      theta: t("play.axisTheta", lang), count: t("play.axisCount", lang),
      threshold: t("play.tauShort", lang), fmt: fmtDeg,
    },
  });
}

function labelRecoButton() {
  const btn = document.getElementById("tau-reco");
  const reco = state.meta?.threshold?.recommended;
  btn.hidden = reco == null;
  if (reco != null) btn.textContent = `${t("play.tauReco", lang)} ${fmtDeg(reco)}°`;
}

function renderTauStats() {
  const out = document.getElementById("tau-stats");
  const meta = state.meta;
  if (!meta) { out.textContent = ""; return; }
  const thr = state.threshold;
  const okA = meta.angles_A.filter((a) => a < thr).length;
  const okB = meta.angles_B.filter((a) => a >= thr).length;
  const nA = meta.angles_A.length, nB = meta.angles_B.length;
  out.innerHTML = `${t("play.tauStatsAt", lang)} <strong>${fmtDeg(thr)}°</strong>: `
    + `${t("play.tauAcc", lang)} <strong>${fmtPct((okA + okB) / (nA + nB))}</strong> · `
    + `${t("play.tauPerClass", lang)}: ${className(meta.name_A, lang)} ${fmtPct(okA / nA)}, `
    + `${className(meta.name_B, lang)} ${fmtPct(okB / nB)}`;
}

function setThreshold(v, { syncInput = true } = {}) {
  state.threshold = v;
  const input = document.getElementById("tau-input");
  if (syncInput) input.value = fmtDeg(v);
  input.removeAttribute("aria-invalid");
  const reco = state.meta?.threshold?.recommended;
  document.getElementById("tau-reset").setAttribute("aria-pressed", String(v === TAU_DEFAULT));
  document.getElementById("tau-reco").setAttribute("aria-pressed", String(reco != null && v === reco));
  if (histogram) histogram.setThreshold(v);
  renderTauStats();
  scoreDrawing();
}

function initThreshold() {
  const input = document.getElementById("tau-input");
  input.addEventListener("input", () => {
    const v = parseDeg(input.value);
    if (v === null) { input.setAttribute("aria-invalid", "true"); return; }
    setThreshold(v, { syncInput: false });
  });
  // on commit, show the value actually in use (rounded, or the last valid one)
  input.addEventListener("change", () => setThreshold(parseDeg(input.value) ?? state.threshold));
  document.getElementById("tau-reco").addEventListener("click", () => {
    const reco = state.meta?.threshold?.recommended;
    if (reco != null) setThreshold(reco);
  });
  document.getElementById("tau-reset").addEventListener("click", () => setThreshold(TAU_DEFAULT));
}

/* ============================ static results ========================= */

async function renderResults() {
  if (!resultRows) {
    resultRows = await Promise.all(RESULT_PAIRS.map(async ([pair, slug]) => {
      const m = await loadMeta(slug);
      return { pair, accuracy: m.metrics.accuracy, cka: m.cka,
               f1a: m.metrics.f1_A, f1b: m.metrics.f1_B };
    }));
  }
  const tbody = document.querySelector("#results-table tbody");
  clear(tbody);
  resultRows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.pair}</td>`
      + `<td class="hi">${(r.accuracy * 100).toFixed(2)}%</td>`
      + `<td>${r.cka.toFixed(4)}</td>`
      + `<td>${r.f1a.toFixed(4)}</td>`
      + `<td>${r.f1b.toFixed(4)}</td>`;
    tbody.appendChild(tr);
  });
  drawScatter(document.getElementById("scatter"),
    resultRows.map((r) => ({ label: r.pair, cka: r.cka, accuracy: r.accuracy })),
    { x: t("results.axisCka", lang), y: t("results.axisAcc", lang) });
}

/* ======================== truncation section ========================= */

/* Everything here comes from data/truncation.json (tools/precompute.py):
   singular values of H for one pair, test histograms and metrics at each
   truncation level, and the mean validation AUC over all pairs. */
const trunc = { data: null, sprite: null, level: 0 };

const fmtNum = (v, d) => {
  const s = v.toFixed(d);
  return lang === "pt" ? s.replace(".", ",") : s;
};
const fill = (tpl, vals) => tpl.replace(/\{(\w+)\}/g, (_, k) => vals[k]);
const pct0 = (x) => `${Math.round(x * 100)}%`;
/* singular values span 1e2..1e-4: one decimal above 1, one significant digit below */
const fmtSigma = (v) => {
  const s = v >= 1 ? v.toFixed(1) : String(+v.toPrecision(1));
  return lang === "pt" ? s.replace(".", ",") : s;
};

function levelLabel(r) {
  if (r === 0) return t("trunc.noCut", lang);
  const p = r * 100;
  const s = p >= 1 ? String(Math.round(p)) : String(+p.toPrecision(1));
  return (lang === "pt" ? s.replace(".", ",") : s) + "%";
}

/** A 28x28 grayscale image (values 0..255) into a canvas. */
function paintDigit(canvas, px) {
  canvas.width = 28; canvas.height = 28;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(28, 28);
  px.forEach((v, i) => { img.data.set([v, v, v, 255], i * 4); });
  ctx.putImageData(img, 0, 0);
}

/** Singular direction i (0-based) from the sprite into a canvas. */
function paintDirection(canvas, i) {
  const { cols, cell } = trunc.data.sprite_dirs;
  canvas.width = cell; canvas.height = cell;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(trunc.sprite, (i % cols) * cell, Math.floor(i / cols) * cell, cell, cell, 0, 0, cell, cell);
}

function renderTruncExamples() {
  const host = document.getElementById("trunc-examples");
  clear(host);
  trunc.data.examples.forEach((ex) => {
    const box = document.createElement("div");
    box.className = "trunc-ex";
    const imgs = document.createElement("div");
    imgs.className = "trunc-ex-imgs";
    [["orig", "trunc.exOrig"], ["closed", "trunc.exClosed"]].forEach(([key, label]) => {
      const fig = document.createElement("figure");
      const c = document.createElement("canvas");
      paintDigit(c, ex[key]);
      const cap = document.createElement("figcaption");
      cap.textContent = t(label, lang);
      fig.append(c, cap);
      imgs.appendChild(fig);
    });
    const row = (label, vals, digits, unit, hot) =>
      `<tr><td>${t(label, lang)}</td>${vals.map((v, j) =>
        `<td class="${hot && j === 1 ? "hot" : ""}">${fmtNum(v, digits)}${unit}</td>`).join("")}</tr>`;
    const table = document.createElement("table");
    table.innerHTML =
      `<thead><tr><th></th><th>${t("trunc.exOrig", lang)}</th><th>${t("trunc.exClosed", lang)}</th></tr></thead>`
      + `<tbody>${row("trunc.exThetaPlain", ex.theta_plain, 1, "°", false)}`
      + `${row("trunc.exThetaCut", ex.theta_cut, 1, "°", false)}`
      + `${row("trunc.exNormPlain", ex.norm_plain, 1, "", true)}`
      + `${row("trunc.exNormCut", ex.norm_cut, 2, "", false)}</tbody>`;
    box.append(imgs, table);
    host.appendChild(box);
  });
}

function renderTruncStrips(kept, total) {
  const strip = (hostId, groups) => {
    const host = document.getElementById(hostId);
    clear(host);
    if (!groups.some((g) => g.length)) {
      const p = document.createElement("p");
      p.className = "note";
      p.textContent = t("trunc.noneDropped", lang);
      host.appendChild(p);
      return;
    }
    groups.forEach((g, gi) => {
      if (gi && g.length) {
        const gap = document.createElement("span");
        gap.className = "gap";
        gap.textContent = "…";
        host.appendChild(gap);
      }
      g.forEach((i) => {
        const fig = document.createElement("figure");
        const c = document.createElement("canvas");
        paintDirection(c, i);
        const cap = document.createElement("figcaption");
        const sig = trunc.data.sigma[i];
        cap.textContent = `σ ${fmtSigma(sig)}`;
        fig.append(c, cap);
        host.appendChild(fig);
      });
    });
  };
  const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, k) => a + k);
  const head = range(0, Math.min(3, kept));
  const tailKept = range(Math.max(head.length, kept - 3), kept);
  strip("trunc-kept", [head, tailKept]);
  const firstDrop = range(kept, Math.min(total, kept + 3));
  const lastDrop = range(Math.max(kept + firstDrop.length, total - 3), total);
  strip("trunc-dropped", [firstDrop, lastDrop]);
}

function renderTruncation() {
  const d = trunc.data;
  if (!d) return;
  const L = d.levels[trunc.level];
  const r = d.grid[trunc.level];
  const total = d.sigma.length;
  const chosen = d.grid.indexOf(d.chosen);

  document.getElementById("trunc-readout").innerHTML =
    `${t("trunc.sliderLabel", lang)}: <strong>${levelLabel(r)}</strong>${r ? ` ${t("trunc.cutOf", lang)}` : ""} · `
    + fill(t("trunc.readout", lang), { kept: L.kept, total, energy: fmtPct(L.energy) });

  drawSpectrum(document.getElementById("trunc-spectrum"), {
    sigma: d.sigma, kept: L.kept, cutValue: r * d.sigma[0],
    labels: {
      x: t("trunc.axisIndex", lang), y: t("trunc.axisSigma", lang),
      cut: `${t("trunc.cutLine", lang)} ${levelLabel(r)}`,
      fmt: (v) => (v >= 1 ? fmtNum(v, 0) : (lang === "pt" ? String(v).replace(".", ",") : String(v))),
      tip: (i, sig, k) => `${fill(t("trunc.tipDir", lang), { i, s: fmtSigma(sig) })} · `
        + t(k ? "trunc.tipKept" : "trunc.tipDropped", lang),
      aria: t("trunc.spectrumTitle", lang),
    },
  });
  renderTruncStrips(L.kept, total);

  drawLevelCurve(document.getElementById("trunc-auc"), {
    values: d.val_auc_mean.map((a) => 1 - a), ticks: d.grid.map(levelLabel), current: trunc.level, chosen,
    labels: {
      x: t("trunc.axisLevel", lang), y: t("trunc.axisMisordered", lang),
      fmtY: (v) => `${lang === "pt" ? String(+(v * 100).toPrecision(2)).replace(".", ",") : +(v * 100).toPrecision(2)}%`,
      chosen: t("trunc.chosen", lang),
      tip: (lev, v) => fill(t("trunc.tipLevel", lang), { level: lev, auc: fmtNum(1 - v, 4), err: fmtPct(v) }),
      aria: t("trunc.aucTitle", lang),
    },
  });

  const hist = createHistogram(document.getElementById("trunc-hist"), {
    threshold: TAU_DEFAULT,
    labels: {
      theta: t("play.axisTheta", lang), count: t("play.axisCount", lang),
      threshold: t("play.tauShort", lang), fmt: fmtDeg,
    },
  });
  hist.draw({
    hist_edges: d.hist_edges, hist_A: L.hist_A, hist_B: L.hist_B,
    name_A: className("Digit 4", lang), name_B: className("Digit 9", lang),
  }, null);
  document.getElementById("trunc-hist-stats").innerHTML = fill(t("trunc.histStats", lang), {
    auc: fmtNum(L.test_auc, 3), acc: fmtPct(L.test_acc45),
  });

  const def = d.levels[chosen];
  document.getElementById("trunc-dr1").textContent = fill(t("trunc.dr1", lang), {
    kept: def.kept, total, share: pct0(def.kept / total), energy: fmtPct(def.energy),
  });
  renderTruncExamples();
}

async function initTruncation() {
  try {
    const r = await fetch("data/truncation.json?v=20261004");
    if (!r.ok) throw new Error(`truncation.json: ${r.status}`);
    trunc.data = await r.json();
    trunc.sprite = await loadImage("data/truncation_dirs.png?v=20261004");
  } catch (err) {
    console.error(err);
    document.getElementById("truncation").hidden = true;
    return;
  }
  const slider = document.getElementById("trunc-slider");
  slider.max = String(trunc.data.grid.length - 1);
  trunc.level = trunc.data.grid.indexOf(trunc.data.chosen);
  slider.value = String(trunc.level);
  slider.addEventListener("input", () => { trunc.level = Number(slider.value); renderTruncation(); });
  renderTruncation();
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
  renderTruncation();
  relabelPairSelect("#pair-select");
  relabelPairSelect("#h-pair-select");
  renderMachine();
  if (state.meta) {
    histogram = makeHistogram();
    histogram.draw(localisedMeta(state.meta), null);
    document.getElementById("legend-a").textContent = className(state.meta.name_A, lang);
    document.getElementById("legend-b").textContent = className(state.meta.name_B, lang);
    labelRecoButton();
    setThreshold(state.threshold);
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
initTruncation();
initCite();
initMachine();
initPlayground();
