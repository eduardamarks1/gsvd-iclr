/* Visual components. Every chart is plain SVG or canvas built here — no
   plotting library — so the page stays small and themable through CSS
   custom properties. */

const NS = "http://www.w3.org/2000/svg";

export const el = (name, attrs = {}, parent = null) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  if (parent) parent.appendChild(node);
  return node;
};

const css = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

/* --- shared tooltip ----------------------------------------------------- */

let tipEl = null;
export function tooltip() {
  if (!tipEl) {
    tipEl = document.createElement("div");
    tipEl.className = "tooltip";
    tipEl.setAttribute("role", "status");
    document.body.appendChild(tipEl);
  }
  return {
    show(html, x, y) {
      tipEl.innerHTML = html;
      tipEl.classList.add("show");
      const r = tipEl.getBoundingClientRect();
      const left = Math.min(Math.max(8, x + 14), window.innerWidth - r.width - 8);
      const top = Math.max(8, y - r.height - 12);
      tipEl.style.left = `${left}px`;
      tipEl.style.top = `${top}px`;
    },
    hide() { tipEl.classList.remove("show"); },
  };
}

/* --- diverging ramp: A (blue) -> neutral -> B (orange) ------------------ */

const hexToRgb = (h) => {
  const v = h.replace("#", "");
  const n = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));

/** theta in [0, 90] -> diverging colour with a neutral midpoint at 45. */
export function angleColor(deg) {
  const a = hexToRgb(css("--series-a"));
  const b = hexToRgb(css("--series-b"));
  const mid = hexToRgb(css("--neutral-mid"));
  const t = Math.min(1, Math.max(0, deg / 90));
  const rgb = t < 0.5 ? mix(a, mid, t * 2) : mix(mid, b, (t - 0.5) * 2);
  return `rgb(${rgb.join(",")})`;
}

/* ======================================================================
   Dial — the alignment angle as a needle on a 0..90 arc
   ====================================================================== */

export function createDial(host, { interactive = false, onChange = null } = {}) {
  // A quarter disc, not a half one: theta lives in [0, 90], so the arc spans
  // exactly 90 degrees and the needle sits at the angle it reports. The origin
  // is the corner of the first quadrant, the horizontal axis is "all A"
  // (theta = 0) and the vertical axis is "all B" (theta = 90).
  const W = 320, H = 300, ox = 44, oy = 206, R = 150;
  const svg = el("svg", {
    viewBox: `0 0 ${W} ${H}`, role: "img", class: "dial",
  });
  host.appendChild(svg);

  const pt = (deg, r = R) => {
    const rad = (deg / 180) * Math.PI;
    return [ox + r * Math.cos(rad), oy - r * Math.sin(rad)];
  };

  const defs = el("defs", {}, svg);
  const gid = `dialgrad-${Math.random().toString(36).slice(2, 8)}`;
  // gradientUnits userSpace so the ramp follows the arc, not the bounding box
  const grad = el("linearGradient", {
    id: gid, gradientUnits: "userSpaceOnUse",
    x1: ox + R, y1: oy, x2: ox, y2: oy - R,
  }, defs);
  for (let i = 0; i <= 10; i++) {
    el("stop", { offset: `${i * 10}%`, "stop-color": angleColor(i * 9) }, grad);
  }

  // the two axes the angle is measured between
  el("line", {
    x1: ox, y1: oy, x2: ox + R + 16, y2: oy,
    stroke: css("--border"), "stroke-width": 1,
  }, svg);
  el("line", {
    x1: ox, y1: oy, x2: ox, y2: oy - R - 16,
    stroke: css("--border"), "stroke-width": 1,
  }, svg);

  const [x0, y0] = pt(0), [x1, y1] = pt(90);
  el("path", {
    d: `M ${x0} ${y0} A ${R} ${R} 0 0 0 ${x1} ${y1}`,
    fill: "none", stroke: `url(#${gid})`, "stroke-width": 13,
    "stroke-linecap": "round",
  }, svg);

  // ticks and labels live outside the band, clear of the needle's sweep
  [0, 15, 30, 45, 60, 75, 90].forEach((d) => {
    const [ax, ay] = pt(d, R + 8), [bx, by] = pt(d, d === 45 ? R + 17 : R + 14);
    el("line", {
      x1: ax, y1: ay, x2: bx, y2: by,
      stroke: css("--border-strong"), "stroke-width": d === 45 ? 2 : 1,
    }, svg);
    const [tx, ty] = pt(d, R + 30);
    el("text", {
      x: tx, y: ty + 3.5, "text-anchor": "middle", "font-size": 10,
      fill: css("--text-muted"), "font-variant-numeric": "tabular-nums",
    }, svg).textContent = `${d}\u00B0`;
  });

  const needle = el("line", {
    x1: ox, y1: oy, x2: ox + R - 20, y2: oy,
    stroke: css("--text-primary"), "stroke-width": 3, "stroke-linecap": "round",
  }, svg);
  el("circle", {
    cx: ox, cy: oy, r: 6, fill: css("--surface-0"),
    stroke: css("--text-primary"), "stroke-width": 3,
  }, svg);

  // the readout sits under the quadrant, clear of the sweep
  const readout = el("text", {
    x: ox + R / 2, y: oy + 52, "text-anchor": "middle", "font-size": 34,
    "font-weight": 600, fill: css("--text-primary"),
    "font-variant-numeric": "tabular-nums", "font-family": "var(--font-display)",
  }, svg);
  const caption = el("text", {
    x: ox + R / 2, y: oy + 74, "text-anchor": "middle", "font-size": 11,
    fill: css("--text-muted"), "letter-spacing": "0.06em",
  }, svg);

  let value = 45;

  function render() {
    const [nx, ny] = pt(value, R - 20);
    needle.setAttribute("x2", nx);
    needle.setAttribute("y2", ny);
    readout.textContent = `${value.toFixed(1)}\u00B0`;
    svg.setAttribute("aria-label", `theta = ${value.toFixed(1)} degrees`);
  }

  function setValue(deg, label) {
    value = Math.min(90, Math.max(0, deg));
    caption.textContent = label || "";
    render();
  }

  if (interactive) {
    svg.style.cursor = "grab";
    svg.style.touchAction = "none";
    const fromEvent = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const py = ((ev.clientY - r.top) / r.height) * H;
      const deg = (Math.atan2(oy - py, px - ox) * 180) / Math.PI;
      return Math.min(90, Math.max(0, deg));
    };
    let dragging = false;
    const move = (ev) => {
      if (!dragging) return;
      ev.preventDefault();
      value = fromEvent(ev);
      render();
      if (onChange) onChange(value);
    };
    svg.addEventListener("pointerdown", (ev) => {
      dragging = true; try { svg.setPointerCapture(ev.pointerId); } catch { /* synthetic */ } move(ev);
    });
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", () => { dragging = false; });
    svg.addEventListener("pointercancel", () => { dragging = false; });
  }

  render();
  return { setValue, get value() { return value; }, svg };
}

