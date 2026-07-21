"""Densely scan jab.mp4 to find best frames for P.guard and P.jab_ext.

Per-frame MediaPipe Pose, scored against two metrics:
  - guard: both wrists at face height, both above elbows, elbows tucked,
           low asymmetry. Lower score = better.
  - jab_ext: one arm extended horizontally from its shoulder, wrist at
             roughly shoulder height (low vertical drift). Higher = better.

Saves top-K annotated thumbnails + a contact sheet + a JSON record for each.

Usage:
  python find_jab_poses.py [step=2] [top_k=8]
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

VIDEO = os.path.join("tools", "pose-extract", "videos", "jab.mp4")
OUT_FRAMES = os.path.join("tools", "pose-extract", "frames")
OUT_POSES = os.path.join("tools", "pose-extract", "poses")
TECH = "jab"


def guard_score(p, vis):
    if vis is None or vis < 0.85:
        return None
    head_y = p["head"][1]
    lWr_x, lWr_y = p["lWr"]
    rWr_x, rWr_y = p["rWr"]
    lEl_x, lEl_y = p["lEl"]
    rEl_x, rEl_y = p["rEl"]
    lSh_x = p["lSh"][0]
    rSh_x = p["rSh"][0]
    if lWr_y > lEl_y or rWr_y > rEl_y:
        return None
    face_diff = abs((lWr_y + rWr_y) / 2 - head_y)
    asymm = abs(lWr_y - rWr_y)
    flare = max(0.0, lSh_x - lEl_x) + max(0.0, rEl_x - rSh_x)
    return face_diff + 0.5 * asymm + 0.3 * flare


def jab_ext_score(p, vis):
    if vis is None or vis < 0.6:
        return None
    lWr_x, lWr_y = p["lWr"]
    rWr_x, rWr_y = p["rWr"]
    lSh_x, lSh_y = p["lSh"]
    rSh_x, rSh_y = p["rSh"]
    ext_l = abs(lWr_x - lSh_x)
    ext_r = abs(rWr_x - rSh_x)
    if ext_l >= ext_r:
        ext, drift, side = ext_l, abs(lWr_y - lSh_y), "l"
    else:
        ext, drift, side = ext_r, abs(rWr_y - rSh_y), "r"
    return ext - 0.6 * drift, side


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
    print(f"Video: total={total} frames, fps={fps:.2f}, step={step}")
    print(f"Scanning ~{total // step} frames...")

    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
    )
    landmarker = mp_vision.PoseLandmarker.create_from_options(options)

    guard_cands = []
    jab_cands = []

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
            gs = guard_score(pose, vis)
            if gs is not None:
                guard_cands.append((gs, fnum, pose, vis, orient))
            jr = jab_ext_score(pose, vis)
            if jr is not None:
                js, side = jr
                jab_cands.append((js, fnum, pose, vis, orient, side))
        pct = int(fnum * 100 / total)
        if pct >= next_progress:
            print(f"  ... {pct}%  guard={len(guard_cands)}  jab_ext={len(jab_cands)}")
            next_progress += 10
        fnum += 1
    cap.release()

    print(f"\nScored: {len(guard_cands)} guard, {len(jab_cands)} jab_ext")
    guard_cands.sort(key=lambda t: t[0])
    jab_cands.sort(key=lambda t: -t[0])
    guard_top = guard_cands[:top_k]
    jab_top = jab_cands[:top_k]

    cap = cv2.VideoCapture(VIDEO)

    def render_top(label, top, fmt):
        thumbs = []
        records = []
        for idx, entry in enumerate(top, start=1):
            score, fnum, pose, vis, orient = entry[:5]
            extra = entry[5] if len(entry) > 5 else None
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
            side_tag = f"  side={extra}" if extra else ""
            lbl = f"{label} #{idx:02d}  t={ts:5.2f}s  score={fmt.format(score)}  vis={vis}{side_tag}"
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
                "side": extra,
                "thumb": path,
                "pose": pose,
            })
        sheet = make_sheet(thumbs, cols=4)
        if sheet is not None:
            sheet_path = os.path.join(OUT_FRAMES, f"{TECH}_{label}_sheet.png")
            cv2.imwrite(sheet_path, sheet)
            print(f"  Sheet: {sheet_path}")
        return records

    print(f"\nTop {top_k} guard candidates:")
    guard_records = render_top("guard", guard_top, "{:.3f}")
    for r in guard_records:
        print(f"  #{r['rank']:02d}  frame {r['frame']:5d}  t={r['ts']:6.2f}s  "
              f"score={r['score']:.3f}  vis={r['vis_min']}")

    print(f"\nTop {top_k} jab_ext candidates:")
    jab_records = render_top("jabext", jab_top, "{:+.3f}")
    for r in jab_records:
        print(f"  #{r['rank']:02d}  frame {r['frame']:5d}  t={r['ts']:6.2f}s  "
              f"score={r['score']:+.3f}  vis={r['vis_min']}  side={r['side']}")

    cap.release()
    landmarker.close()

    out = {
        "video": VIDEO,
        "fps": fps,
        "total_frames": total,
        "step": step,
        "scoring": {
            "guard": "face_diff + 0.5*asymm + 0.3*elbow_flare; vis>=0.85, wrists above elbows",
            "jab_ext": "max(horizontal_ext) - 0.6*vertical_drift; vis>=0.6",
        },
        "guard": guard_records,
        "jab_ext": jab_records,
    }
    out_path = os.path.join(OUT_POSES, f"{TECH}_candidates.json")
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"\nJSON: {out_path}")


if __name__ == "__main__":
    main()
