"""Sample N frames from a video, run MediaPipe Pose on each, save annotated
thumbnails + a JSON of normalized 13-key poses. Screen-relative lSh/rSh
convention: lSh = whichever shoulder is on the left of the canvas (lower x).

Uses the MediaPipe Tasks API (PoseLandmarker). Auto-downloads the model on
first run into tools/pose-extract/models/.

Usage:
  python extract_poses.py <video_path> <tech_name> [n_samples=12]
"""
import json
import os
import sys
import urllib.request

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

KEYS = ["head", "lSh", "rSh", "lEl", "rEl", "lWr", "rWr",
        "lHip", "rHip", "lKnee", "rKnee", "lAnk", "rAnk"]

# MediaPipe pose landmark indices for [shoulder, elbow, wrist, hip, knee, ankle]
ANAT_LEFT_IDX = [11, 13, 15, 23, 25, 27]   # subject's anatomical LEFT
ANAT_RIGHT_IDX = [12, 14, 16, 24, 26, 28]  # subject's anatomical RIGHT
PAIRED = ["Sh", "El", "Wr", "Hip", "Knee", "Ank"]

# Subset of POSE_CONNECTIONS — body skeleton only (skip face mesh)
SKELETON = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (25, 27), (24, 26), (26, 28),
    (0, 11), (0, 12),
]

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_full/float16/latest/pose_landmarker_full.task"
)
MODEL_DIR = os.path.join("tools", "pose-extract", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "pose_landmarker_full.task")


def ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    os.makedirs(MODEL_DIR, exist_ok=True)
    print(f"Downloading model -> {MODEL_PATH}")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print(f"  done ({os.path.getsize(MODEL_PATH)} bytes)")


def normalize(landmarks):
    """Convert NormalizedLandmark list → 13-key dict in screen-relative form.
    Returns (pose_dict, orient_str, min_visibility).
    """
    l_sh = landmarks[11]
    r_sh = landmarks[12]
    if l_sh.x > r_sh.x:
        screen_left = ANAT_RIGHT_IDX
        screen_right = ANAT_LEFT_IDX
        orient = "facing_camera"
    else:
        screen_left = ANAT_LEFT_IDX
        screen_right = ANAT_RIGHT_IDX
        orient = "facing_away"

    head = landmarks[0]
    pose = {"head": [round(head.x, 3), round(head.y, 3)]}
    vis_min = head.visibility
    for idx, name in zip(screen_left, PAIRED):
        lm = landmarks[idx]
        pose[f"l{name}"] = [round(lm.x, 3), round(lm.y, 3)]
        vis_min = min(vis_min, lm.visibility)
    for idx, name in zip(screen_right, PAIRED):
        lm = landmarks[idx]
        pose[f"r{name}"] = [round(lm.x, 3), round(lm.y, 3)]
        vis_min = min(vis_min, lm.visibility)
    return pose, orient, round(vis_min, 2)


def draw_skeleton(frame, landmarks):
    h, w = frame.shape[:2]
    pts = [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]
    for a, b in SKELETON:
        cv2.line(frame, pts[a], pts[b], (0, 200, 255), 2, cv2.LINE_AA)
    for i in range(len(pts)):
        if i > 32:
            break
        cv2.circle(frame, pts[i], 3, (0, 255, 255), -1, cv2.LINE_AA)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    video_path = sys.argv[1]
    tech_name = sys.argv[2]
    n_samples = int(sys.argv[3]) if len(sys.argv) > 3 else 12

    ensure_model()

    out_frames = os.path.join("tools", "pose-extract", "frames")
    out_poses = os.path.join("tools", "pose-extract", "poses")
    os.makedirs(out_frames, exist_ok=True)
    os.makedirs(out_poses, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: cannot open {video_path}")
        sys.exit(2)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total / fps if fps else 0.0
    print(f"Video: {video_path}")
    print(f"  total frames: {total}, fps: {fps:.2f}, duration: {duration:.2f}s")

    sample_frames = [int((i + 1) * total / (n_samples + 1)) for i in range(n_samples)]

    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
    )
    landmarker = mp_vision.PoseLandmarker.create_from_options(options)

    results = []
    for i, fnum in enumerate(sample_frames, start=1):
        cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
        ok, frame = cap.read()
        if not ok:
            print(f"  #{i:02d} frame {fnum}: read failed")
            continue
        h, w = frame.shape[:2]

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        det = landmarker.detect(mp_image)

        norm = orient = vis = None
        if det.pose_landmarks:
            lms = det.pose_landmarks[0]
            norm, orient, vis = normalize(lms)
            draw_skeleton(frame, lms)

        target_w = 480
        scale = target_w / w
        thumb = cv2.resize(frame, (target_w, int(h * scale)))

        ts = fnum / fps if fps else 0
        label = f"#{i:02d}  t={ts:5.2f}s  vis={vis if vis else 'no-detect'}"
        cv2.rectangle(thumb, (0, 0), (target_w, 26), (0, 0, 0), -1)
        cv2.putText(thumb, label, (8, 19), cv2.FONT_HERSHEY_SIMPLEX,
                    0.5, (255, 255, 255), 1, cv2.LINE_AA)

        thumb_path = os.path.join(out_frames, f"{tech_name}_{i:02d}.png")
        cv2.imwrite(thumb_path, thumb)

        results.append({
            "n": i,
            "frame": fnum,
            "ts": round(ts, 3),
            "thumb": thumb_path,
            "orient": orient,
            "vis_min": vis,
            "pose": norm,
        })
        flag = "OK  " if norm else "MISS"
        print(f"  [{flag}] #{i:02d}  frame {fnum:5d}  t={ts:5.2f}s  "
              f"orient={orient or '-':<14}  vis_min={vis if vis is not None else '-'}")

    cap.release()
    landmarker.close()

    json_path = os.path.join(out_poses, f"{tech_name}.json")
    with open(json_path, "w") as f:
        json.dump({
            "video": video_path,
            "fps": fps,
            "total_frames": total,
            "duration_s": round(duration, 2),
            "convention": "screen-relative (lSh = lower x)",
            "samples": results,
        }, f, indent=2)
    print(f"\nJSON: {json_path}")
    print(f"Thumbnails: {out_frames}/{tech_name}_NN.png")


if __name__ == "__main__":
    main()
