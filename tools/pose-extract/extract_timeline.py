"""Extract a per-frame MediaPipe pose timeline for one video.

Usage:
  python extract_timeline.py <video> <out_name>

e.g.  python extract_timeline.py videos/jab.mp4 jab
      -> writes ../../public/timelines/jab.json

Each entry: {"t": <seconds>, "vis_min": <0..1>, "pose": [x0, y0, ...] | null}
- 13 joints in KEYS order: head, lSh, rSh, lEl, rEl, lWr, rWr, lHip, rHip, lKnee, rKnee, lAnk, rAnk
- Coordinates are raw 0..1 fractions of full frame (no normalization).
- Anatomical MediaPipe mapping (lSh = landmark 11 = subject's anatomical left shoulder).
  We do not flip to screen-relative — flipping per-frame breaks if the fighter rotates.
  The renderer draws geometry from joint pairs; the lSh/rSh label is bookkeeping.
- Frames with vis_min < 0.5 across the tracked 13 joints emit pose: null so the
  renderer can hide the skeleton briefly during occlusion.
"""
import json
import os
import sys
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import MODEL_PATH, ensure_model

# Anatomical MediaPipe landmark indices for the 13 KEYS:
#   head=0(nose), lSh=11, rSh=12, lEl=13, rEl=14, lWr=15, rWr=16,
#   lHip=23, rHip=24, lKnee=25, rKnee=26, lAnk=27, rAnk=28
IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
VIS_MIN_THRESH = 0.5


def main():
    video_path = sys.argv[1]
    out_name = sys.argv[2]
    ensure_model()

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"video: {video_path}  {W}x{H}  fps={fps:.3f}  frames={total_frames}")

    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.3,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = mp_vision.PoseLandmarker.create_from_options(options)

    timeline = []
    hidden_count = 0
    no_pose_count = 0
    frame_idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        t = frame_idx / fps
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(frame_idx * 1000 / fps)
        det = landmarker.detect_for_video(mp_image, timestamp_ms)

        if not det.pose_landmarks:
            timeline.append({"t": round(t, 3), "vis_min": 0.0, "pose": None})
            no_pose_count += 1
        else:
            lms = det.pose_landmarks[0]
            vis_min = min(lms[i].visibility for i in IDX)
            if vis_min < VIS_MIN_THRESH:
                timeline.append({"t": round(t, 3), "vis_min": round(vis_min, 3), "pose": None})
                hidden_count += 1
            else:
                pose = []
                for i in IDX:
                    pose.append(round(lms[i].x, 4))
                    pose.append(round(lms[i].y, 4))
                timeline.append({"t": round(t, 3), "vis_min": round(vis_min, 3), "pose": pose})

        frame_idx += 1
        if frame_idx % 200 == 0:
            print(f"  frame {frame_idx}/{total_frames}  (hidden={hidden_count}, no-pose={no_pose_count})")

    cap.release()
    landmarker.close()

    # Resolve output path relative to repo root (script lives in tools/pose-extract/)
    script_dir = Path(__file__).parent
    out_dir = script_dir.parent.parent / "public" / "timelines"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{out_name}.json"

    payload = {
        "video": os.path.basename(video_path),
        "fps": round(fps, 3),
        "frames": frame_idx,
        "width": W,
        "height": H,
        "vis_min_thresh": VIS_MIN_THRESH,
        "keys": ["head", "lSh", "rSh", "lEl", "rEl", "lWr", "rWr",
                 "lHip", "rHip", "lKnee", "rKnee", "lAnk", "rAnk"],
        "entries": timeline,
    }
    with open(out_path, "w") as f:
        json.dump(payload, f, separators=(",", ":"))

    size = out_path.stat().st_size
    print(f"\n-> {out_path}")
    print(f"   {len(timeline)} entries, {hidden_count} hidden (low vis), {no_pose_count} no-pose")
    print(f"   file size: {size:,} bytes ({size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
