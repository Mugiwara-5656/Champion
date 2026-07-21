"""Run MediaPipe on a cropped region of a frame so the detector locks onto the
correct subject. Coordinates returned are mapped back to the FULL frame.

Usage:
  python normalize_cropped.py <video> <frame> <x0> <y0> <x1> <y1> <out_path>
where x0,y0,x1,y1 are fractions of the full frame (0..1).
"""
import os
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import MODEL_PATH, ensure_model, draw_skeleton, ANAT_LEFT_IDX, ANAT_RIGHT_IDX, PAIRED

KEYS = ["head", "lSh", "rSh", "lEl", "rEl", "lWr", "rWr",
        "lHip", "rHip", "lKnee", "rKnee", "lAnk", "rAnk"]


def fmt(v):
    s = f"{v:.3f}"
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return s


def main():
    video = sys.argv[1]
    fnum = int(sys.argv[2])
    x0, y0, x1, y1 = map(float, sys.argv[3:7])
    out_path = sys.argv[7]
    ensure_model()
    cap = cv2.VideoCapture(video)
    cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
    ok, frame = cap.read()
    if not ok:
        raise SystemExit(f"cannot read {fnum}")
    H, W = frame.shape[:2]
    px0, py0 = int(x0 * W), int(y0 * H)
    px1, py1 = int(x1 * W), int(y1 * H)
    crop = frame[py0:py1, px0:px1]
    cw, ch = px1 - px0, py1 - py0
    print(f"frame: {W}x{H}  crop=({px0},{py0})..({px1},{py1}) = {cw}x{ch}")

    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.3,
    )
    landmarker = mp_vision.PoseLandmarker.create_from_options(options)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    det = landmarker.detect(mp_image)
    if not det.pose_landmarks:
        print("no pose detected in crop")
        return
    lms = det.pose_landmarks[0]

    # Map crop-relative landmarks back to full-frame fractions
    def to_full(lm):
        full_x = (lm.x * cw + px0) / W
        full_y = (lm.y * ch + py0) / H
        return full_x, full_y, lm.visibility

    head_x, head_y, head_v = to_full(lms[0])
    print(f"\nFull-frame coords + visibilities:")
    print(f"  head: x={head_x:.3f}  y={head_y:.3f}  vis={head_v:.3f}")

    # Determine screen-relative orientation from shoulders mapped to full frame
    lsh_x, lsh_y, _ = to_full(lms[11])
    rsh_x, rsh_y, _ = to_full(lms[12])
    if lsh_x > rsh_x:
        screen_left = ANAT_RIGHT_IDX
        screen_right = ANAT_LEFT_IDX
        orient = "facing_camera"
    else:
        screen_left = ANAT_LEFT_IDX
        screen_right = ANAT_RIGHT_IDX
        orient = "facing_away"
    print(f"  orient={orient}")

    raw = {"head": [round(head_x, 3), round(head_y, 3)]}
    vis_min = head_v
    for idx, name in zip(screen_left, PAIRED):
        x, y, v = to_full(lms[idx])
        raw[f"l{name}"] = [round(x, 3), round(y, 3)]
        print(f"  l{name}: x={x:.3f}  y={y:.3f}  vis={v:.3f}")
        vis_min = min(vis_min, v)
    for idx, name in zip(screen_right, PAIRED):
        x, y, v = to_full(lms[idx])
        raw[f"r{name}"] = [round(x, 3), round(y, 3)]
        print(f"  r{name}: x={x:.3f}  y={y:.3f}  vis={v:.3f}")
        vis_min = min(vis_min, v)
    print(f"\n  vis_min={vis_min:.3f}")

    # Normalize via 3-anchor formula
    head_yp = raw["head"][1]
    max_ank_y = max(raw["lAnk"][1], raw["rAnk"][1])
    hip_mid_x = (raw["lHip"][0] + raw["rHip"][0]) / 2
    s = (0.90 - 0.09) / (max_ank_y - head_yp)
    print(f"  scale s={s:.4f}  head_y={head_yp}  max_ank_y={max_ank_y}  hip_mid_x={hip_mid_x:.3f}")

    norm = {}
    for k, (x, y) in raw.items():
        norm[k] = [
            round(0.50 + (x - hip_mid_x) * s, 3),
            round(0.09 + (y - head_yp) * s, 3),
        ]

    parts = []
    for k in KEYS:
        parts.append(fmt(norm[k][0]))
        parts.append(fmt(norm[k][1]))
    print(f"\nmt_impact: pose({','.join(parts)}),")

    # Annotate full frame for visual confirm
    annotated = frame.copy()
    for idx in [0] + ANAT_LEFT_IDX + ANAT_RIGHT_IDX:
        lm = lms[idx]
        fx = int(lm.x * cw + px0)
        fy = int(lm.y * ch + py0)
        cv2.circle(annotated, (fx, fy), 5, (0, 255, 255), -1, cv2.LINE_AA)
    SKELETON = [
        (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
        (11, 23), (12, 24), (23, 24),
        (23, 25), (25, 27), (24, 26), (26, 28),
        (0, 11), (0, 12),
    ]
    for a, b in SKELETON:
        ax = int(lms[a].x * cw + px0); ay = int(lms[a].y * ch + py0)
        bx = int(lms[b].x * cw + px0); by_ = int(lms[b].y * ch + py0)
        cv2.line(annotated, (ax, ay), (bx, by_), (0, 200, 255), 2, cv2.LINE_AA)
    cv2.rectangle(annotated, (px0, py0), (px1, py1), (255, 0, 255), 2)
    target_w = 700
    sc = target_w / W
    thumb = cv2.resize(annotated, (target_w, int(H * sc)))
    cv2.imwrite(out_path, thumb)
    print(f"\n-> {out_path}")
    cap.release()
    landmarker.close()


if __name__ == "__main__":
    main()
