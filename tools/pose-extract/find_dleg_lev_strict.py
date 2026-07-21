"""Stricter dleg_lev dense scan — finds *pre-shot* level-change frames only,
not mid-shot penetration where the fighter is already on the mat.

Differences from find_dleg_lev_poses.py:
  - Feet must be roughly symmetric in x (|lAnk_x - rAnk_x| < 0.15)
  - Head must be over the feet, not lunged forward (|head_x - ank_mid_x| < 0.10)
  - Deeper hip drop required (hip_mid_y > 0.55, vs 0.45 before)

Outputs written to *_levstrict_* paths so the original lev scan results are preserved.

Usage:
  python tools/pose-extract/find_dleg_lev_strict.py [step=2] [top_k=8]
"""
import json
import os
import sys

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import normalize, draw_skeleton, MODEL_PATH, ensure_model

VIDEO = os.path.join("tools", "pose-extract", "videos", "dleg.mp4")
OUT_FRAMES = os.path.join("tools", "pose-extract", "frames")
OUT_POSES = os.path.join("tools", "pose-extract", "poses")
TECH = "dleg"


def lev_score(p, vis):
    if vis is None or vis < 0.5:
        return None
    head_x, head_y = p["head"]
    lSh_y = p["lSh"][1]
    rSh_y = p["rSh"][1]
    lHip_x, lHip_y = p["lHip"]
    rHip_x, rHip_y = p["rHip"]
    lKnee_y = p["lKnee"][1]
    rKnee_y = p["rKnee"][1]
    lAnk_x, lAnk_y = p["lAnk"]
    rAnk_x, rAnk_y = p["rAnk"]

    hip_mid_x = (lHip_x + rHip_x) / 2
    hip_mid_y = (lHip_y + rHip_y) / 2
    knee_mid_y = (lKnee_y + rKnee_y) / 2
    ank_mid_x = (lAnk_x + rAnk_x) / 2
    ank_mid_y = (lAnk_y + rAnk_y) / 2
    sh_mid_y = (lSh_y + rSh_y) / 2

    if ank_mid_y < 0.70:
        return None
    if hip_mid_y < 0.55:
        return None
    if knee_mid_y - hip_mid_y > 0.15:
        return None
    if abs(lAnk_x - rAnk_x) > 0.15:
        return None
    if abs(head_x - ank_mid_x) > 0.10:
        return None

    hip_drop = hip_mid_y - 0.55
    knee_compression = max(0.0, 0.20 - max(0.0, knee_mid_y - hip_mid_y))
    foot_symmetry = max(0.0, 0.15 - abs(lAnk_x - rAnk_x))
    head_over_feet = max(0.0, 0.10 - abs(head_x - ank_mid_x))
    head_drop = max(0.0, head_y - sh_mid_y)

    score = (2.0 * hip_drop + 2.0 * knee_compression
             + 1.5 * foot_symmetry + 1.5 * head_over_feet + head_drop)
    return score, "x"


SCORERS = [
    ("levstrict", lev_score,
     "2*hip_drop + 2*knee_compression + 1.5*foot_symmetry + 1.5*head_over_feet + head_drop; "
     "filters: vis>=0.5, ank_mid_y>=0.70, hip_mid_y>=0.55, knee-hip<=0.15, "
     "|lAnk_x-rAnk_x|<=0.15, |head_x-ank_mid_x|<=0.10"),
]


def render_thumb(frame, landmarks, label, target_w=480):
    draw_skeleton(frame, landmarks)
    h, w = frame.shape[:2]
    scale = target_w / w
    thumb = cv2.resize(frame, (target_w, int(h * scale)))
    cv2.rectangle(thumb, (0, 0), (target_w, 26), (0, 0, 0), -1)
    cv2.putText(thumb, label, (8, 19), cv2.FONT_HERSHEY_SIMPLEX,
                0.42, (255, 255, 255), 1, cv2.LINE_AA)
    return thumb


