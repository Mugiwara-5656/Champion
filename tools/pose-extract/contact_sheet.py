"""Compose all <tech>_NN.png thumbnails into a single contact sheet PNG.

Usage:
  python contact_sheet.py <tech_name> [cols=4]
"""
import glob
import os
import sys

import cv2
import numpy as np


def main():
    tech = sys.argv[1]
    cols = int(sys.argv[2]) if len(sys.argv) > 2 else 4

    pattern = os.path.join("tools", "pose-extract", "frames", f"{tech}_*.png")
    paths = sorted(glob.glob(pattern))
    if not paths:
        print(f"No thumbnails matching {pattern}")
        sys.exit(1)

    images = [cv2.imread(p) for p in paths]
    h, w = images[0].shape[:2]
    rows = (len(images) + cols - 1) // cols
    sheet = np.full((rows * h, cols * w, 3), 24, dtype=np.uint8)
    for idx, img in enumerate(images):
        r, c = divmod(idx, cols)
        sheet[r*h:(r+1)*h, c*w:(c+1)*w] = img

    out_path = os.path.join("tools", "pose-extract", "frames", f"{tech}_sheet.png")
    cv2.imwrite(out_path, sheet)
    print(f"{rows}x{cols} contact sheet -> {out_path} ({sheet.shape[1]}x{sheet.shape[0]})")


if __name__ == "__main__":
    main()
