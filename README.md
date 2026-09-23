# An Alignment Angle Is All You Need — project site

Static site for **GSVD for Geometry-Grounded Dataset Comparison: An Alignment
Angle Is All You Need** (ICLR 2026, PMLR v326;
[arXiv:2603.10283](https://arxiv.org/abs/2603.10283)).

Bilingual (EN / PT-BR), light and dark, no build step, no framework, no
tracking. Everything is plain HTML, CSS and ES modules.

## Publishing on GitHub Pages

This site is published from
[`eduardamarks1/gsvd-iclr`](https://github.com/eduardamarks1/gsvd-iclr) at
<https://eduardamarks1.github.io/gsvd-iclr/>, with Pages serving the `main`
branch from the repository root.

Every path in the page is relative (`assets/...`, `data/...`), so the site
works unchanged whether it is served from a project subpath or from a domain
root. Nothing needs rewriting if it ever moves.

The `.nojekyll` file matters: without it GitHub Pages runs Jekyll, which skips
files and folders whose names begin with an underscore.

## Running it locally

The page fetches `data/*.json` and `data/*.bin`, so `file://` will not work —
browsers block those requests. Serve it over HTTP:

```bash
python -m http.server 8000
# then open http://127.0.0.1:8000
```

## Layout

```
index.html              one page, all sections
assets/css/style.css    design tokens, light + dark, layout
assets/js/i18n.js       every user-visible string, EN and PT
assets/js/gsvd.js       data loading, float16 decode, the theta closed form
assets/js/viz.js        dial, co-span demo, block figure, histogram, scatter
assets/js/main.js       wiring, drawing pad, MNIST-style preprocessing
assets/img/             figures carried over from the paper
data/                   precomputed GSVD frames (see below)
tools/precompute.py     generates everything in data/
```

## How the interactive part works

The GSVD is **not** recomputed in the browser. It runs offline in
`tools/precompute.py` through `gsvdlib` — the same validated pipeline behind the
paper — and what ships to the browser is the operator needed to score a new
sample:

```
P = pinv(Hᵀ)   (k x 784, float16)   plus the cosine/sine vectors c, s
```

The browser then evaluates only the closed form

```
θ(z) = atan2( ‖s ⊙ (P z)‖ , ‖c ⊙ (P z)‖ )
```

which is a single matrix–vector product: fast enough to rescore a drawing on
every pointer move. This is exact to ~1e-9 against
`gsvdlib.classify.theta_angles`, and to **0.003°** after the float16
quantization used for transport (verified against the library on the MNIST test
set; the quantization flips one classification label in 15,726 samples, in the
Sneaker vs Ankle boot pair).

Per pair, `data/` holds:

| file | contents |
|---|---|
| `<pair>.bin` | float16 `P`, then float32 `c`, then float32 `s` |
| `<pair>.json` | metrics, block sizes, histograms, per-sample angles, sprite layouts |
| `<pair>_test.png` | sprite of the test images, for the histogram drill-down |
| `<pair>_H.png` | sprite of the reconstructed H directions, ordered by angle |

To regenerate them (requires `gsvdlib`, `numpy`, `pillow`; MNIST and
Fashion-MNIST download once into `~/.gsvdlib/`):

```bash
python tools/precompute.py
```

## Numbers on the page

The results table reports the **published** figures from the paper. The
playground recomputes its own frames from a fresh random draw of training
columns, so its accuracies sit within about a point of the published ones —
the `precompute.py` output prints both.

## Colour

Two series, blue for dataset A and orange for dataset B, with a neutral grey
midpoint for the shared 45° band. The pair passes the lightness, chroma,
colour-vision-deficiency and contrast checks on both the light and dark
surfaces; series identity is never carried by colour alone (every chart has a
legend, and the drill-down strip labels each thumbnail by side).
