# Cardiac 3D lab

Isolated Blender proof of concept for a volumetric cardiac scan in the Mind
Operations Center. The hidden URL-only scene `cardiac-3d-lab` plays the V4
preview MP4 inside the existing cardiac monitor chrome.

NIH source files stay in `source/` (gitignored). Provenance is in
`ATTRIBUTION.md` — keep that file even when on-screen source labels are hidden
in capture mode.

## Hidden scene

http://127.0.0.1:5192/?scene=cardiac-3d-lab&mode=display&motion=full

UI asset: `src/assets/lab/cardiac-3d-lab/heart-motion-preview-v4.mp4`

## Reproduce stills / motion

Download the public-domain model listed in `ATTRIBUTION.md` into `source/`, then
run the matching script under `scripts/` with Blender's bundled Python:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  -P scripts/render_heart_motion_v4.py
```

Working blends, PNG frames and lab `exports/*.mp4` are gitignored. The React
preview asset is the exception.
