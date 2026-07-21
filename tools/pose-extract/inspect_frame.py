"""Print per-key visibility + render annotated frame for a single frame."""
import os
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import MODEL_PATH, ensure_model, draw_skeleton, ANAT_LEFT_IDX, ANAT_RIGHT_IDX, PAIRED


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
        print("no pose detected")
        return
    lms = det.pose_landmarks[0]
    print(f"head idx=0: x={lms[0].x:.3f}  y={lms[0].y:.3f}  vis={lms[0].visibility:.3f}")
    for idx, name in zip(ANAT_LEFT_IDX, PAIRED):
        lm = lms[idx]
        print(f"  ANAT_L {name} idx={idx}: x={lm.x:.3f}  y={lm.y:.3f}  vis={lm.visibility:.3f}")
    for idx, name in zip(ANAT_RIGHT_IDX, PAIRED):
        lm = lms[idx]
        print(f"  ANAT_R {name} idx={idx}: x={lm.x:.3f}  y={lm.y:.3f}  vis={lm.visibility:.3f}")
    draw_skeleton(frame, lms)
    h, w = frame.shape[:2]
    target_w = 600
    s = target_w / w
    thumb = cv2.resize(frame, (target_w, int(h * s)))
    cv2.imwrite(out_path, thumb)
    print(f"\n-> {out_path}")
    cap.release()
    landmarker.close()


if __name__ == "__main__":
    main()