def make_sheet(thumbs, cols=4):
    if not thumbs:
        return None
    h, w = thumbs[0].shape[:2]
    rows = (len(thumbs) + cols - 1) // cols
    sheet = np.zeros((h * rows, w * cols, 3), dtype=thumbs[0].dtype)
    for i, t in enumerate(thumbs):
        r, c = i // cols, i % cols
        sheet[r * h:(r + 1) * h, c * w:(c + 1) * w] = t
    return sheet


def main():
    step = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    top_k = int(sys.argv[2]) if len(sys.argv) > 2 else 8

    ensure_model()
    os.makedirs(OUT_FRAMES, exist_ok=True)
    os.makedirs(OUT_POSES, exist_ok=True)

    cap = cv2.VideoCapture(VIDEO)
    if not cap.isOpened():
        print(f"ERROR: cannot open {VIDEO}")
        sys.exit(2)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    print(f"Video: {VIDEO}")
    print(f"  total={total} frames, fps={fps:.2f}, step={step}")
    print(f"Scanning ~{total // step} frames...")

    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
    )
    landmarker = mp_vision.PoseLandmarker.create_from_options(options)

    cands = {label: [] for label, _, _ in SCORERS}

    fnum = 0
    next_progress = 10
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if fnum % step != 0:
            fnum += 1
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        det = landmarker.detect(mp_image)
        if det.pose_landmarks:
            lms = det.pose_landmarks[0]
            pose, orient, vis = normalize(lms)
            for label, scorer, _ in SCORERS:
                r = scorer(pose, vis)
                if r is not None:
                    score, side = r
                    cands[label].append((score, fnum, pose, vis, orient, side))
        pct = int(fnum * 100 / total)
        if pct >= next_progress:
            counts = "  ".join(f"{lbl}={len(cands[lbl])}" for lbl, _, _ in SCORERS)
            print(f"  ... {pct}%  {counts}")
            next_progress += 10
        fnum += 1
    cap.release()

    print()
    for label, _, _ in SCORERS:
        print(f"  Total {label} candidates: {len(cands[label])}")

    cap = cv2.VideoCapture(VIDEO)

    out_data = {
        "video": VIDEO,
        "fps": fps,
        "total_frames": total,
        "step": step,
        "scoring": {label: desc for label, _, desc in SCORERS},
    }

    for label, _, _ in SCORERS:
        cands[label].sort(key=lambda t: -t[0])
        top = cands[label][:top_k]
        thumbs = []
        records = []
        for idx, entry in enumerate(top, start=1):
            score, fnum, pose, vis, orient, side = entry
            cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
            ok, frame = cap.read()
            if not ok:
                continue
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            det = landmarker.detect(mp_image)
            if not det.pose_landmarks:
                continue
            ts = fnum / fps if fps else 0.0
            lbl = f"{label} #{idx:02d}  t={ts:6.2f}s  frame={fnum}  score={score:+.3f}  vis={vis}"
            thumb = render_thumb(frame, det.pose_landmarks[0], lbl)
            path = os.path.join(OUT_FRAMES, f"{TECH}_{label}_{idx:02d}.png")
            cv2.imwrite(path, thumb)
            thumbs.append(thumb)
            records.append({
                "rank": idx,
                "frame": fnum,
                "ts": round(ts, 3),
                "score": round(float(score), 4),
                "vis_min": vis,
                "orient": orient,
                "thumb": path,
                "pose": pose,
            })
        sheet = make_sheet(thumbs, cols=4)
        if sheet is not None:
            sheet_path = os.path.join(OUT_FRAMES, f"{TECH}_{label}_sheet.png")
            cv2.imwrite(sheet_path, sheet)
            print(f"\n{label} sheet: {sheet_path}")
            for r in records:
                print(f"  #{r['rank']:02d}  frame {r['frame']:5d}  t={r['ts']:6.2f}s  "
                      f"score={r['score']:+.3f}  vis={r['vis_min']}")
        out_data[label] = records

    cap.release()
    landmarker.close()

    out_path = os.path.join(OUT_POSES, f"{TECH}_levstrict_candidates.json")
    with open(out_path, "w") as f:
        json.dump(out_data, f, indent=2)
    print(f"\nJSON: {out_path}")


if __name__ == "__main__":
    main()
