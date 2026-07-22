# Video assets

These .mp4 files are NOT committed to git (gitignored for size).
They must be copied manually to any new machine via USB or cloud.

## Clips

| File | Duration | Status | Notes |
|------|----------|--------|-------|
| jab.mp4 | 2.6026s | TRIMMED | Working clip. Paired with jab phase timestamps in src/data/techniques.js (extension apex ~1.30s). Do NOT replace with a re-trim — the timestamps are calibrated to this exact cut. |
| jab_original.mp4 | 180.88s | SOURCE | Full raw source. Backup only. |
| roundhouse.mp4 | 1.5682s | TRIMMED | Cut from roundhouse_original (T=163.65–165.20, 47 frames, re-encoded CRF 18, audio stripped). See "Roundhouse status" below before re-trimming. |
| roundhouse_original.mp4 | 338.69s | SOURCE | Full raw 5/13 source. Backup only. |
| dleg.mp4 | — | UNTRIMMED | Original 5/13 source. Two-body — prototype poses. |
| armbar.mp4 | — | UNTRIMMED | Original 5/13 source. Two-body — prototype poses. |

## Roundhouse status

- **X-ray timeline: none.** The trimmed clip is MediaPipe-hostile — 360p,
  side-on, fighter against a dark bag. Per-frame pose visibility stays under
  0.22 (mean ~0.05) in both VIDEO and IMAGE mode, so every frame extracts as
  `pose: null`. There is deliberately no `public/timelines/roundhouse.json`.
  The X-ray overlay is **pending better footage** (frontal, higher-res).
- **Poses: 3 of 4 real, 1 prototype.** `mt_stance`, `mt_chamber`, `mt_impact`
  in `src/data/poses.js` are real extractions from a *different*, clean source
  — `tools/pose-extract/videos/roundhouse_v2.mp4` (FIGHTCOACH.TV, vis 0.84–0.88),
  not from the clip above. `mt_hip` remains a hand-authored prototype: v2 has no
  high-visibility, correctly-normalized, right-leg hip-drive frame to replace it.

## Critical rule

Video and phase timestamps travel together as one unit. If you re-trim
a clip, you MUST re-extract the pose timeline and re-sync the phase
timestamps in techniques.js — otherwise the overlay desyncs silently.
