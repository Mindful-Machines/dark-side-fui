#!/usr/bin/env python3
"""Sample RGB immediately inside/outside the cardiac video rectangle."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

# 1920×1080 capture geometry measured from V1 cardiac-3d-lab-0000.png
EDGES = {
    "left": {"inside": (308, 540), "outside": (292, 540)},
    "right": {"inside": (1591, 540), "outside": (1607, 540)},
    "top": {"inside": (960, 268), "outside": (960, 242)},
    "bottom": {"inside": (960, 842), "outside": (960, 868)},
}


def rgb(im: Image.Image, xy: tuple[int, int]) -> tuple[int, int, int]:
    p = im.getpixel(xy)
    return (p[0], p[1], p[2])


def diff(a: tuple[int, int, int], b: tuple[int, int, int]) -> dict:
    d = tuple(abs(a[i] - b[i]) for i in range(3))
    return {"rgb": d, "max": max(d), "mean": sum(d) / 3}


def main() -> None:
    folder = Path(sys.argv[1])
    frames = [int(x) for x in sys.argv[2:]]
    samples = []
    maxes = []
    means = []
    for f in frames:
        path = folder / f"frame_{f:04d}.png"
        im = Image.open(path).convert("RGB")
        row = {"frame": f, "size": list(im.size), "edges": {}}
        for name, pts in EDGES.items():
            inside = rgb(im, pts["inside"])
            outside = rgb(im, pts["outside"])
            d = diff(inside, outside)
            row["edges"][name] = {"inside": inside, "outside": outside, **d}
            maxes.append(d["max"])
            means.append(d["mean"])
        samples.append(row)
    print(
        json.dumps(
            {
                "frames": samples,
                "maxRgbDiff": max(maxes) if maxes else 0,
                "meanRgbDiff": (sum(means) / len(means)) if means else 0,
            }
        )
    )


if __name__ == "__main__":
    main()
