# Pose literal provenance

Verified 2026-07-23 by recomputing each literal from its source and matching
against `src/data/poses.js`. "Extracted" poses only — all others in poses.js
are hand-authored prototypes (including `mt_hip`, kept as prototype after
roundhouse_v2 f1357 proved unextractable — see below).

## Sources

| Pose | Video | Frame | How |
|---|---|---|---|
| `guard` | jab.mp4 | 1336 (t=44.58s) | `find_jab_poses.py` candidate **rank 7** in `poses/jab_candidates.json` (not rank 1) |
| `jab_ext` | jab.mp4 | 2892 (t=96.50s) | candidate **rank 4** in `poses/jab_candidates.json` |
| `mt_stance` | roundhouse.mp4 (**v1**) | 9369 (t=312.61s) | `poses/roundhouse.json` sample n=12, via `normalize_all.py` |
| `mt_chamber` | roundhouse.mp4 (**v1**) | 7026 (t=234.43s) | `poses/roundhouse.json` sample n=9, via `normalize_all.py` — **see L/R swap below** |
| `mt_impact` | roundhouse_v2.mp4 | 732 (t=29.30s) | `normalize_cropped.py` with a left-region crop — **crop coords lost, see below** |

## Gotchas

**mt_chamber L/R key swap.** The poses.js literal has every l/r landmark pair
swapped relative to what `extract_poses.normalize()` emits from
`roundhouse.json` sample n=9 today. Geometry is identical; only the key
labels differ. Recomputation matches the literal to Δ=0.001 (a single
rounding-boundary coordinate, lHip.y) *after* swapping l↔r pairs.

**mt_impact lost crop.** Full-frame MediaPipe on roundhouse_v2 frame 732
detects garbage (vis=0.14). The literal came from a `normalize_cropped.py`
run whose crop fractions were passed on the CLI and never recorded — the
literal cannot be regenerated from the video without rediscovering the crop.

**Invariance trick.** All normalization rules here are similarity transforms
(uniform scale + translation), so re-normalizing under a new rule can be done
directly on an existing normalized literal: the result is identical to
applying the new rule to the original raw pose. This is how mt_impact was
verified and how it should be migrated if the rule ever changes — never from
the video.

**roundhouse_v2 f1357 is a dead end** (tried 2026-07-23). Full-frame: a
two-fighter chimera (vis=0.84 but the head lands on the opponent). Kicker
crops x1=0.62/0.66: lock onto the kicker but vis 0.17/0.03 with the kicking
ankle pinned to the crop edge. x1=0.70: no detection. Pick a different frame;
`mt_hip` stays prototype.

## Normalization rules (`normalize_one.py`)

| Rule | Vertical | Horizontal | Flag |
|---|---|---|---|
| anchor (default) | head → .09, max-ankle → .90 | hip midpoint → .50 | — |
| bbox | landmark bbox → [.09, .90] | bbox center → .50 | `--bbox` |
| **hybrid (preferred)** | landmark bbox → [.09, .90] | hip midpoint → .50 | `--hybrid` |

**Hybrid is the preferred rule going forward.** On every pose where the head
is the topmost landmark and an ankle the bottom-most (true of all five
extracted poses), hybrid is *identical* to the anchor rule — verified
Δ=0.000 against all five source poses, so existing poses.js literals need no
migration. Unlike the anchor rule it cannot blow up when a kick puts an
ankle above the head or a wrist below the ankles (e.g. roundhouse impact
frames). Unlike pure bbox it keeps the hip pivot pinned at x=.50, so
interpolating between keyframes doesn't drift the figure sideways as limbs
extend (bbox shifts jab_ext by −.054 in x; hybrid by 0).
