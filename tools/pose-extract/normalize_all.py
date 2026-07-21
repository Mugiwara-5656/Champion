"""Compute normalized pose() literals for the 3 roundhouse poses we will write.

- mt_stance: from roundhouse.json sample n=12 (frame 9369)
- mt_chamber: from roundhouse.json sample n=9 (frame 7026)
- mt_impact: re-run MediaPipe on roundhouse_v2.mp4 frame 732 (t=29.30s)

All normalized via:
  s = (.90 - .09) / (max_ank_y - head_y)
  y_new = .09 + (y - head_y) * s
  x_new = .50 + (x - hip_mid_x) * s
"""
import json
import os

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import normalize, MODEL_PATH, ensure_model

KEYS = ["head", "lSh", "rSh", "lEl", "rEl", "lWr", "rWr",
        "lHip", "rHip", "lKnee", "rKnee", "lAnk", "rAnk"]


def norm_pose(p):
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
    return out, s


def fmt(v):
    s = f"{v:.3f}"
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return s


def emit(label, pose):
    parts = []
    for k in KEYS:
        x, y = pose[k]
        parts.append(fmt(x))
        parts.append(fmt(y))
    print(f"  {label}: pose({','.join(parts)}),")


def from_v1_sample(n_target):
    with open(os.path.join("tools", "pose-extract", "poses", "roundhouse.json")) as f:
        data = json.load(f)
    for s in data["samples"]:
        if s["n"] == n_target:
            return s["pose"], s["frame"], s["ts"]
    raise SystemExit(f"sample n={n_target} not found")


def from_v2_frame(fnum):
    video = os.path.join("tools", "pose-extract", "videos", "roundhouse_v2.mp4")
    ensure_model()
    cap = cv2.VideoCapture(video)
    cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
    ok, frame = cap.read()
    if not ok:
        raise SystemExit(f"cannot read frame {fnum} from {video}")
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
        raise SystemExit("no pose detected")
    raw, orient, vis = normalize(det.pose_landmarks[0])
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.release()
    landmarker.close()
    return raw, orient, vis, fnum, fnum / fps


def main():
    print("=== mt_stance  (v1 frame 9369, t=312.61s) ===")
    raw, fnum, ts = from_v1_sample(12)
    print(f"raw head={raw['head']}  lAnk={raw['lAnk']}  rAnk={raw['rAnk']}  "
          f"hip_mid_x={(raw['lHip'][0]+raw['rHip'][0])/2:.3f}")
    n, s = norm_pose(raw)
    print(f"scale={s:.4f}")
    emit("mt_stance", n)

    print("\n=== mt_chamber  (v1 frame 7026, t=234.43s) ===")
    raw, fnum, ts = from_v1_sample(9)
    print(f"raw head={raw['head']}  lAnk={raw['lAnk']}  rAnk={raw['rAnk']}  "
          f"hip_mid_x={(raw['lHip'][0]+raw['rHip'][0])/2:.3f}")
    n, s = norm_pose(raw)
    print(f"scale={s:.4f}")
    emit("mt_chamber", n)

    print("\n=== mt_impact  (v2 frame 732, t=29.30s) ===")
    raw, orient, vis, fnum, ts = from_v2_frame(732)
    print(f"raw orient={orient}  vis={vis}")
    print(f"raw head={raw['head']}  lAnk={raw['lAnk']}  rAnk={raw['rAnk']}  "
          f"hip_mid_x={(raw['lHip'][0]+raw['rHip'][0])/2:.3f}")
    n, s = norm_pose(raw)
    print(f"scale={s:.4f}")
    emit("mt_impact", n)


if __name__ == "__main__":
    main()
