"""Run MediaPipe on a single frame, normalize per the jab anchor rule, and
print the pose() literal in poses.js KEYS order.

Usage:
  python normalize_one.py <video> <frame_num> <label> [--bbox|--hybrid]

--bbox uses bounding-box normalization instead of the head-ankle anchor rule:
uniform scale fitting the full landmark bbox vertically into [.09, .90],
centered horizontally at .50.
--hybrid takes vertical scaling from the full landmark bbox (as --bbox) but
anchors the hip midpoint at x=.50 (as the anchor rule), so keyframes keep a
stable hip pivot while kicks can't break the vertical anchors.
"""
import os
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import normalize, MODEL_PATH, ensure_model

KEYS = ["head", "lSh", "rSh", "lEl", "rEl", "lWr", "rWr",
        "lHip", "rHip", "lKnee", "rKnee", "lAnk", "rAnk"]


def normalize_pose(p):
    head_y = p["head"][1]
    max_ank_y = max(p["lAnk"][1], p["rAnk"][1])
    hip_mid_x = (p["lHip"][0] + p["rHip"][0]) / 2
    s = (0.90 - 0.09) / (max_ank_y - head_y)
    out = {}
    for k, (x, y) in p.items():
        out[k] = [
            round(0.50 + (x - hip_mid_x) * s, 3),
            round(0.09 + (y - head_y) * s, 3),
        ]
    return out, s, head_y, max_ank_y, hip_mid_x


def normalize_pose_bbox(p):
    """Bounding-box alternative to the head-ankle anchor rule.

    Uniform scale (aspect ratio preserved) chosen so the landmark bounding
    box's vertical extent maps onto [.09, .90]; the box is centered
    horizontally at .50. Unlike the anchor rule this never relies on head
    being topmost or an ankle bottom-most, so it stays sane on kicks where
    a limb crosses those anchors. Note: it re-centers on the bbox, not the
    hips — poses with an extended limb shift the whole figure relative to
    anchor-rule output (jab_ext differs by ~.054 in x).
    """
    xs = [x for x, _ in p.values()]
    ys = [y for _, y in p.values()]
    min_y, max_y = min(ys), max(ys)
    cx = (min(xs) + max(xs)) / 2
    s = (0.90 - 0.09) / (max_y - min_y)
    out = {}
    for k, (x, y) in p.items():
        out[k] = [
            round(0.50 + (x - cx) * s, 3),
            round(0.09 + (y - min_y) * s, 3),
        ]
    return out, s, min_y, max_y, cx


def normalize_pose_hybrid(p):
    """Hybrid rule: bbox vertical, hip-anchored horizontal. Uniform scale.

    Scale comes from the full landmark bbox's vertical extent mapped onto
    [.09, .90] (robust when a limb crosses the head/ankle anchors); the hip
    midpoint is pinned at x=.50 (stable pivot across keyframes, matching the
    existing poses.js literals). On poses where head is topmost and an ankle
    bottom-most this reproduces the anchor rule exactly.
    """
    ys = [y for _, y in p.values()]
    min_y, max_y = min(ys), max(ys)
    hip_mid_x = (p["lHip"][0] + p["rHip"][0]) / 2
    s = (0.90 - 0.09) / (max_y - min_y)
    out = {}
    for k, (x, y) in p.items():
        out[k] = [
            round(0.50 + (x - hip_mid_x) * s, 3),
            round(0.09 + (y - min_y) * s, 3),
        ]
    return out, s, min_y, max_y, hip_mid_x


def emit_literal(label, pose):
    parts = []
    for k in KEYS:
        x, y = pose[k]
        parts.append(f"{x:.3f}".rstrip("0").rstrip("."))
        parts.append(f"{y:.3f}".rstrip("0").rstrip("."))
    # rebuild with trailing zeros where needed for readability
    parts = [f"{pose[k][i]:.3f}" for k in KEYS for i in (0, 1)]
    parts = [p.rstrip("0").rstrip(".") if p.endswith("0") else p for p in parts]
    pretty = ",".join(p if p.startswith("-") or "." in p else p + ".0" for p in parts)
    print(f"{label}: pose({pretty}),")


def main():
    video = sys.argv[1]
    fnum = int(sys.argv[2])
    label = sys.argv[3]
    ensure_model()
    cap = cv2.VideoCapture(video)
    cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
    ok, frame = cap.read()
    if not ok:
        print(f"ERROR: cannot read frame {fnum} from {video}")
        sys.exit(2)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
    )
    landmarker = mp_vision.PoseLandmarker.create_from_options(options)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    det = landmarker.detect(mp_image)
    if not det.pose_landmarks:
        print("ERROR: no pose detected")
        sys.exit(3)
    raw, orient, vis = normalize(det.pose_landmarks[0])
    print(f"raw: orient={orient}  vis={vis}")
    print(f"  head={raw['head']}  lAnk={raw['lAnk']}  rAnk={raw['rAnk']}  "
          f"hip_mid_x={(raw['lHip'][0]+raw['rHip'][0])/2:.3f}")
    if "--bbox" in sys.argv[4:]:
        norm, s, min_y, max_y, cx = normalize_pose_bbox(raw)
        print(f"  bbox scale s={s:.4f}  min_y_old={min_y}  max_y_old={max_y}  cx_old={cx:.3f}")
    elif "--hybrid" in sys.argv[4:]:
        norm, s, min_y, max_y, hip_mid_x = normalize_pose_hybrid(raw)
        print(f"  hybrid scale s={s:.4f}  min_y_old={min_y}  max_y_old={max_y}  hip_mid_x_old={hip_mid_x:.3f}")
    else:
        norm, s, head_y, max_ank_y, hip_mid_x = normalize_pose(raw)
        print(f"  scale s={s:.4f}  head_y_old={head_y}  max_ank_y_old={max_ank_y}  hip_mid_x_old={hip_mid_x}")
    emit_literal(label, norm)
    cap.release()
    landmarker.close()


if __name__ == "__main__":
    main()
