"""Precompute the browser-side artifacts for the GSVD alignment-angle site.

Everything the site shows comes from `gsvdlib` (the validated pipeline), never
from a second implementation. The decomposition runs here, offline; the browser
only evaluates the cheap closed form

    theta(z) = atan2( || s .* (P z - m) || , || c .* (P z - m) || ),
    P = pinv(H', rcond),  m = P mu

where mu is the pooled mean of the training columns of A and B (gsvdlib's
default centering: A, B and every new sample z share one frame) and the
pseudo-inverse is truncated at gsvdlib's DEFAULT_RCOND, as theta_angles does. This is exact
to ~1e-9 against `gsvdlib.classify.theta_angles` on z - mu, up to the float16
quantization of P used for transport (reported per pair as transport error).

Per pair we emit:
  <slug>.op.json  {"data": base64 of float16 P (k x 784), then float32 c,
                  then float32 s, then float32 m = P16 mu}; base64 because
                  corporate proxies often block raw binary downloads
  <slug>.json   metrics, histograms, per-test-sample angles, sprite layout
  <slug>_test.png     sprite with the test images (row-major, 28x28 cells)
  <slug>_H.png        sprite with the reconstructed H directions

plus, for the "how many directions" section (one pair, MNIST 4 vs 9):
  truncation.json      singular values of H, metrics per truncation level,
                       validation AUC per level (mean over all 8 pairs) and
                       the closed-top 4 example
  truncation_dirs.png  sprite with the singular directions of H, strongest first
"""

from __future__ import annotations

import base64
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from gsvdlib import FashionMNISTDataset, MNISTDataset, prepare_data
from gsvdlib.angles import get_nonzero_per_column
from gsvdlib.blocks import to_intersection
from gsvdlib.classify import DEFAULT_RCOND, linear_cka, metrics_from_angles, theta_angles
from gsvdlib.datasets import balanced_count, center, sample_pair

OUT = Path(__file__).resolve().parent.parent / "data"
N_A, N_B = 900, 800
BASE_SEED, TEST_SEED = 1234, 4321
N_VAL = 1000                # held-out training images per class for the threshold
N_BINS = 45                 # 2-degree bins over [0, 90]
MAX_SPRITE = 1200           # test images kept per side for the drill-down
SPRITE_COLS = 40

# truncation levels shown in the "how many directions" section (fraction of s_max)
TRUNC_GRID = (0.0, 1e-4, 1e-3, 1e-2, 3e-2, 5e-2, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5)
TRUNC_PAIR = ("mnist", 4, 9)
TRUNC_EXAMPLES = (("A", 1), ("B", 2), ("B", 4))  # test digits that get the stray dot
TRUNC_DOT = (24, 3)         # pixel (row, col) of the dot, near the bottom-left corner

MNIST_PAIRS = [(1, 5), (0, 7), (4, 9), (3, 9)]
FASHION_PAIRS = [(0, 4), (2, 3), (7, 9), (0, 7)]


def sprite(images: np.ndarray, path: Path, cols: int = SPRITE_COLS) -> dict:
    """Pack (784, n) columns in [0, 1] into a grayscale PNG grid."""
    n = images.shape[1]
    rows = (n + cols - 1) // cols
    canvas = np.zeros((rows * 28, cols * 28), dtype=np.uint8)
    scaled = np.clip(images * 255.0, 0, 255).astype(np.uint8)
    for i in range(n):
        r, c = divmod(i, cols)
        canvas[r * 28:(r + 1) * 28, c * 28:(c + 1) * 28] = \
            scaled[:, i].reshape(28, 28)
    Image.fromarray(canvas, mode="L").save(path, optimize=True)
    return {"count": n, "cols": cols, "rows": rows, "cell": 28}


def normalize_each(M: np.ndarray) -> np.ndarray:
    """Per-column render of a signed direction, centred on zero.

    A plain min-max washes these out: a few extreme pixels set the range and
    everything else collapses to mid-grey. Clipping at the 99th percentile of
    |v| and mapping symmetrically about zero keeps the stroke structure
    visible while staying faithful to the sign.
    """
    scale = np.percentile(np.abs(M), 99, axis=0, keepdims=True)
    scale = np.where(scale == 0, 1.0, scale)
    return np.clip(M / scale, -1.0, 1.0) * 0.5 + 0.5