/* ======================================================================
   Co-span demo — two 2-D "datasets", a draggable z, the two costs
   ====================================================================== */

export function createCospan(host, labels) {
  const W = 420, H = 320;
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  host.appendChild(wrap);

  const field = document.createElement("canvas");
  field.width = 168; field.height = 128;
  field.style.cssText =
    "position:absolute;inset:0;width:100%;height:auto;border-radius:10px;opacity:.62";
  wrap.appendChild(field);

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, style: "position:relative" });
  wrap.appendChild(svg);

  // the two "datasets": each a pair of columns in R^2
  const A = [[1.05, 0.62], [0.12, -0.40]];   // columns a1 = (1.05, .12), a2 = (.62, -.40)
  const B = [[0.10, -0.42], [0.98, 0.70]];   // b1 = (.10, .98), b2 = (-.42, .70)
  const SC = 96;                              // px per unit
  const ox = W / 2, oy = H / 2 + 10;
  const toPx = ([x, y]) => [ox + x * SC, oy - y * SC];
  const toWorld = (px, py) => [(px - ox) / SC, (oy - py) / SC];

  // min-norm coefficient cost ||M^+ z|| for an invertible 2x2
  const cost = (M, z) => {
    const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
    const x = (M[1][1] * z[0] - M[0][1] * z[1]) / det;
    const y = (-M[1][0] * z[0] + M[0][0] * z[1]) / det;
    return Math.hypot(x, y);
  };
  const thetaAt = (z) => {
    const a = cost(A, z), b = cost(B, z);
    return (Math.atan2(a, b) * 180) / Math.PI;
  };

  function paintField() {
    const ctx = field.getContext("2d");
    const img = ctx.createImageData(field.width, field.height);
    for (let j = 0; j < field.height; j++) {
      for (let i = 0; i < field.width; i++) {
        const [wx, wy] = toWorld((i / field.width) * W, (j / field.height) * H);
        const c = angleColor(thetaAt([wx, wy]));
        const m = c.match(/\d+/g);
        const k = (j * field.width + i) * 4;
        img.data[k] = +m[0]; img.data[k + 1] = +m[1]; img.data[k + 2] = +m[2];
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  const gridG = el("g", { class: "grid" }, svg);
  for (let v = -2; v <= 2; v += 0.5) {
    if (Math.abs(v) < 1e-9) continue;
    const [px] = toPx([v, 0]); const [, py] = toPx([0, v]);
    el("line", { x1: px, y1: 0, x2: px, y2: H, stroke: css("--grid"), "stroke-width": 1, opacity: 0.6 }, gridG);
    el("line", { x1: 0, y1: py, x2: W, y2: py, stroke: css("--grid"), "stroke-width": 1, opacity: 0.6 }, gridG);
  }
  el("line", { x1: 0, y1: oy, x2: W, y2: oy, stroke: css("--border-strong"), "stroke-width": 1 }, svg);
  el("line", { x1: ox, y1: 0, x2: ox, y2: H, stroke: css("--border-strong"), "stroke-width": 1 }, svg);

  const arrow = (v, color, name) => {
    const [x, y] = toPx(v);
    el("line", {
      x1: ox, y1: oy, x2: x, y2: y, stroke: color, "stroke-width": 2.5,
      "stroke-linecap": "round",
    }, svg);
    el("circle", { cx: x, cy: y, r: 4, fill: color, stroke: css("--surface-0"), "stroke-width": 2 }, svg);
    el("text", {
      x: x + (x > ox ? 8 : -8), y: y + (y > oy ? 14 : -6),
      "text-anchor": x > ox ? "start" : "end", "font-size": 12,
      "font-weight": 600, fill: color,
    }, svg).textContent = name;
  };
  arrow([A[0][0], A[1][0]], css("--series-a"), "a₁");
  arrow([A[0][1], A[1][1]], css("--series-a"), "a₂");
  arrow([B[0][0], B[1][0]], css("--series-b"), "b₁");
  arrow([B[0][1], B[1][1]], css("--series-b"), "b₂");

  const zLine = el("line", {
    x1: ox, y1: oy, x2: ox, y2: oy, stroke: css("--text-primary"),
    "stroke-width": 2, "stroke-dasharray": "4 3",
  }, svg);
  const zDot = el("circle", {
    r: 9, fill: css("--text-primary"), stroke: css("--surface-0"),
    "stroke-width": 3, cursor: "grab",
  }, svg);
  el("text", { id: "zlabel", "font-size": 13, "font-weight": 700, fill: css("--text-primary") }, svg);
  const zLabel = svg.querySelector("#zlabel");

  const bars = document.createElement("div");
  bars.className = "cospan-readout";
  bars.style.cssText = "margin-top:.9rem;display:grid;gap:.45rem;font-size:.85rem";
  host.appendChild(bars);
  bars.innerHTML = `
    <div style="display:flex;align-items:center;gap:.5rem">
      <span class="swatch a"></span><span style="flex:1;color:var(--text-secondary)" data-slot="la"></span>
      <span data-slot="ca" style="font-variant-numeric:tabular-nums;font-weight:600"></span>
    </div>
    <div style="display:flex;align-items:center;gap:.5rem">
      <span class="swatch b"></span><span style="flex:1;color:var(--text-secondary)" data-slot="lb"></span>
      <span data-slot="cb" style="font-variant-numeric:tabular-nums;font-weight:600"></span>
    </div>
    <div style="display:flex;align-items:center;gap:.5rem;border-top:1px solid var(--border);padding-top:.45rem">
      <span style="flex:1;color:var(--text-secondary)">θ(z)</span>
      <span data-slot="th" style="font-variant-numeric:tabular-nums;font-weight:700;font-size:1.1rem"></span>
    </div>`;
  const slot = (n) => bars.querySelector(`[data-slot="${n}"]`);

  let z = [0.95, 0.55];
  let onTheta = null;

  function render() {
    const [px, py] = toPx(z);
    zDot.setAttribute("cx", px); zDot.setAttribute("cy", py);
    zLine.setAttribute("x2", px); zLine.setAttribute("y2", py);
    zLabel.setAttribute("x", px + 12); zLabel.setAttribute("y", py - 10);
    zLabel.textContent = "z";
    const a = cost(A, z), b = cost(B, z), th = thetaAt(z);
    slot("ca").textContent = a.toFixed(2);
    slot("cb").textContent = b.toFixed(2);
    const th_el = slot("th");
    th_el.replaceChildren();
    const chip = document.createElement("span");
    chip.className = "angle-dot";
    chip.style.background = angleColor(th);
    th_el.append(chip, document.createTextNode(`${th.toFixed(1)}°`));
    if (onTheta) onTheta(th);
  }

  let dragging = false;
  const move = (ev) => {
    if (!dragging) return;
    ev.preventDefault();
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const py = ((ev.clientY - r.top) / r.height) * H;
    z = toWorld(px, py);
    render();
  };
  svg.addEventListener("pointerdown", (ev) => {
    dragging = true; try { svg.setPointerCapture(ev.pointerId); } catch { /* synthetic */ } move(ev);
  });
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerup", () => { dragging = false; });
  svg.addEventListener("pointercancel", () => { dragging = false; });
  svg.style.touchAction = "none";

  paintField();
  render();

  return {
    setLabels(la, lb) { slot("la").textContent = la; slot("lb").textContent = lb; },
    onTheta(fn) { onTheta = fn; render(); },
    repaint() { paintField(); render(); },
  };
}

/* ======================================================================
   Block structure of C and S
   ====================================================================== */

export function drawBlocks(host, blocks, labels) {
  clear(host);
  const { bl, r, br } = blocks;
  const sizes = [bl, r, br];

  /* Cells are deliberately EQUAL sized rather than proportional to the block
     sizes: br is often ~5% of the total, and a 5%-wide cell can hold neither
     its symbol nor its number. The real sizes are stated as text instead. */
  const CELL = 44, GRID = CELL * 3;
  const LAB = 36;            // room for "C ="
  const BRK = 9;             // bracket arm length
  const MAT = LAB + BRK + 4 + GRID + 4 + BRK;   // one whole matrix
  const GAP = 24, PAD = 8;   // PAD keeps "C =" and the 0 deg tick off the edge
  const W = PAD * 2 + MAT * 2 + GAP, TOP = 30, H = TOP + GRID + 70;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, host);

  // the shared block is where theta sweeps, so paint it as that sweep
  const defs = el("defs", {}, svg);
  const ramp = (id) => {
    const g = el("linearGradient", { id, x1: "0", x2: "1" }, defs);
    for (let i = 0; i <= 10; i++) {
      el("stop", { offset: `${i * 10}%`, "stop-color": angleColor(i * 9) }, g);
    }
    return `url(#${id})`;
  };
  const cellRamp = ramp("blockgrad");
  const barRamp = ramp("blockgrad-bar");

  const muted = css("--text-muted");
  const border = css("--border-strong");
  const fills = [css("--series-a"), cellRamp, css("--series-b")];
  // diagonal symbol per matrix: index 0 = C, 1 = S
  const diag = [["I", "C̃", "0"], ["0", "S̃", "I"]];
  const subs = ["r", "", "t"];

  [0, 1].forEach((mi) => {
    const ox = PAD + mi * (MAT + GAP);
    const gx = ox + LAB + BRK + 4, gy = TOP;

    el("text", {
      x: ox + LAB - 6, y: gy + GRID / 2 + 6, "text-anchor": "end",
      "font-size": 16, "font-weight": 700, fill: css("--text-primary"),
      "font-family": "var(--font-display)",
    }, svg).textContent = mi === 0 ? "C =" : "S =";

    // real brackets, drawn as polylines so they scale with the grid
    const bx0 = gx - 4, bx1 = gx + GRID + 4;
    [[bx0, BRK], [bx1, -BRK]].forEach(([x, arm]) => {
      el("polyline", {
        points: `${x + arm} ${gy - 4} ${x} ${gy - 4} ${x} ${gy + GRID + 4} ${x + arm} ${gy + GRID + 4}`,
        fill: "none", stroke: css("--text-primary"), "stroke-width": 1.6,
        "stroke-linecap": "round", "stroke-linejoin": "round",
      }, svg);
    });

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = gx + col * CELL, y = gy + row * CELL;
        const onDiag = row === col;
        const sym = onDiag ? diag[mi][row] : "0";
        const isZero = sym === "0";
        el("rect", {
          x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 5,
          fill: onDiag && !isZero ? fills[row] : "none",
          stroke: onDiag && !isZero ? "none" : border,
          "stroke-width": 1,
          "stroke-dasharray": onDiag ? null : "3 3",
          opacity: onDiag || !isZero ? 1 : 0.7,
        }, svg);

        // On the solid blue/orange cells plain white reads best; only the
        // gradient cells need a halo, because the ramp passes through a light
        // neutral in the middle where white would disappear.
        const onRamp = onDiag && !isZero && row === 1;
        const onSolid = onDiag && !isZero && row !== 1;
        const ink = isZero ? muted : onSolid ? "#fff" : "#111";
        const t = el("text", {
          x: x + CELL / 2, y: y + CELL / 2 + 6, "text-anchor": "middle",
          "font-size": 16, "font-family": "var(--font-display)",
          "font-weight": onDiag ? 700 : 400,
          fill: ink,
          style: onRamp
            ? "paint-order:stroke;stroke:rgba(255,255,255,.9);stroke-width:3.5px"
            : null,
        }, svg);
        t.textContent = sym;
        if (onDiag && subs[row]) {
          el("tspan", {
            "font-size": 10, dy: 4, fill: ink,
          }, t).textContent = subs[row];
        }
      }
    }

    // sizes sit above their own column, so each block keeps its number
    sizes.forEach((n, col) => {
      el("text", {
        x: gx + col * CELL + CELL / 2, y: gy - 12, "text-anchor": "middle",
        "font-size": 10, fill: muted, "font-variant-numeric": "tabular-nums",
      }, svg).textContent = n;
    });
  });

  /* One shared caption row: the middle block is the only one that carries an
     angle, so the ramp is explained once under the pair of matrices. */
  const cy = TOP + GRID + 22;
  el("rect", { x: PAD, y: cy, width: 116, height: 9, rx: 4.5, fill: barRamp }, svg);
  [["0°", PAD, "start"], ["90°", PAD + 116, "end"]].forEach(([txt, x, anchor]) => {
    el("text", {
      x, y: cy + 24, "font-size": 10, "text-anchor": anchor, fill: muted,
      "font-variant-numeric": "tabular-nums",
    }, svg).textContent = txt;
  });
  el("text", {
    x: PAD + 126, y: cy + 9, "font-size": 11, fill: css("--text-secondary"),
  }, svg).textContent = `${labels.shared}: C̃, S̃ · θ 0° → 90° (${r})`;

  // the two pure blocks named once, with their sizes
  const ly = cy + 32;
  let lx = PAD;
  [[fills[0], labels.a, bl], [fills[2], labels.b, br]].forEach(([fill, name, n]) => {
    el("rect", { x: lx, y: ly, width: 10, height: 10, rx: 2, fill }, svg);
    const txt = `${name} (${n})`;
    el("text", {
      x: lx + 15, y: ly + 9, "font-size": 11, fill: css("--text-secondary"),
    }, svg).textContent = txt;
    lx += 15 + txt.length * 6.2 + 20;
  });
}

