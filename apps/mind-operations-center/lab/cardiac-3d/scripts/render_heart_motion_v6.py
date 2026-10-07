"""V6 15 s cardiac scan plate.

Approved heart, camera, heartbeat, rotation, palette, and V6 scanner.
Renders frames 0–450 at 1280×720. Encodes 0–449. Frame 450 is loop check only.

Run:
  caffeinate -i /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P apps/mind-operations-center/lab/cardiac-3d/scripts/render_heart_motion_v6.py
"""

import sys
import time
from pathlib import Path

import bpy

LAB = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_heart_motion_v6_storyboard as sb  # noqa: E402

PNG_DIR = LAB / "renders" / "motion-preview-v6"
MP4_OUT = LAB / "exports" / "heart_motion_v6_1280x720_15s.mp4"
ASSET_MP4 = LAB.parent.parent / "src" / "assets" / "lab" / "cardiac-3d-lab" / "heart-motion-v6.mp4"
POSTER = LAB.parent.parent / "src" / "assets" / "lab" / "cardiac-3d-lab" / "cardiac-3d-heart-recognition.png"

FPS = 30
FIRST, LAST, LOOP = 0, 449, 450
SAMPLES = 32
RES = (1280, 720)


def configure_render(scene):
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = SAMPLES
    scene.eevee.use_raytracing = False
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.use_overwrite = True
    scene.render.use_file_extension = True
    if scene.world and scene.world.use_nodes:
        bg = scene.world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[0].default_value = (8 / 255, 10 / 255, 11 / 255, 1)
            bg.inputs[1].default_value = 1.0
    PNG_DIR.mkdir(parents=True, exist_ok=True)


def render_frames(scene):
    configure_render(scene)
    scene.frame_start = FIRST
    scene.frame_end = LOOP
    scene.render.filepath = str(PNG_DIR / "frame_")
    print(f"[v6] render frames {FIRST}-{LOOP} {RES[0]}x{RES[1]} samples={SAMPLES} -> {PNG_DIR}")
    start = time.time()
    bpy.ops.render.render(animation=True)
    print(f"[v6] 3D render time {time.time() - start:.1f}s")


def png_diff(a, b):
    ia = bpy.data.images.load(str(a))
    ib = bpy.data.images.load(str(b))
    if tuple(ia.size) != tuple(ib.size):
        raise SystemExit(f"size mismatch {tuple(ia.size)} vs {tuple(ib.size)}")
    pa, pb = list(ia.pixels), list(ib.pixels)
    changed = 0
    abs_sum = 0.0
    max_d = 0.0
    for i in range(0, len(pa), 4):
        pixel = False
        for c in range(3):
            d = abs(pa[i + c] - pb[i + c]) * 255.0
            abs_sum += d
            if d > max_d:
                max_d = d
            if d > 0:
                pixel = True
        if pixel:
            changed += 1
    pixels = int(ia.size[0] * ia.size[1])
    bpy.data.images.remove(ia)
    bpy.data.images.remove(ib)
    return {
        "changed": changed,
        "changedPct": 100.0 * changed / pixels,
        "meanAbs": abs_sum / (pixels * 3),
        "maxDiff": max_d,
    }


def encode_mp4():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.sequence_editor_create()
    first = str(PNG_DIR / f"frame_{FIRST:04d}.png")
    strip = scene.sequence_editor.sequences.new_image("v6", first, 1, 1)
    for i in range(FIRST + 1, LAST + 1):
        strip.elements.append(f"frame_{i:04d}.png")
    strip.frame_final_duration = LAST - FIRST + 1
    scene.frame_start = 1
    scene.frame_end = LAST - FIRST + 1
    scene.render.fps = FPS
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.use_sequencer = True
    scene.view_settings.view_transform = "Standard"
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.ffmpeg.ffmpeg_preset = "BEST"
    scene.render.ffmpeg.audio_codec = "NONE"
    scene.render.ffmpeg.gopsize = FPS
    if hasattr(scene.render.ffmpeg, "pixel_format"):
        scene.render.ffmpeg.pixel_format = "YUV420P"
    MP4_OUT.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(MP4_OUT)
    print(f"[v6] encode {scene.frame_end} frames {RES[0]}x{RES[1]} -> {MP4_OUT}")
    start = time.time()
    bpy.ops.render.render(animation=True)
    print(f"[v6] encode time {time.time() - start:.1f}s")


def install_asset():
    ASSET_MP4.parent.mkdir(parents=True, exist_ok=True)
    ASSET_MP4.write_bytes(MP4_OUT.read_bytes())
    poster_src = PNG_DIR / f"frame_{FIRST:04d}.png"
    POSTER.write_bytes(poster_src.read_bytes())
    print(f"[v6] asset {ASSET_MP4}")
    print(f"[v6] poster {POSTER}")


def main():
    scene = sb.build_rig()
    render_frames(scene)
    match = png_diff(PNG_DIR / f"frame_{FIRST:04d}.png", PNG_DIR / f"frame_{LOOP:04d}.png")
    print(
        f"[v6] loop 0 vs 450 changed={match['changedPct']:.4f}% mean={match['meanAbs']:.4f} max={match['maxDiff']:.2f}"
    )
    if match["changedPct"] > 5 or match["meanAbs"] > 4:
        raise SystemExit("V6 loop validation failed")
    encode_mp4()
    install_asset()


if __name__ == "__main__":
    main()
