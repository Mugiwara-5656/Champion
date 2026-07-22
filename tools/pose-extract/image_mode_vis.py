"""Per-frame IMAGE-mode (stateless) MediaPipe vis probe for a whole clip.
Reports vis_min per frame so we can compare against VIDEO-mode tracking.

Usage:
  python image_mode_vis.py <video>
"""
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import MODEL_PATH, ensure_model

IDX = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]


def main():
    video = sys.argv[1]
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

    vis_list = []
    fnum = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        det = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        if not det.pose_landmarks:
            vis = 0.0
        else:
            j = det.pose_landmarks[0]
            vis = min(j[i].visibility for i in IDX)
        vis_list.append(vis)
        print(f"  f{fnum:02d} t={fnum/fps:.3f} vis_min={vis:.3f}")
        fnum += 1
    cap.release()
    lm.close()
    n = len(vis_list)
    over3 = sum(1 for v in vis_list if v >= 0.3)
    over5 = sum(1 for v in vis_list if v >= 0.5)
    print(f"\nIMAGE-mode: {n} frames  min={min(vis_list):.3f} max={max(vis_list):.3f} "
          f"mean={sum(vis_list)/n:.3f}  >=0.3: {over3}/{n}  >=0.5: {over5}/{n}")


if __name__ == "__main__":
    main()