/* ======================================================================
   Theta histogram — paired bars per bin, clickable
   ====================================================================== */

export function createHistogram(host, { onBin = null, labels, threshold = 45 }) {
  const W = 680, H = 300;
  const m = { top: 14, right: 12, bottom: 44, left: 52 };
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
  clear(host); host.appendChild(svg);
  const tip = tooltip();
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

  let state = null;
  let thr = threshold;
  let lastMarker = null;

  function draw(meta, marker) {
    clear(svg);
    const edges = meta.hist_edges;
    const nb = edges.length - 1;
    const maxCount = Math.max(...meta.hist_A, ...meta.hist_B) || 1;
    const bw = iw / nb;
    const y = (v) => m.top + ih - (v / maxCount) * ih;

    const g = el("g", {}, svg);

    // grid + y axis
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = (maxCount / ticks) * i;
      el("line", { x1: m.left, y1: y(v), x2: m.left + iw, y2: y(v), stroke: css("--grid"), "stroke-width": 1 }, g);
      el("text", {
        x: m.left - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 11,
        fill: css("--text-muted"), "font-variant-numeric": "tabular-nums",
      }, g).textContent = Math.round(v);
    }
    el("text", {
      x: 12, y: m.top + ih / 2, "font-size": 11, fill: css("--text-muted"),
      transform: `rotate(-90 12 ${m.top + ih / 2})`, "text-anchor": "middle",
    }, g).textContent = labels.count;

    // x axis
    el("line", { x1: m.left, y1: m.top + ih, x2: m.left + iw, y2: m.top + ih, stroke: css("--border-strong"), "stroke-width": 1 }, g);
    [0, 15, 30, 45, 60, 75, 90].forEach((d) => {
      const x = m.left + (d / 90) * iw;
      el("line", { x1: x, y1: m.top + ih, x2: x, y2: m.top + ih + 5, stroke: css("--border-strong"), "stroke-width": 1 }, g);
      el("text", {
        x, y: m.top + ih + 19, "text-anchor": "middle", "font-size": 11,
        fill: css("--text-muted"), "font-variant-numeric": "tabular-nums",
      }, g).textContent = `${d}°`;
    });
    el("text", {
      x: m.left + iw / 2, y: H - 6, "text-anchor": "middle", "font-size": 11,
      fill: css("--text-muted"),
    }, g).textContent = labels.theta;

    // bars: A left half, B right half of each bin, 2px surface gap
    const half = (bw - 3) / 2;
    for (let i = 0; i < nb; i++) {
      const x = m.left + i * bw;
      [["A", meta.hist_A[i], css("--series-a"), x + 1],
       ["B", meta.hist_B[i], css("--series-b"), x + 1 + half + 1]].forEach(
        ([, count, color, bx]) => {
          if (count <= 0) return;
          const h = m.top + ih - y(count);
          el("rect", {
            x: bx, y: y(count), width: half, height: h, rx: Math.min(3, half / 2),
            fill: color,
          }, g);
        });

      // full-height hit target
      const hit = el("rect", {
        x, y: m.top, width: bw, height: ih, fill: "transparent",
        cursor: onBin ? "pointer" : "default",
      }, g);
      const lo = edges[i], hi = edges[i + 1];
      const html =
        `<span class="tt-title">${lo.toFixed(0)}°–${hi.toFixed(0)}°</span>` +
        `<span class="tt-row"><span class="swatch a"></span>${meta.name_A}: <strong>${meta.hist_A[i]}</strong></span>` +
        `<span class="tt-row"><span class="swatch b"></span>${meta.name_B}: <strong>${meta.hist_B[i]}</strong></span>`;
      hit.addEventListener("pointerenter", (ev) => {
        tip.show(html, ev.clientX, ev.clientY);
        hit.setAttribute("fill", css("--surface-2"));
        hit.setAttribute("fill-opacity", "0.5");
      });
      hit.addEventListener("pointermove", (ev) => tip.show(html, ev.clientX, ev.clientY));
      hit.addEventListener("pointerleave", () => { tip.hide(); hit.setAttribute("fill", "transparent"); });
      if (onBin) hit.addEventListener("click", () => onBin(i, lo, hi));
    }

    // the 45 degree reference, dashed, only when the decision threshold moved
    const tg = el("g", { "pointer-events": "none" }, g);  // never steals bar clicks
    const x45 = m.left + 0.5 * iw;
    const xt = m.left + (thr / 90) * iw;
    if (Math.abs(thr - 45) > 1e-9) {
      el("line", {
        x1: x45, y1: m.top, x2: x45, y2: m.top + ih,
        stroke: css("--text-muted"), "stroke-width": 1.5, "stroke-dasharray": "5 4",
      }, tg);
      el("text", {
        x: thr > 45 ? x45 - 5 : x45 + 5, y: m.top + 12, "font-size": 10, fill: css("--text-muted"),
        "text-anchor": thr > 45 ? "end" : "start",
      }, tg).textContent = "45°";
    }
    // the decision threshold
    el("line", {
      x1: xt, y1: m.top, x2: xt, y2: m.top + ih,
      stroke: css("--text-secondary"), "stroke-width": 2,
    }, tg);
    el("text", {
      x: thr > 45 ? xt + 5 : xt - 5, y: m.top + 26, "font-size": 10.5, "font-weight": 600,
      fill: css("--text-secondary"), "text-anchor": thr > 45 ? "start" : "end",
      "font-variant-numeric": "tabular-nums",
      // halo in the card colour keeps the label readable over the bars
      stroke: css("--surface-1"), "stroke-width": 4, "paint-order": "stroke",
      "stroke-linejoin": "round",
    }, tg).textContent = `${labels.threshold || "threshold"} ${labels.fmt ? labels.fmt(thr) : thr.toFixed(1)}°`;

    // marker for the user's own sample
    state = { meta, g, y, maxCount };
    drawMarker(marker);
  }

  function setThreshold(v) {
    thr = v;
    if (state) draw(state.meta, lastMarker);
  }

  let markerG = null;
  function drawMarker(deg) {
    lastMarker = deg;
    if (markerG) { markerG.remove(); markerG = null; }
    if (deg === null || deg === undefined || !state) return;
    markerG = el("g", {}, svg);
    const x = m.left + (deg / 90) * iw;
    el("line", {
      x1: x, y1: m.top - 2, x2: x, y2: m.top + ih,
      stroke: css("--text-primary"), "stroke-width": 2.5,
    }, markerG);
    const lab = el("g", {}, markerG);
    const text = `${deg.toFixed(1)}°`;
    const wBox = text.length * 7 + 14;
    const bx = Math.min(Math.max(m.left, x - wBox / 2), m.left + iw - wBox);
    el("rect", {
      x: bx, y: m.top - 4, width: wBox, height: 19, rx: 5,
      fill: css("--text-primary"),
    }, lab);
    el("text", {
      x: bx + wBox / 2, y: m.top + 10, "text-anchor": "middle", "font-size": 11,
      "font-weight": 700, fill: css("--surface-0"),
      "font-variant-numeric": "tabular-nums",
    }, lab).textContent = text;
  }

  return { draw, setMarker: drawMarker, setThreshold };
}

