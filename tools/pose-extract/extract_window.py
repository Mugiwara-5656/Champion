"""Extract a window of frames around a target timestamp and build a sheet.

Usage:
  python extract_window.py <video> <t_start> <t_end> <step> <tag> [cols=5]
"""
import os
import sys

import cv2
import numpy as np


def main():
    video = sys.argv[1]
    t_start = float(sys.argv[2])
    t_end = float(sys.argv[3])
    step = float(sys.argv[4])
    tag = sys.argv[5]

    out_dir = os.path.join("tools", "pose-extract", "frames")
    os.makedirs(out_dir, exist_ok=True)

    cap = cv2.VideoCapture(video)
    if not cap.isOpened():
        print(f"ERROR: cannot open {video}")
        sys.exit(2)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Video: {video}  fps={fps:.3f}  total={total}")

    timestamps = []
    t = t_start
    while t <= t_end + 1e-6:
        timestamps.append(round(t, 3))
        t += step

    thumbs = []
    for idx, ts in enumerate(timestamps, start=1):
        fnum = int(round(ts * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
        ok, frame = cap.read()
        if not ok:
            print(f"  miss t={ts}s frame={fnum}")
            continue
        h, w = frame.shape[:2]
        target_w = 480
        scale = target_w / w
        thumb = cv2.resize(frame, (target_w, int(h * scale)))
        cv2.rectangle(thumb, (0, 0), (target_w, 28), (0, 0, 0), -1)
        label = f"#{idx:02d}  t={ts:6.3f}s  frame={fnum}"
        cv2.putText(thumb, label, (8, 20), cv2.FONT_HERSHEY_SIMPLEX,
                    0.46, (255, 255, 255), 1, cv2.LINE_AA)
        thumbs.append(thumb)
        out_path = os.path.join(out_dir, f"{tag}_{idx:02d}.png")
        cv2.imwrite(out_path, thumb)
        print(f"  #{idx:02d}  t={ts:6.3f}s  frame={fnum}  -> {out_path}")

    cols = int(sys.argv[6]) if len(sys.argv) > 6 else 5
    h, w = thumbs[0].shape[:2]
    rows = (len(thumbs) + cols - 1) // cols
    sheet = np.full((rows * h, cols * w, 3), 24, dtype=np.uint8)
    for i, t in enumerate(thumbs):
        r, c = divmod(i, cols)
        sheet[r * h:(r + 1) * h, c * w:(c + 1) * w] = t
    sheet_path = os.path.join(out_dir, f"{tag}_sheet.png")
    cv2.imwrite(sheet_path, sheet)
    print(f"\nSheet: {sheet_path}  ({sheet.shape[1]}x{sheet.shape[0]})")

    cap.release()


if __name__ == "__main__":
    main()
