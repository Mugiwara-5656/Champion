"""Coarse full-clip locate sheet: sample a long source at a fixed interval
and tile the frames with burned-in T= timestamps, so you can eyeball where a
technique happens before trimming. Same approach as the jab trimcheck sheet
(extract at timestamps -> burn label -> tile), tuned for a multi-minute clip:
smaller tiles + more columns so the whole clip fits on one viewable sheet.

Usage:
  python locate_sheet.py <video> <step_seconds> <tag> [cols=12] [tile_w=240]
"""
import os
import sys

import cv2
import numpy as np


def main():
    video = sys.argv[1]
    step = float(sys.argv[2])
    tag = sys.argv[3]
    cols = int(sys.argv[4]) if len(sys.argv) > 4 else 12
    tile_w = int(sys.argv[5]) if len(sys.argv) > 5 else 240

    out_dir = os.path.join("tools", "pose-extract", "frames")
    os.makedirs(out_dir, exist_ok=True)

    cap = cv2.VideoCapture(video)
    if not cap.isOpened():
        print(f"ERROR: cannot open {video}")
        sys.exit(2)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total / fps
    print(f"Video: {video}  fps={fps:.3f}  frames={total}  duration={duration:.3f}s")

    timestamps = []
    t = 0.0
    while t <= duration - 1e-6:
        timestamps.append(round(t, 3))
        t += step

    thumbs = []
    for ts in timestamps:
        fnum = int(round(ts * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
        ok, frame = cap.read()
        if not ok:
            print(f"  miss T={ts}s frame={fnum}")
            continue
        h, w = frame.shape[:2]
        scale = tile_w / w
        thumb = cv2.resize(frame, (tile_w, int(h * scale)))
        cv2.rectangle(thumb, (0, 0), (tile_w, 18), (0, 0, 0), -1)
        mm, ss = divmod(int(ts), 60)
        label = f"T={ts:g}s ({mm}:{ss:02d})"
        cv2.putText(thumb, label, (5, 13), cv2.FONT_HERSHEY_SIMPLEX,
                    0.40, (0, 255, 120), 1, cv2.LINE_AA)
        thumbs.append(thumb)

    print(f"Sampled {len(thumbs)} tiles at {step}s intervals")
    th, tw = thumbs[0].shape[:2]
    rows = (len(thumbs) + cols - 1) // cols
    sheet = np.full((rows * th, cols * tw, 3), 24, dtype=np.uint8)
    for i, thumb in enumerate(thumbs):
        r, c = divmod(i, cols)
        sheet[r * th:(r + 1) * th, c * tw:(c + 1) * tw] = thumb
    sheet_path = os.path.join(out_dir, f"{tag}_sheet.png")
    cv2.imwrite(sheet_path, sheet)
    print(f"Sheet: {sheet_path}  ({sheet.shape[1]}x{sheet.shape[0]})  grid={rows}x{cols}")

    cap.release()


if __name__ == "__main__":
    main()
