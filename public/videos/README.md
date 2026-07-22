# Video assets

These .mp4 files are NOT committed to git (gitignored for size).
They must be copied manually to any new machine via USB or cloud.

## Clips

| File | Duration | Status | Notes |
|------|----------|--------|-------|
| jab.mp4 | 2.6026s | TRIMMED | Working clip. Paired with jab phase timestamps in src/data/techniques.js (extension apex ~1.30s). Do NOT replace with a re-trim — the timestamps are calibrated to this exact cut. |
| jab_original.mp4 | 180.88s | SOURCE | Full raw source. Backup only. |
| roundhouse.mp4 | — | UNTRIMMED | Original 5/13 source. Needs trim + timeline + chain. |
| dleg.mp4 | — | UNTRIMMED | Original 5/13 source. Two-body — prototype poses. |
| armbar.mp4 | — | UNTRIMMED | Original 5/13 source. Two-body — prototype poses. |

## Critical rule

Video and phase timestamps travel together as one unit. If you re-trim
a clip, you MUST re-extract the pose timeline and re-sync the phase
timestamps in techniques.js — otherwise the overlay desyncs silently.
