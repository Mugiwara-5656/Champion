"""Render annotated skeleton thumbnails for specific frames + emit the poses.js
pose() literal (jab anchor normalization) for each, so a human can pick.

Usage:
  python show_candidates.py <video> <label> <frame> [frame ...]
"""
import os
import sys

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import normalize, draw_skeleton, MODEL_PATH, ensure_model
from normalize_one import normalize_pose, KEYS


def literal(pose):
    parts = [f"{pose[k][i]:.3f}" for k in KEYS for i in (0, 1)]
    parts = [p.rstrip("0").rstrip(".") if p.endswith("0") else p for p in parts]
    pretty = ",".join(p if p.startswith("-") or "." in p else p + ".0" for p in parts)
    return f"pose({pretty})"


def main():
    video = sys.argv[1]
    label = sys.argv[2]
    frames = [int(a) for a in sys.argv[3:]]
    ensure_model()
    cap = cv2.VideoCapture(video)
    fps = cap.get(cv2.CAP_PROP_FPS)
    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
    )
    lm = mp_vision.PoseLandmarker.create_from_options(options)

    thumbs = []
    for fnum in frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
        ok, frame = cap.read()
        if not ok:
            print(f"frame {fnum}: read failed")
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        det = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        if not det.pose_landmarks:
            print(f"frame {fnum}: no pose")
            continue
        raw, orient, vis = normalize(det.pose_landmarks[0])
        norm, *_ = normalize_pose(raw)
        draw_skeleton(frame, det.pose_landmarks[0])
        h, w = frame.shape[:2]
        tw = 360
        thumb = cv2.resize(frame, (tw, int(h * tw / w)))
        cv2.rectangle(thumb, (0, 0), (tw, 20), (0, 0, 0), -1)
        cv2.putText(thumb, f"f{fnum} t={fnum/fps:.2f}s vis={vis}", (5, 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 120), 1, cv2.LINE_AA)
        thumbs.append(thumb)
        print(f"frame={fnum}  t={fnum/fps:.2f}s  vis_min={vis}  orient={orient}")
        print(f"  {label}: {literal(norm)},")

    if thumbs:
        h, w = thumbs[0].shape[:2]
        cols = min(len(thumbs), 4)
        rows = (len(thumbs) + cols - 1) // cols
        sheet = np.full((rows * h, cols * w, 3), 24, dtype=np.uint8)
        for i, t in enumerate(thumbs):
            r, c = divmod(i, cols)
            sheet[r*h:(r+1)*h, c*w:(c+1)*w] = t
        out = os.path.join("tools", "pose-extract", "frames", f"{label}_candidates_sheet.png")
        cv2.imwrite(out, sheet)
        print(f"\nsheet: {out}  ({sheet.shape[1]}x{sheet.shape[0]})")
    cap.release()
    lm.close()


if __name__ == "__main__":
    main()
