"""Scan a clip for genuine roundhouse hip-drive / chamber frames WITHOUT a vis
gate, so we can see whether such frames exist and what their true visibility is.

A hip-drive frame = kicking knee clearly ABOVE the hip line, kicking ankle
extended laterally (not tucked straight under the knee), other foot planted.
Reports the top frames by a hip-drive quality score with honest vis_min.

Usage:
  python scan_hipdrive.py <video> [step=1] [top=15]
"""
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from extract_poses import normalize, MODEL_PATH, ensure_model


def main():
    video = sys.argv[1]
    step = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    top = int(sys.argv[3]) if len(sys.argv) > 3 else 15
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

    cands = []
    fnum = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if fnum % step != 0:
            fnum += 1
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        det = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        if det.pose_landmarks:
            p, orient, vis = normalize(det.pose_landmarks[0])
            hip_mid_x = (p["lHip"][0] + p["rHip"][0]) / 2
            hip_mid_y = (p["lHip"][1] + p["rHip"][1]) / 2

            def drive(knee, ank, other_ank):
                knee_elev = hip_mid_y - knee[1]        # >0 => knee above hip
                if knee_elev <= 0.02:
                    return None
                ank_lat = abs(ank[0] - knee[0])        # ankle swung out from knee
                planted = other_ank[1] - hip_mid_y     # support foot below hips
                if planted <= 0:
                    return None
                return knee_elev + 0.6 * ank_lat

            dl = drive(p["lKnee"], p["lAnk"], p["rAnk"])
            dr = drive(p["rKnee"], p["rAnk"], p["lAnk"])
            best = None
            if dl is not None:
                best = (dl, "l")
            if dr is not None and (best is None or dr > best[0]):
                best = (dr, "r")
            if best is not None:
                cands.append((best[0], fnum, round(fnum / fps, 2), vis, best[1], p))
        fnum += 1
    cap.release()
    lm.close()

    cands.sort(key=lambda c: -c[0])
    print(f"{len(cands)} hip-drive-geometry frames found\n")
    print(f"{'rank':>4} {'frame':>6} {'t(s)':>7} {'vis':>5} {'score':>6} {'kick':>4}  knee/hip/ank")
    for i, (score, fnum, ts, vis, side, p) in enumerate(cands[:top], 1):
        knee = p[f"{side}Knee"]
        ank = p[f"{side}Ank"]
        hip_mid_y = (p["lHip"][1] + p["rHip"][1]) / 2
        print(f"{i:>4} {fnum:>6} {ts:>7.2f} {vis:>5.2f} {score:>6.3f} {side:>4}  "
              f"knee_y={knee[1]:.2f} hip_y={hip_mid_y:.2f} ank={ank}")


if __name__ == "__main__":
    main()
