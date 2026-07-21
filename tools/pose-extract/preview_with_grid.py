"""Render a frame with a 0..1 fractional grid overlay so a user can read off
crop-bbox coordinates by eye. Skeleton overlaid in dim color for context.

Usage:
  python preview_with_grid.py <video> <frame_num> <out_path>
"""
import os
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import MODEL_PATH, ensure_model

SKELETON = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (25, 27), (24, 26), (26, 28),
    (0, 11), (0, 12),
]


def main():
    video = sys.argv[1]
    fnum = int(sys.argv[2])
    out_path = sys.argv[3]

    ensure_model()
    cap = cv2.VideoCapture(video)
    cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
    ok, frame = cap.read()
    if not ok:
        raise SystemExit(f"cannot read {fnum}")
    H, W = frame.shape[:2]

    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.3,
    )
    landmarker = mp_vision.PoseLandmarker.create_from_options(options)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    det = landmarker.detect(mp_image)

    annotated = frame.copy()
    if det.pose_landmarks:
        lms = det.pose_landmarks[0]
        pts = [(int(lm.x * W), int(lm.y * H)) for lm in lms]
        for a, b in SKELETON:
            cv2.line(annotated, pts[a], pts[b], (0, 200, 255), 2, cv2.LINE_AA)
        for i in range(33):
            cv2.circle(annotated, pts[i], 3, (0, 255, 255), -1, cv2.LINE_AA)

    # Fractional grid at 0.1 increments
    for i in range(1, 10):
        x = int(i * 0.1 * W)
        cv2.line(annotated, (x, 0), (x, H), (255, 0, 255), 1, cv2.LINE_AA)
        cv2.putText(annotated, f"{i*0.1:.1f}", (x + 2, 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.32, (255, 0, 255), 1, cv2.LINE_AA)
        y = int(i * 0.1 * H)
        cv2.line(annotated, (0, y), (W, y), (255, 0, 255), 1, cv2.LINE_AA)
        cv2.putText(annotated, f"{i*0.1:.1f}", (2, y - 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.32, (255, 0, 255), 1, cv2.LINE_AA)

    target_w = 800
    s = target_w / W
    big = cv2.resize(annotated, (target_w, int(H * s)))
    cv2.imwrite(out_path, big)
    print(f"frame: {W}x{H} -> {out_path}")
    cap.release()
    landmarker.close()


if __name__ == "__main__":
    main()