/* ======================================================================
   Accuracy vs CKA scatter
   ====================================================================== */

export function drawScatter(host, points, labels) {
  clear(host);
  const W = 520, H = 330;
  const m = { top: 18, right: 22, bottom: 46, left: 56 };
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, host);
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
  const tip = tooltip();

  const xd = [0, 1], yd = [0.85, 1.0];
  const X = (v) => m.left + ((v - xd[0]) / (xd[1] - xd[0])) * iw;
  const Y = (v) => m.top + ih - ((v - yd[0]) / (yd[1] - yd[0])) * ih;

  for (let i = 0; i <= 3; i++) {
    const v = yd[0] + ((yd[1] - yd[0]) / 3) * i;
    el("line", { x1: m.left, y1: Y(v), x2: m.left + iw, y2: Y(v), stroke: css("--grid"), "stroke-width": 1 }, svg);
    el("text", {
      x: m.left - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": 11,
      fill: css("--text-muted"), "font-variant-numeric": "tabular-nums",
    }, svg).textContent = `${(v * 100).toFixed(0)}%`;
  }
  el("line", { x1: m.left, y1: m.top + ih, x2: m.left + iw, y2: m.top + ih, stroke: css("--border-strong"), "stroke-width": 1 }, svg);
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
    el("text", {
      x: X(v), y: m.top + ih + 19, "text-anchor": "middle", "font-size": 11,
      fill: css("--text-muted"), "font-variant-numeric": "tabular-nums",
    }, svg).textContent = v.toFixed(2);
  });
  el("text", {
    x: m.left + iw / 2, y: H - 8, "text-anchor": "middle", "font-size": 11,
    fill: css("--text-muted"),
  }, svg).textContent = labels.x;
  el("text", {
    x: 14, y: m.top + ih / 2, "font-size": 11, fill: css("--text-muted"),
    transform: `rotate(-90 14 ${m.top + ih / 2})`, "text-anchor": "middle",
  }, svg).textContent = labels.y;

  points.forEach((p) => {
    const cx = X(p.cka), cy = Y(p.accuracy);
    el("circle", {
      cx, cy, r: 7, fill: css("--series-a"),
      stroke: css("--surface-0"), "stroke-width": 2,
    }, svg);
    const right = cx < m.left + iw - 80;
    el("text", {
      x: cx + (right ? 12 : -12), y: cy + 4,
      "text-anchor": right ? "start" : "end", "font-size": 11.5,
      "font-weight": 600, fill: css("--text-primary"),
    }, svg).textContent = p.label;
    const hit = el("circle", { cx, cy, r: 16, fill: "transparent" }, svg);
    hit.addEventListener("pointerenter", (ev) => tip.show(
      `<span class="tt-title">${p.label}</span>` +
      `<span class="tt-row">${labels.y}: <strong>${(p.accuracy * 100).toFixed(1)}%</strong></span>` +
      `<span class="tt-row">CKA: <strong>${p.cka.toFixed(3)}</strong></span>`,
      ev.clientX, ev.clientY));
    hit.addEventListener("pointerleave", () => tip.hide());
  });
}

