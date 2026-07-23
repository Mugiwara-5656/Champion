"""Pre-flight footage quality screener: is this clip worth extracting from?

Samples N frames evenly across the clip (or [--start, --end]), runs MediaPipe
PoseLandmarker in IMAGE mode (stateless, num_poses=4) on each, and reports
per-frame people count + visibility of the 13 pipeline keypoints, then a
verdict:

  USABLE   - mean vis_min >= 0.5 AND exactly 1 person in >= 80% of samples
  MARGINAL - mean vis_min 0.3-0.5, or 1 person in 50-80% of samples
  HOSTILE  - mean vis_min < 0.3, or multiple/zero people in most samples

No-detect frames count as vis_min=0.0 toward the mean. When several people
are detected, vis stats come from the most-visible one.

Usage:
  python screen_footage.py <video> [--start T] [--end T] [--samples N]
"""
import argparse
import os
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import MODEL_PATH, ensure_model

# 13 pipeline keypoints: head + shoulders/elbows/wrists/hips/knees/ankles
KP_IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]


def vis_stats(landmarks):
    vals = [landmarks[i].visibility for i in KP_IDX]
    return min(vals), sum(vals) / len(vals)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("video")
    ap.add_argument("--start", type=float, default=None, help="range start (s)")
    ap.add_argument("--end", type=float, default=None, help="range end (s)")
    ap.add_argument("--samples", type=int, default=12)
    args = ap.parse_args()

    ensure_model()
    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        print(f"ERROR: cannot open {args.video}")
        sys.exit(2)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total / fps if fps else 0.0
    print(f"Video: {args.video}")
    print(f"  {w}x{h}  fps={fps:.2f}  frames={total}  duration={duration:.2f}s")

    start_s = args.start if args.start is not None else 0.0
    end_s = args.end if args.end is not None else duration
    if not 0.0 <= start_s < end_s <= duration + 1e-6:
        print(f"ERROR: bad range [{start_s}, {end_s}] for {duration:.2f}s clip")
        sys.exit(2)
    f0 = int(start_s * fps)
    f1 = min(int(end_s * fps), total - 1)
    n = args.samples
    # interior sampling (as extract_poses.py) — avoids first/last-frame junk
    sample_frames = [f0 + int((i + 1) * (f1 - f0) / (n + 1)) for i in range(n)]
    if args.start is not None or args.end is not None:
        print(f"  range [{start_s:.2f}s, {end_s:.2f}s] -> frames {f0}..{f1}")

    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=4,
        min_pose_detection_confidence=0.5,
    )
    landmarker = mp_vision.PoseLandmarker.create_from_options(options)

    print(f"\n  {'#':>3}  {'frame':>6}  {'t':>8}  {'people':>6}  {'vis_min':>7}  {'vis_mean':>8}")
    one_person = 0
    vis_mins = []
    for i, fnum in enumerate(sample_frames, start=1):
        cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
        ok, frame = cap.read()
        ts = fnum / fps if fps else 0.0
        if not ok:
            print(f"  {i:>3}  {fnum:>6}  {ts:7.2f}s  read failed")
            vis_mins.append(0.0)
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        det = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        n_people = len(det.pose_landmarks)
        if n_people == 0:
            print(f"  {i:>3}  {fnum:>6}  {ts:7.2f}s  {0:>6}  {'-':>7}  {'-':>8}")
            vis_mins.append(0.0)
            continue
        v_min, v_mean = max((vis_stats(lms) for lms in det.pose_landmarks),
                            key=lambda t: t[1])
        print(f"  {i:>3}  {fnum:>6}  {ts:7.2f}s  {n_people:>6}  {v_min:7.2f}  {v_mean:8.2f}")
        vis_mins.append(v_min)
        if n_people == 1:
            one_person += 1
    cap.release()
    landmarker.close()

    mean_vis = sum(vis_mins) / len(vis_mins)
    rate = one_person / len(sample_frames)
    print(f"\n  mean vis_min = {mean_vis:.3f}   single-person rate = {one_person}/{len(sample_frames)} ({rate:.0%})")

    if mean_vis >= 0.5 and rate >= 0.8:
        verdict = "USABLE"
        reason = (f"mean vis_min {mean_vis:.2f} >= 0.5 and single person in "
                  f"{rate:.0%} of samples (>= 80%)")
    elif mean_vis < 0.3 or rate < 0.5:
        verdict = "HOSTILE"
        problems = []
        if mean_vis < 0.3:
            problems.append(f"mean vis_min {mean_vis:.2f} < 0.3")
        if rate < 0.5:
            problems.append(f"single person in only {rate:.0%} of samples (< 50%)")
        reason = " and ".join(problems)
    else:
        verdict = "MARGINAL"
        problems = []
        if mean_vis < 0.5:
            problems.append(f"mean vis_min {mean_vis:.2f} in 0.3-0.5")
        if rate < 0.8:
            problems.append(f"single person in {rate:.0%} of samples (50-80%)")
        reason = " and ".join(problems)

    print(f"\nVERDICT: {verdict}")
    print(f"  reason: {reason}")


if __name__ == "__main__":
    main()
