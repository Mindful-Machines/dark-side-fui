"""Render the approved motion-storyboard loop as a 640x360 / 30 fps / 15 s preview.

Does not change animation, materials, scan, heartbeat, camera or timing.
Opens blends/heart_motion_storyboard.blend, renders production frames 0–449
only (frame 450 is the loop-check and is not encoded), then encodes H.264
with Blender's bundled FFmpeg. Temporary PNG frames are gitignored.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P apps/mind-operations-center/lab/cardiac-3d/scripts/render_heart_motion_preview.py
"""

import os
import time
from pathlib import Path

import bpy

PHASE = os.environ.get("PREVIEW_PHASE", "all")

LAB = Path(__file__).resolve().parent.parent
SRC_BLEND = LAB / "blends" / "heart_motion_storyboard.blend"
PNG_DIR = LAB / "renders" / "motion-preview"
MP4_OUT = LAB / "exports" / "heart_motion_preview_640x360_15s.mp4"
STAGE = (8 / 255, 10 / 255, 11 / 255, 1.0)

FPS = 30
FIRST = 0
LAST = 449  # exclusive of the loop-check frame 450
SAMPLES = 16
RES = (640, 360)


def render_png_sequence():
    if not SRC_BLEND.exists():
        raise SystemExit(f"missing storyboard blend: {SRC_BLEND}")
    bpy.ops.wm.open_mainfile(filepath=str(SRC_BLEND))
    scene = bpy.context.scene
    scene.frame_start = FIRST
    scene.frame_end = LAST
    scene.render.fps = FPS
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = SAMPLES
    scene.eevee.use_raytracing = False
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.use_overwrite = True
    scene.render.use_file_extension = True
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(PNG_DIR / "frame_")
    print(f"[preview] 3D render frames {FIRST}-{LAST} -> {PNG_DIR}")
    start = time.time()
    bpy.ops.render.render(animation=True)
    print(f"[preview] 3D render time {time.time() - start:.1f}s")


def encode_mp4():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.sequence_editor_create()
    first = str(PNG_DIR / f"comp_{FIRST:04d}.png")
    strip = scene.sequence_editor.sequences.new_image("preview", first, 1, 1)
    for i in range(FIRST + 1, LAST + 1):
        strip.elements.append(f"comp_{i:04d}.png")
    strip.frame_final_duration = LAST - FIRST + 1

    scene.frame_start = 1
    scene.frame_end = LAST - FIRST + 1
    scene.render.fps = FPS
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.use_sequencer = True
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.ffmpeg.audio_codec = "NONE"
    scene.render.ffmpeg.gopsize = FPS
    if hasattr(scene.render.ffmpeg, "pixel_format"):
        scene.render.ffmpeg.pixel_format = "YUV420P"
    MP4_OUT.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(MP4_OUT)
    print(f"[preview] encode {scene.frame_end} frames -> {MP4_OUT}")
    start = time.time()
    bpy.ops.render.render(animation=True)
    print(f"[preview] encode time {time.time() - start:.1f}s")


def main():
    t0 = time.time()
    if PHASE == "encode":
        encode_mp4()
    else:
        render_png_sequence()
    print(f"[preview] phase={PHASE} {time.time() - t0:.1f}s")
    print(f"[preview] frames {FIRST}-{LAST} inclusive ({LAST - FIRST + 1}) -> {MP4_OUT if PHASE == 'encode' else PNG_DIR}")


main()