/* ======================================================================
   Singular values of H, log scale, with the truncation cut
   ====================================================================== */

/**
 * @param {number[]} sigma   singular values, strongest first
 * @param {number}   kept    how many survive the cut (sigma[kept-1] is the last kept)
 * @param {object}   labels  { x, y, cut, fmt(v) }
 */
export function drawSpectrum(host, { sigma, kept, cutValue, labels }) {
  clear(host);
  const W = 960, H = 300;
  const m = { top: 16, right: 14, bottom: 44, left: 56 };
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": labels.aria }, host);
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
  const tip = tooltip();
  const n = sigma.length;
  const lo = Math.floor(Math.log10(Math.min(...sigma))), hi = Math.ceil(Math.log10(sigma[0]));
  const X = (i) => m.left + (i / (n - 1)) * iw;
  const Y = (v) => m.top + ih - ((Math.log10(v) - lo) / (hi - lo)) * ih;

  for (let e = lo; e <= hi; e++) {
    el("line", { x1: m.left, y1: Y(10 ** e), x2: m.left + iw, y2: Y(10 ** e), stroke: css("--grid"), "stroke-width": 1 }, svg);
    el("text", {
      x: m.left - 8, y: Y(10 ** e) + 4, "text-anchor": "end", "font-size": 11,
      fill: css("--text-muted"), "font-variant-numeric": "tabular-nums",
    }, svg).textContent = labels.fmt(10 ** e);
  }
  el("line", { x1: m.left, y1: m.top + ih, x2: m.left + iw, y2: m.top + ih, stroke: css("--border-strong") }, svg);
  [1, 100, 200, 300, 400, 500].filter((i) => i <= n).forEach((i) => {
    el("text", {
      x: X(i - 1), y: m.top + ih + 18, "text-anchor": "middle", "font-size": 11,
      fill: css("--text-muted"), "font-variant-numeric": "tabular-nums",
    }, svg).textContent = i;
  });
  el("text", { x: m.left + iw / 2, y: H - 6, "text-anchor": "middle", "font-size": 11, fill: css("--text-muted") }, svg)
    .textContent = labels.x;
  el("text", {
    x: 12, y: m.top + ih / 2, "font-size": 11, fill: css("--text-muted"),
    transform: `rotate(-90 12 ${m.top + ih / 2})`, "text-anchor": "middle",
  }, svg).textContent = labels.y;

  // kept part in the accent, dropped part muted; one path each
  const path = (a, b) => sigma.slice(a, b).map((v, j) => `${j ? "L" : "M"}${X(a + j)},${Y(v)}`).join("");
  const base = m.top + ih;
  if (kept > 0) {
    el("path", { d: `${path(0, kept)}L${X(kept - 1)},${base}L${X(0)},${base}Z`, fill: css("--series-a-soft") }, svg);
    el("path", { d: path(0, kept), fill: "none", stroke: css("--series-a"), "stroke-width": 2 }, svg);
  }
  if (kept < n) {
    el("path", { d: path(Math.max(0, kept - 1), n), fill: "none", stroke: css("--neutral-mid"), "stroke-width": 2 }, svg);
  }

  // the cut: horizontal at the cutoff value, vertical at the last kept direction
  if (kept < n) {
    const xc = X(kept - 0.5), yc = Y(cutValue);
    el("line", { x1: m.left, y1: yc, x2: m.left + iw, y2: yc, stroke: css("--text-muted"), "stroke-width": 1.2, "stroke-dasharray": "5 4" }, svg);
    el("line", { x1: xc, y1: m.top, x2: xc, y2: base, stroke: css("--text-primary"), "stroke-width": 2 }, svg);
    el("text", {
      x: xc + 6, y: m.top + 12, "font-size": 11, "font-weight": 600, fill: css("--text-primary"),
      stroke: css("--surface-1"), "stroke-width": 4, "paint-order": "stroke", "stroke-linejoin": "round",
    }, svg).textContent = labels.cut;
  }

  // hover: nearest direction
  const hit = el("rect", { x: m.left, y: m.top, width: iw, height: ih, fill: "transparent" }, svg);
  hit.addEventListener("pointermove", (ev) => {
    const r = svg.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.round(((ev.clientX - r.left) / r.width * W - m.left) / iw * (n - 1))));
    tip.show(labels.tip(i + 1, sigma[i], i < kept), ev.clientX, ev.clientY);
  });
  hit.addEventListener("pointerleave", () => tip.hide());
}