def validation_split(ds, label_A, label_B):
    """Training images that are in neither the GSVD base nor the test split.

    Replays the draw of ``sample_pair`` (same seed, same order) and takes the
    next ``N_VAL`` images of each class.
    """
    rng = np.random.default_rng(BASE_SEED)
    val = []
    for label, n in ((label_A, N_A), (label_B, N_B)):
        X = ds.get_class(label, split="train")
        val.append(X[:, rng.permutation(X.shape[1])[n:n + N_VAL]])
    return val


def auc(t_a, t_b) -> float:
    """P(theta_B > theta_A), ties counted half."""
    return float((t_b[:, None] > t_a[None]).mean() + 0.5 * (t_b[:, None] == t_a[None]).mean())


class TruncatedTheta:
    """theta(z) for any truncation level, from one SVD of H^T."""

    def __init__(self, g, mu):
        self.U, self.s, self.Vt = np.linalg.svd(g.H.T, full_matrices=False)
        self.Ci, self.Si = to_intersection(g.C, g.S)
        self.mu = mu[:, None]

    def keep(self, rcond):
        return self.s > (rcond * self.s[0] if rcond > 0 else 0.0)

    def coeffs(self, X, rcond):
        k = self.keep(rcond)
        return self.Vt[k].T @ ((self.U[:, k].T @ (X - self.mu)) / self.s[k, None])

    def __call__(self, X, rcond):
        c = self.coeffs(X, rcond)
        return np.degrees(np.arctan2(np.linalg.norm(self.Si @ c, axis=0),
                                     np.linalg.norm(self.Ci @ c, axis=0)))


def add_dot(img: np.ndarray, row: int, col: int):
    """One tap of the playground brush (28 px wide on the 280 px pad) centred
    on pixel (row, col), area-averaged back to 28x28."""
    big = Image.fromarray((img * 255).astype(np.uint8)).resize((280, 280), Image.NEAREST)
    cy, cx = row * 10 + 5, col * 10 + 5
    ImageDraw.Draw(big).ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=255)
    return (np.asarray(big, float) / 255).reshape(28, 10, 28, 10).mean(axis=(1, 3))


