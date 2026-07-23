# Pose literal provenance

Verified 2026-07-23 by recomputing each literal from its source and matching
against `src/data/poses.js`. "Extracted" poses only — all others in poses.js
are hand-authored prototypes (including `mt_hip`, closed as
permanently-prototype after both the roundhouse_v2 f1357 dead end and the
roundhouse_original kick-apex occlusion finding — see below).

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

## Footage screening (`screen_footage.py`)

Pre-flight quality screener: samples 12 frames, IMAGE mode, num_poses=4, and
issues USABLE / MARGINAL / HOSTILE from two criteria — mean vis_min of the 13
pipeline keypoints, and single-person detection rate.

Calibration (2026-07-23), verified against ground truth on all three known
clips:

| Clip | mean vis_min | single-person | Verdict | Failing criterion |
|---|---|---|---|---|
| public/videos/jab.mp4 | 0.933 | 12/12 (100%) | USABLE | — |
| public/videos/roundhouse.mp4 (trim) | 0.063 | 12/12 (100%) | HOSTILE | visibility only |
| tools .../roundhouse_v2.mp4 | 0.419 | 1/12 (8%) | HOSTILE | person count only |
| public/videos/roundhouse_original.mp4 | 0.762 | 40/40 (100%) | USABLE | — (but see caveat) |

The two hostile clips fail on *different, independent* axes: the trimmed
bag-work roundhouse tracks a single person confidently except for near-zero
leg keypoints (localized visibility failure), while the v2 sparring footage
has good visibility but two fighters in frame (chimera-prone person-count
failure — the cause of the f1357 dead end). Neither criterion alone catches
both, which is why the verdict needs both. Screen new footage with this tool
before investing in per-frame extraction.

**Screener caveat — averages hide apex hostility.** The screener's
evenly-spaced samples overwhelmingly land on stance/reset moments between
techniques, so it measures *average clip quality*, not extractability of the
frames you actually want. roundhouse_original screens USABLE at 0.762 while
its kick drive phases run vis 0.01–0.16 (below). A clip can screen USABLE
and still be hostile at every technique apex. Screen the specific window of
interest (`--start/--end`), and treat even that as necessary-not-sufficient —
only a dense per-frame probe of the technique arc settles it.

## Kick apexes are structurally unextractable in roundhouse_original

The earlier "roundhouse is MediaPipe-hostile" verdict needs correcting:
**roundhouse_original.mp4 is NOT hostile as a source** (USABLE, 0.762 mean
over 40 samples). The trimmed public/videos/roundhouse.mp4 was cut from
T=163.65–165.20 — inside the 140–165s dark-bag dead zone, one of the worst
pockets in the whole video. The hostility verdict was true of that trim, not
the source.

The real problem is spatial, not clip quality: **vis collapses the moment
the kicking leg crosses the black bag silhouette and recovers the frame it
clears.** Frame-level evidence, dense probe f8490–8530 (t≈283.3–284.6s, the
best-tracked kick in the cleanest window):

- stance 8490–8493: vis 0.99→0.62; lift/drive/impact 8494–8510: vis
  0.01–0.42; recovery 8516–8530: vis 0.92–0.99. Boundary transitions are
  one frame wide (8515→8516: 0.21→0.92).
- drive phase proper (8503–8507, knee above hip, ankle driving into the
  bag): vis 0.01–0.16.
- the only knee-above-hip frame over 0.5 is **8513 (vis 0.70)** — a
  *retraction chamber* (ankle tucked under knee, ank_lat 0.012), nearly
  duplicating mt_chamber. Wrong phase.
- during occlusion MediaPipe **hallucinates planted feet** (f8496–8501 show
  both ankles at the old stance position while the leg is visibly lifting).
  Low vis here means actively wrong, not merely uncertain.

Since every kick in this footage drives into the same bag, the mechanism
applies to all of them (five kicks in the 256–306s window all show the same
low-vis apex signature; the ~288s kick's 0.37 extension frame is the best
and still fails). **mt_hip remains prototype — not recoverable from this
source.** A usable mt_hip extraction needs footage where the kick apex is
not occluded: shadowboxing, pads held clear of the arc, or a light
background.

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