/* ======================================================================
   A metric across the truncation levels (categorical x axis)
   ====================================================================== */

/* values on a log scale (e.g. an error rate), so both ends of a U are visible */
export function drawLevelCurve(host, { values, ticks, current, chosen, labels }) {
  clear(host);
  const W = 520, H = 270;
  const m = { top: 18, right: 16, bottom: 46, left: 56 };
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": labels.aria }, host);
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
  const tip = tooltip();
  const n = values.length;
  const lo = Math.floor(Math.log10(Math.min(...values))), hi = Math.ceil(Math.log10(Math.max(...values)));
  const X = (i) => m.left + (i / (n - 1)) * iw;
  const Y = (v) => m.top + ih - ((Math.log10(v) - lo) / (hi - lo)) * ih;

  for (let e = lo; e <= hi; e++) {
    const v = 10 ** e;
    el("line", { x1: m.left, y1: Y(v), x2: m.left + iw, y2: Y(v), stroke: css("--grid") }, svg);
    el("text", {
      x: m.left - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": 11,
      fill: css("--text-muted"), "font-variant-numeric": "tabular-nums",
    }, svg).textContent = labels.fmtY(v);
  }
  el("text", {
    x: 12, y: m.top + ih / 2, "font-size": 11, fill: css("--text-muted"),
    transform: `rotate(-90 12 ${m.top + ih / 2})`, "text-anchor": "middle",
  }, svg).textContent = labels.y;
  ticks.forEach((t, i) => {
    if (i % 2 && i !== chosen) return;   // every other tick, always the chosen one
    el("text", {
      x: X(i), y: m.top + ih + 18, "text-anchor": "middle", "font-size": 10.5,
      fill: css("--text-muted"), "font-variant-numeric": "tabular-nums",
    }, svg).textContent = t;
  });
  el("text", { x: m.left + iw / 2, y: H - 6, "text-anchor": "middle", "font-size": 11, fill: css("--text-muted") }, svg)
    .textContent = labels.x;

  el("path", {
    d: values.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(""),
    fill: "none", stroke: css("--series-a"), "stroke-width": 2,
  }, svg);
  values.forEach((v, i) => {
    el("circle", { cx: X(i), cy: Y(v), r: i === current ? 6.5 : 3.5, fill: i === current ? css("--text-primary") : css("--series-a"), stroke: css("--surface-1"), "stroke-width": 2 }, svg);
    const hit = el("circle", { cx: X(i), cy: Y(v), r: 12, fill: "transparent" }, svg);
    hit.addEventListener("pointermove", (ev) => tip.show(labels.tip(ticks[i], v), ev.clientX, ev.clientY));
    hit.addEventListener("pointerleave", () => tip.hide());
  });
  el("circle", { cx: X(chosen), cy: Y(values[chosen]), r: 10, fill: "none", stroke: css("--text-secondary"), "stroke-width": 1.5, "stroke-dasharray": "3 2" }, svg);
  el("text", {
    x: X(chosen), y: Y(values[chosen]) + 26, "text-anchor": "middle", "font-size": 11, "font-weight": 600,
    fill: css("--text-secondary"),
  }, svg).textContent = labels.chosen;
}
