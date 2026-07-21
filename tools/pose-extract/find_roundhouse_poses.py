"""Densely scan roundhouse_v2.mp4 to find best frames for all 4 roundhouse
poses: mt_stance, mt_chamber, mt_hip, mt_impact.

Per-frame MediaPipe Pose, scored against four metrics:
  - mt_stance:  symmetric stance, hands up, body squared. Lower asymmetry = better.
  - mt_chamber: kicking knee above hips + lateral, foot tucked below knee.
  - mt_hip:     hip rotation + kicking knee elevated/lateral + ankle horizontally
                past knee (leg extending out of chamber).
  - mt_impact:  ankle x-spread (support pivoted, leg out) + kicking ankle at or
                above hip height.

Saves top-K annotated thumbnails + a contact sheet + a JSON record per pose.

Usage:
  python find_roundhouse_poses.py [step=3] [top_k=8]
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

VIDEO = os.path.join("tools", "pose-extract", "videos", "roundhouse_v2.mp4")
OUT_FRAMES = os.path.join("tools", "pose-extract", "frames")
OUT_POSES = os.path.join("tools", "pose-extract", "poses")
TECH = "roundhouse"


def mt_stance_score(p, vis):
    if vis is None or vis < 0.85:
        return None
    head_x, head_y = p["head"]
    lWr_y = p["lWr"][1]
    rWr_y = p["rWr"][1]
    lEl_y = p["lEl"][1]
    rEl_y = p["rEl"][1]
    lHip_x, lHip_y = p["lHip"]
    rHip_x, rHip_y = p["rHip"]
    lKnee_y = p["lKnee"][1]
    rKnee_y = p["rKnee"][1]
    lAnk_y = p["lAnk"][1]
    rAnk_y = p["rAnk"][1]
    if lWr_y > lEl_y or rWr_y > rEl_y:
        return None
    if lKnee_y > lAnk_y or rKnee_y > rAnk_y:
        return None
    hip_mid_y = (lHip_y + rHip_y) / 2
    avg_wr_y = (lWr_y + rWr_y) / 2
    if avg_wr_y > hip_mid_y:
        return None
    ank_sym = abs(lAnk_y - rAnk_y)
    knee_sym = abs(lKnee_y - rKnee_y)
    hip_sym = abs(lHip_y - rHip_y)
    hip_mid_x = (lHip_x + rHip_x) / 2
    upright = abs(head_x - hip_mid_x)
    score = -(ank_sym + knee_sym + hip_sym + 0.5 * upright)
    return score, "x"


def mt_chamber_score(p, vis):
    if vis is None or vis < 0.85:
        return None
    lHip_x, lHip_y = p["lHip"]
    rHip_x, rHip_y = p["rHip"]
    lKnee_x, lKnee_y = p["lKnee"]
    rKnee_x, rKnee_y = p["rKnee"]
    lAnk_x, lAnk_y = p["lAnk"]
    rAnk_x, rAnk_y = p["rAnk"]
    hip_mid_x = (lHip_x + rHip_x) / 2
    hip_mid_y = (lHip_y + rHip_y) / 2

    def chamber_for(knee_x, knee_y, ank_x, ank_y):
        knee_above = hip_mid_y - knee_y
        if knee_above <= 0:
            return None
        if ank_y <= knee_y:
            return None
        knee_lat = abs(knee_x - hip_mid_x)
        ank_offset = abs(ank_x - knee_x)
        return knee_above + 0.7 * knee_lat - 0.5 * ank_offset

    cl = chamber_for(lKnee_x, lKnee_y, lAnk_x, lAnk_y)
    cr = chamber_for(rKnee_x, rKnee_y, rAnk_x, rAnk_y)
    if cl is None and cr is None:
        return None
    if cl is None:
        return cr, "r"
    if cr is None:
        return cl, "l"
    if cl >= cr:
        return cl, "l"
    return cr, "r"


def mt_hip_score(p, vis):
    if vis is None or vis < 0.85:
        return None
    lHip_x, lHip_y = p["lHip"]
    rHip_x, rHip_y = p["rHip"]
    lKnee_x, lKnee_y = p["lKnee"]
    rKnee_x, rKnee_y = p["rKnee"]
    lAnk_x, lAnk_y = p["lAnk"]
    rAnk_x, rAnk_y = p["rAnk"]
    hip_mid_x = (lHip_x + rHip_x) / 2
    hip_mid_y = (lHip_y + rHip_y) / 2
    hip_rot = abs(lHip_x - rHip_x)

    def hip_for(knee_x, knee_y, ank_x, ank_y):
        knee_above = max(0.0, hip_mid_y - knee_y)
        knee_lat = abs(knee_x - hip_mid_x)
        ank_extended = abs(ank_x - knee_x)
        if ank_extended < 0.05:
            return None
        return knee_above + 0.7 * knee_lat + 0.7 * ank_extended

    hl = hip_for(lKnee_x, lKnee_y, lAnk_x, lAnk_y)
    hr = hip_for(rKnee_x, rKnee_y, rAnk_x, rAnk_y)
    cands = []
    if hl is not None:
        cands.append((hl, "l"))
    if hr is not None:
        cands.append((hr, "r"))
    if not cands:
        return None
    cands.sort(reverse=True)
    return cands[0][0] + hip_rot, cands[0][1]


def mt_impact_score(p, vis):
    if vis is None or vis < 0.6:
        return None
    lHip_y = p["lHip"][1]
    rHip_y = p["rHip"][1]
    lAnk_x, lAnk_y = p["lAnk"]
    rAnk_x, rAnk_y = p["rAnk"]
    hip_mid_y = (lHip_y + rHip_y) / 2
    if lAnk_y <= rAnk_y:
        kick_ank_y, side = lAnk_y, "l"
    else:
        kick_ank_y, side = rAnk_y, "r"
    if kick_ank_y > hip_mid_y:
        return None
    spread = abs(lAnk_x - rAnk_x)
    height_above_hips = hip_mid_y - kick_ank_y
    return spread + 0.7 * height_above_hips, side


SCORERS = [
    ("mtstance",  mt_stance_score,  "symmetric stance, hands up; -(ank_sym+knee_sym+hip_sym+0.5*upright); vis>=0.85"),
    ("mtchamber", mt_chamber_score, "knee_above_hip + 0.7*knee_lateral - 0.5*ank_offset_from_knee; require knee>hip, ank below knee; vis>=0.85"),
    ("mthip",     mt_hip_score,     "hip_x_spread + best_side(knee_above + 0.7*knee_lat + 0.7*ank_extended); require ank_extended>=0.05; vis>=0.85"),
    ("mtimpact",  mt_impact_score,  "abs(lAnk.x-rAnk.x) + 0.7*(hip_mid_y - kick_ank_y); require kick_ank_y<=hip_mid_y; vis>=0.6"),
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
    step = int(sys.argv[1]) if len(sys.argv) > 1 else 3
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
            side_tag = f"  side={side}" if side and side != "x" else ""
            lbl = f"{label} #{idx:02d}  t={ts:6.2f}s  score={score:+.3f}  vis={vis}{side_tag}"
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
                "side": side,
                "thumb": path,
                "pose": pose,
            })
        sheet = make_sheet(thumbs, cols=4)
        if sheet is not None:
            sheet_path = os.path.join(OUT_FRAMES, f"{TECH}_{label}_sheet.png")
            cv2.imwrite(sheet_path, sheet)
            print(f"\n{label} sheet: {sheet_path}")
            for r in records:
                side_tag = f"  side={r['side']}" if r['side'] and r['side'] != "x" else ""
                print(f"  #{r['rank']:02d}  frame {r['frame']:5d}  t={r['ts']:6.2f}s  "
                      f"score={r['score']:+.3f}  vis={r['vis_min']}{side_tag}")
        out_data[label] = records

    cap.release()
    landmarker.close()

    out_path = os.path.join(OUT_POSES, f"{TECH}_v2_candidates.json")
    with open(out_path, "w") as f:
        json.dump(out_data, f, indent=2)
    print(f"\nJSON: {out_path}")


if __name__ == "__main__":
    main()
