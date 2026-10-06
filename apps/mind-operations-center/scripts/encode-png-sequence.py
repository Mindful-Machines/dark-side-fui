"""Encode a PNG sequence with Blender's bundled FFmpeg.

Usage:
  Blender -b --factory-startup -P encode-png-sequence.py -- \\
    --frames DIR --out FILE --fps 30 --first 0 --last 449
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--first", type=int, default=0)
    parser.add_argument("--last", type=int, default=449)
    parser.add_argument("--width", type=int, default=0)
    parser.add_argument("--height", type=int, default=0)
    return parser.parse_args(argv)


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    args = parse_args(argv)
    frames = Path(args.frames)
    first = frames / f"frame_{args.first:04d}.png"
    if not first.exists():
        raise SystemExit(f"missing {first}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    probe = bpy.data.images.load(str(first))
    width = args.width or int(probe.size[0])
    height = args.height or int(probe.size[1])
    bpy.data.images.remove(probe)

    scene = bpy.context.scene
    scene.sequence_editor_create()
    strip = scene.sequence_editor.sequences.new_image("capture", str(first), 1, 1)
    for i in range(args.first + 1, args.last + 1):
        strip.elements.append(f"frame_{i:04d}.png")
    count = args.last - args.first + 1
    strip.frame_final_duration = count
    scene.frame_start = 1
    scene.frame_end = count
    scene.render.fps = args.fps
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.use_sequencer = True
    scene.view_settings.view_transform = "Standard"
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "LOW"
    scene.render.ffmpeg.ffmpeg_preset = "BEST"
    scene.render.ffmpeg.audio_codec = "NONE"
    scene.render.ffmpeg.gopsize = args.fps
    if hasattr(scene.render.ffmpeg, "pixel_format"):
        scene.render.ffmpeg.pixel_format = "YUV420P"

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out)
    print(f"[encode] {count} frames {width}x{height} @{args.fps} -> {out}")
    bpy.ops.render.render(animation=True)
    print("[encode] done")


if __name__ == "__main__":
    main()
