"""Precompute the browser-side artifacts for the GSVD alignment-angle site.

Everything the site shows comes from `gsvdlib` (the validated pipeline), never
from a second implementation. The decomposition runs here, offline; the browser
only evaluates the cheap closed form

    theta(z) = atan2( || s .* (P z) || , || c .* (P z) || ),   P = pinv(H')

which is exact to ~1e-9 against `gsvdlib.classify.theta_angles` and to ~0.005
degrees after the float16 quantization of P used for transport.

Per pair we emit:
  <slug>.op.json  {"data": base64 of float16 P (k x 784), then float32 c,
                  then float32 s}; base64 because corporate proxies often
                  block raw binary downloads
  <slug>.json   metrics, histograms, per-test-sample angles, sprite layout
  <slug>_test.png     sprite with the test images (row-major, 28x28 cells)
  <slug>_H.png        sprite with the reconstructed H directions
"""

from __future__ import annotations

import base64
import json
from pathlib import Path

import numpy as np
from PIL import Image

from gsvdlib import FashionMNISTDataset, MNISTDataset, prepare_data
from gsvdlib.angles import get_nonzero_per_column
from gsvdlib.blocks import to_intersection
from gsvdlib.classify import linear_cka, metrics_from_angles, theta_angles
from gsvdlib.datasets import balanced_count, sample_pair

OUT = Path(__file__).resolve().parent.parent / "data"
N_A, N_B = 900, 800
BASE_SEED, TEST_SEED = 1234, 4321
N_BINS = 45                 # 2-degree bins over [0, 90]
MAX_SPRITE = 1200           # test images kept per side for the drill-down
SPRITE_COLS = 40

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


def run_pair(ds, label_A, label_B, slug: str, family: str) -> dict:
    print(f"  {slug}: decomposing...", flush=True)
    prep = prepare_data(ds, label_A, label_B, n_A=N_A, n_B=N_B, seed=BASE_SEED)
    g = prep.gsvd

    # --- the compact operator the browser will use -------------------------
    Ci, Si = to_intersection(g.C, g.S)
    cv = get_nonzero_per_column(Ci)
    sv = get_nonzero_per_column(Si)
    keep = np.flatnonzero((cv != 0) | (sv != 0))
    P = np.linalg.pinv(g.H.T)[keep]
    cv, sv = cv[keep], sv[keep]

    # --- test set, exactly as evaluate_pair does it ------------------------
    n_test = balanced_count(ds, label_A, label_B, split="test")
    X_A, X_B = sample_pair(ds, label_A, label_B, n_test, n_test,
                           split="test", seed=TEST_SEED)
    ang_A = theta_angles(X_A, g.C, g.S, g.H)
    ang_B = theta_angles(X_B, g.C, g.S, g.H)

    # the float16 round trip the browser will see
    P16 = P.astype(np.float16)

    def theta_fast(X):
        c = P16.astype(np.float64) @ X
        return np.degrees(np.arctan2(np.linalg.norm(sv[:, None] * c, axis=0),
                                     np.linalg.norm(cv[:, None] * c, axis=0)))

    err = max(np.abs(theta_fast(X_A) - ang_A).max(),
              np.abs(theta_fast(X_B) - ang_B).max())
    flips = int(np.count_nonzero((theta_fast(X_A) < 45) != (ang_A < 45)) +
                np.count_nonzero((theta_fast(X_B) < 45) != (ang_B < 45)))
    print(f"    float16 transport: max {err:.4f} deg, {flips} label flips "
          f"of {ang_A.size + ang_B.size}")

    m = metrics_from_angles(ang_A, ang_B)
    cka = linear_cka(prep.A, prep.B)

    # --- binary payload, base64 in JSON ------------------------------------
    payload = (P16.tobytes() + cv.astype(np.float32).tobytes()
               + sv.astype(np.float32).tobytes())
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
    }
    (OUT / f"{slug}.json").write_text(json.dumps(meta), encoding="utf-8")
    print(f"    accuracy {m['accuracy']:.4f}  CKA {cka:.4f}  k={P.shape[0]}")
    return meta


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for family, ds, pairs in (
        ("mnist", MNISTDataset(), MNIST_PAIRS),
        ("fashion", FashionMNISTDataset(), FASHION_PAIRS),
    ):
        print(f"{family}:")
        for a, b in pairs:
            slug = f"{family}_{a}_{b}"
            meta = run_pair(ds, a, b, slug, family)
            index.append({k: meta[k] for k in
                          ("slug", "family", "name_A", "name_B", "cka",
                           "label_A", "label_B")}
                         | {"accuracy": meta["metrics"]["accuracy"]})
    (OUT / "index.json").write_text(json.dumps(index, indent=1), encoding="utf-8")
    print(f"\nwrote {len(index)} pairs to {OUT}")


if __name__ == "__main__":
    main()