def recommended_threshold(ds, label_A, label_B, g, mu) -> tuple[float, float]:
    """Decision threshold tuned on the validation images (see
    ``validation_split``): the best balanced accuracy on them (middle of the
    best plateau, 0.1 degree grid) and that accuracy."""
    val = validation_split(ds, label_A, label_B)
    tA = theta_angles(val[0] - mu[:, None], g.C, g.S, g.H)
    tB = theta_angles(val[1] - mu[:, None], g.C, g.S, g.H)
    grid = np.round(np.arange(0.0, 90.05, 0.1), 1)
    bal = ((tA[None, :] < grid[:, None]).mean(axis=1)
           + (tB[None, :] >= grid[:, None]).mean(axis=1)) / 2
    best = np.flatnonzero(bal == bal.max())
    return float(grid[best[len(best) // 2]]), float(bal.max())


TRUNC_STATE: dict = {}


def truncation_section(tt: TruncatedTheta, X_A, X_B) -> dict:
    """Everything the truncation section shows for one pair, except the
    validation curve (averaged over all pairs in main)."""
    s = tt.s[tt.s > 0]
    energy = np.cumsum(s ** 2) / np.sum(s ** 2)
    levels = []
    for r in TRUNC_GRID:
        k = int(tt.keep(r).sum())
        levels.append({"rcond": r, "kept": k, "energy": round(float(energy[k - 1]), 4)})

    # singular directions as images, strongest first
    layout = sprite(normalize_each(tt.U[:, :s.size]), OUT / "truncation_dirs.png", cols=25)

    # a stray dot near the corner: theta and |c| without and with the default cut
    examples = []
    for side, i in TRUNC_EXAMPLES:
        orig = (X_A if side == "A" else X_B)[:, i].reshape(28, 28)
        dotted = add_dot(orig, *TRUNC_DOT)
        z = np.stack([orig.ravel(), dotted.ravel()], axis=1)
        th0, th1 = tt(z, 0.0), tt(z, DEFAULT_RCOND)
        n0 = np.linalg.norm(tt.coeffs(z, 0.0), axis=0)
        n1 = np.linalg.norm(tt.coeffs(z, DEFAULT_RCOND), axis=0)
        examples.append({
            "side": side,
            "orig": np.round(orig.ravel() * 255).astype(int).tolist(),
            "dotted": np.round(dotted.ravel() * 255).astype(int).tolist(),
            "theta_plain": [round(float(v), 2) for v in th0],
            "theta_cut": [round(float(v), 2) for v in th1],
            "norm_plain": [round(float(v), 2) for v in n0],
            "norm_cut": [round(float(v), 3) for v in n1],
        })
    print(f"    truncation section: {s.size} directions, default keeps "
          f"{int(tt.keep(DEFAULT_RCOND).sum())}")
    return {"sigma": [float(f"{v:.4g}") for v in s], "levels": levels,
            "sprite_dirs": layout, "examples": examples}


def run_pair(ds, label_A, label_B, slug: str, family: str) -> dict:
    print(f"  {slug}: decomposing...", flush=True)
    prep = prepare_data(ds, label_A, label_B, n_A=N_A, n_B=N_B, seed=BASE_SEED,
                        centering="pooled")
    g = prep.gsvd
    mu = prep.center_test

    # --- the compact operator the browser will use -------------------------
    Ci, Si = to_intersection(g.C, g.S)
    cv = get_nonzero_per_column(Ci)
    sv = get_nonzero_per_column(Si)
    keep = np.flatnonzero((cv != 0) | (sv != 0))
    P = np.linalg.pinv(g.H.T, rcond=DEFAULT_RCOND)[keep]
    cv, sv = cv[keep], sv[keep]

    # --- test set, exactly as evaluate_pair does it ------------------------
    n_test = balanced_count(ds, label_A, label_B, split="test")
    X_A, X_B = sample_pair(ds, label_A, label_B, n_test, n_test,
                           split="test", seed=TEST_SEED)
    ang_A = theta_angles(X_A - mu[:, None], g.C, g.S, g.H)
    ang_B = theta_angles(X_B - mu[:, None], g.C, g.S, g.H)

    # the float16 round trip the browser will see; z is raw, the mean is
    # removed in coordinate space through m = P16 mu
    P16 = P.astype(np.float16)
    m_shift = (P16.astype(np.float64) @ mu).astype(np.float32)

    def theta_fast(X):
        c = P16.astype(np.float64) @ X - m_shift.astype(np.float64)[:, None]
        return np.degrees(np.arctan2(np.linalg.norm(sv[:, None] * c, axis=0),
                                     np.linalg.norm(cv[:, None] * c, axis=0)))

    err = max(np.abs(theta_fast(X_A) - ang_A).max(),
              np.abs(theta_fast(X_B) - ang_B).max())
    flips = int(np.count_nonzero((theta_fast(X_A) < 45) != (ang_A < 45)) +
                np.count_nonzero((theta_fast(X_B) < 45) != (ang_B < 45)))
    print(f"    float16 transport: max {err:.4f} deg, {flips} label flips "
          f"of {ang_A.size + ang_B.size}")

    m = metrics_from_angles(ang_A, ang_B)
    tau, tau_val_acc = recommended_threshold(ds, label_A, label_B, g, mu)

    # validation AUC at every truncation level (feeds the truncation section)
    tt = TruncatedTheta(g, mu)
    VA, VB = validation_split(ds, label_A, label_B)
    val_auc = [auc(tt(VA, r), tt(VB, r)) for r in TRUNC_GRID]
    cka = linear_cka(center(prep.A)[0], center(prep.B)[0])  # each set by its own mean

    # --- binary payload, base64 in JSON ------------------------------------
    payload = (P16.tobytes() + cv.astype(np.float32).tobytes()
               + sv.astype(np.float32).tobytes() + m_shift.tobytes())
    (OUT / f"{slug}.op.json").write_text(
        json.dumps({"data": base64.b64encode(payload).decode("ascii")}))

    # --- sprites -----------------------------------------------------------
    take_A = min(MAX_SPRITE, X_A.shape[1])
    take_B = min(MAX_SPRITE, X_B.shape[1])
    test_imgs = np.hstack([X_A[:, :take_A], X_B[:, :take_B]])
    layout_test = sprite(test_imgs, OUT / f"{slug}_test.png")

    # H directions, reconstructed in image space and ordered by their angle
    H_dirs = g.H.T                                    # (784, t)
    ang_H = np.degrees(np.arctan2(sv, cv))
    order = np.argsort(ang_H)
    H_keep = H_dirs[:, keep][:, order]
    layout_H = sprite(normalize_each(H_keep), OUT / f"{slug}_H.png", cols=25)

    hist_edges = np.linspace(0, 90, N_BINS + 1)
    meta = {
        "slug": slug, "family": family,
        "label_A": int(label_A), "label_B": int(label_B),
        "name_A": ds.class_name(label_A), "name_B": ds.class_name(label_B),
        "k": int(P.shape[0]), "d": int(P.shape[1]),
        "blocks": {"bl": int(g.bl), "br": int(g.br), "wl": int(g.wl),
                   "wr": int(g.wr), "r": int(g.r)},
        "cka": round(float(cka), 4),
        "metrics": {k: round(float(v), 4) for k, v in m.items()},
        "n_A": int(ang_A.size), "n_B": int(ang_B.size),
        "hist_edges": [round(float(e), 3) for e in hist_edges],
        "hist_A": np.histogram(ang_A, bins=hist_edges)[0].tolist(),
        "hist_B": np.histogram(ang_B, bins=hist_edges)[0].tolist(),
        "angles_A": [round(float(a), 3) for a in ang_A[:take_A]],
        "angles_B": [round(float(a), 3) for a in ang_B[:take_B]],
        "sprite_test": {**layout_test, "n_A": take_A, "n_B": take_B},
        "sprite_H": layout_H,
        "angles_H": [round(float(a), 3) for a in ang_H[order]],
        "transport_error_deg": round(float(err), 5),
        "transport_flips": flips,
        "centering": prep.centering,
        "rcond": DEFAULT_RCOND,
        "threshold": {"recommended": tau, "val_balanced_accuracy": round(tau_val_acc, 4),
                      "n_val": N_VAL},
        "val_auc_by_rcond": [round(v, 5) for v in val_auc],
    }
    if (family, label_A, label_B) == TRUNC_PAIR:
        TRUNC_STATE.update(truncation_section(tt, X_A, X_B))
    (OUT / f"{slug}.json").write_text(json.dumps(meta), encoding="utf-8")
    print(f"    accuracy {m['accuracy']:.4f}  CKA {cka:.4f}  k={P.shape[0]}  "
          f"recommended threshold {tau:.1f} deg")
    return meta


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index, metas = [], []
    for family, ds, pairs in (
        ("mnist", MNISTDataset(), MNIST_PAIRS),
        ("fashion", FashionMNISTDataset(), FASHION_PAIRS),
    ):
        print(f"{family}:")
        for a, b in pairs:
            slug = f"{family}_{a}_{b}"
            meta = run_pair(ds, a, b, slug, family)
            metas.append(meta)
            index.append({k: meta[k] for k in
                          ("slug", "family", "name_A", "name_B", "cka",
                           "label_A", "label_B")}
                         | {"accuracy": meta["metrics"]["accuracy"]})
    (OUT / "index.json").write_text(json.dumps(index, indent=1), encoding="utf-8")

    # validation AUC per truncation level, mean over every pair above
    curves = np.array([m["val_auc_by_rcond"] for m in metas])
    fam, a, b = TRUNC_PAIR
    trunc = {"pair": f"{fam}_{a}_{b}", "grid": list(TRUNC_GRID), "chosen": DEFAULT_RCOND,
             "val_auc_mean": [round(float(v), 5) for v in curves.mean(axis=0)],
             "n_pairs": len(metas), **TRUNC_STATE}
    (OUT / "truncation.json").write_text(json.dumps(trunc), encoding="utf-8")
    print(f"\nwrote {len(index)} pairs to {OUT}")


if __name__ == "__main__":
    main()
