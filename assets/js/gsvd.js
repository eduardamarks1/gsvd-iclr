/* Loading and evaluation of the precomputed GSVD frames.

   The decomposition itself runs offline in `tools/precompute.py` through the
   validated `gsvdlib` pipeline. What ships here is the operator

       P = pinv(H')   (k x d, float16)   plus the cosine/sine vectors c, s

   and the only thing this file computes is the closed form

       theta(z) = atan2( || s .* (P z) || , || c .* (P z) || )

   which matches gsvdlib's own angles to within 0.02 degrees. */

const DATA = "data/";

/* --- IEEE 754 half precision -> Float32, via a 65536-entry lookup ------- */

const HALF_TO_FLOAT = (() => {
  const table = new Float32Array(65536);
  const buf = new ArrayBuffer(4);
  const f32 = new Float32Array(buf);
  const u32 = new Uint32Array(buf);
  for (let h = 0; h < 65536; h++) {
    const sign = (h & 0x8000) << 16;
    let exp = (h & 0x7c00) >> 10;
    let frac = h & 0x03ff;
    if (exp === 0) {
      if (frac === 0) {
        u32[0] = sign;                       // +/- zero
      } else {
        // subnormal: renormalize
        exp = 1;
        while ((frac & 0x0400) === 0) { frac <<= 1; exp--; }
        frac &= 0x03ff;
        u32[0] = sign | ((exp + 112) << 23) | (frac << 13);
      }
    } else if (exp === 0x1f) {
      u32[0] = sign | 0x7f800000 | (frac << 13);   // Inf / NaN
    } else {
      u32[0] = sign | ((exp + 112) << 23) | (frac << 13);
    }
    table[h] = f32[0];
  }
  return table;
})();

function decodeHalf(buffer, byteOffset, count) {
  const src = new Uint16Array(buffer, byteOffset, count);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = HALF_TO_FLOAT[src[i]];
  return out;
}

/* --- pair loading ------------------------------------------------------- */

const cache = new Map();

export async function loadIndex() {
  const r = await fetch(DATA + "index.json");
  if (!r.ok) throw new Error("index.json: " + r.status);
  return r.json();
}

/** Metadata + histograms + sprites. Small (~20 KB); loaded per pair. */
export async function loadMeta(slug) {
  const key = "meta:" + slug;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const r = await fetch(`${DATA}${slug}.json`);
      if (!r.ok) throw new Error(`${slug}.json: ${r.status}`);
      return r.json();
    })());
  }
  return cache.get(key);
}

/** The scoring operator. Heavier (~0.5-1 MB); only needed to score new input. */
export async function loadOperator(slug, meta) {
  const key = "op:" + slug;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      // Base64 inside JSON rather than a raw .bin: corporate proxies often
      // block application/octet-stream downloads but let JSON through.
      const r = await fetch(`${DATA}${slug}.op.json`);
      if (!r.ok) throw new Error(`${slug}.op.json: ${r.status}`);
      const bytes = Uint8Array.from(atob((await r.json()).data), (ch) => ch.charCodeAt(0));
      const buf = bytes.buffer;
      const { k, d } = meta;
      const P = decodeHalf(buf, 0, k * d);
      const off = k * d * 2;
      const c = new Float32Array(buf.slice(off, off + k * 4));
      const s = new Float32Array(buf.slice(off + k * 4, off + k * 8));
      return { P, c, s, k, d };
    })());
  }
  return cache.get(key);
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image: " + src));
    img.src = src;
  });
}

export const spriteURL = (slug, which) => `${DATA}${slug}_${which}.png`;

/* --- the angle ---------------------------------------------------------- */

/**
 * theta(z) in degrees for a single sample.
 * @param {Float32Array} z  length d, pixel values in [0, 1]
 */
export function theta(op, z) {
  const { P, c, s, k, d } = op;
  let sumA = 0, sumB = 0;
  for (let i = 0; i < k; i++) {
    const row = i * d;
    let ci = 0;
    for (let j = 0; j < d; j++) ci += P[row + j] * z[j];
    const a = c[i] * ci, b = s[i] * ci;
    sumA += a * a;
    sumB += b * b;
  }
  return (Math.atan2(Math.sqrt(sumB), Math.sqrt(sumA)) * 180) / Math.PI;
}
