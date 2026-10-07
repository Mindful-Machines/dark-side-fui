#!/usr/bin/env python3
from pathlib import Path
import sys

from PIL import Image

MATTE = (10, 12, 10, 255)


def main() -> None:
    folder = Path(sys.argv[1])
    first, last = int(sys.argv[2]), int(sys.argv[3])
    for i in range(first, last + 1):
        path = folder / f"frame_{i:04d}.png"
        im = Image.open(path).convert("RGBA")
        bg = Image.new("RGBA", im.size, MATTE)
        Image.alpha_composite(bg, im).convert("RGB").save(path)
        if i % 50 == 0:
            print(f"[v11] composited {i}", flush=True)


if __name__ == "__main__":
    main()
