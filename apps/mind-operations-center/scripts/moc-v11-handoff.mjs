#!/usr/bin/env node
/**
 * Assemble Chad_MOC_MP4_V1_1_Handoff from V1 files plus the six V1.1 finals.
 * Does not recapture. Does not touch Chad_MOC_MP4_V1_Handoff.
 */
import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const APP = dirname(ROOT)
const EXPORTS = join(APP, 'exports')
const NAME = 'Chad_MOC_MP4_V1_1_Handoff'
const OUT = join(EXPORTS, NAME)
const ZIP = join(EXPORTS, `${NAME}.zip`)
const V1_FINAL = join(EXPORTS, 'chad-moc-v1', 'finals')
const V11_FINAL = join(EXPORTS, 'chad-moc-v1-1', 'finals', 'landscape')
const INTROS = join(EXPORTS, 'chad-moc-v1-review', 'narrative-finals')
const V11_SCENES = new Set([
  'cardiac-3d-lab',
  'thoughts',
  'script-cogito',
  'script-tower-cranes',
  'paused',
  'partial',
])
const HEARTS = ['heart-idle', 'heart-elevated', 'heart-irregular', 'heart-intervention', 'heart-recovered']
const LOOPS_01 = [
  'idle',
  'elevated',
  'thoughts',
  'executing',
  'paused',
  'uploading',
  'partial',
  'script-cogito',
  'script-tower-cranes',
  'thoracic-idle',
  'thoracic-elevated',
  'thoracic-irregular',
  'thoracic-intervention',
  'thoracic-recovered',
  'research-pending',
  'research-approved',
  'operator-console',
  'cardiac-3d-lab',
]
const INTRO_MAP = [
  {
    src: 'thoughts_intro.mp4',
    dest: 'thoughts_intro__then_thoughts_loop.mp4',
    scene: 'thoughts',
    then: '01_CONTINUOUS_LOOPS/thoughts.mp4',
  },
  {
    src: 'script-cogito_intro.mp4',
    dest: 'script-cogito_intro__then_script-cogito_loop.mp4',
    scene: 'script-cogito',
    then: '01_CONTINUOUS_LOOPS/script-cogito.mp4',
  },
  {
    src: 'script-tower-cranes_intro.mp4',
    dest: 'script-tower-cranes_intro__then_script-tower-cranes_loop.mp4',
    scene: 'script-tower-cranes',
    then: '01_CONTINUOUS_LOOPS/script-tower-cranes.mp4',
  },
  {
    src: 'research-approved_intro.mp4',
    dest: 'research-approved_intro__then_research-approved_loop.mp4',
    scene: 'research-approved',
    then: '01_CONTINUOUS_LOOPS/research-approved.mp4',
  },
  {
    src: 'operator-console_intro.mp4',
    dest: 'operator-console_intro__then_operator-console-status_hold.mp4',
    scene: 'operator-console',
    then: '04_OPERATOR_ALTERNATES/operator-console-status_hold.mp4',
  },
  {
    src: 'uploading_intro.mp4',
    dest: 'uploading_intro__then_partial_loop.mp4',
    scene: 'uploading',
    then: '01_CONTINUOUS_LOOPS/partial.mp4',
  },
]

function probeMp4(path) {
  const data = spawnSync('python3', [
    '-c',
    `
import struct, json, sys
p=sys.argv[1]
data=open(p,'rb').read()
def be32(o): return struct.unpack('>I', data[o:o+4])[0]
info={'file':p,'has_avc1': b'avc1' in data, 'has_mp4a': b'mp4a' in data}
i=0
n=len(data)
while i+8<=n:
    size=be32(i); typ=data[i+4:i+8]
    if size<8: break
    if typ==b'mdhd':
        ver=data[i+8]
        if ver==0:
            ts=be32(i+20); dur=be32(i+24)
        else:
            ts=be32(i+28); dur=int.from_bytes(data[i+32:i+40],'big')
        info['fps_timescale']=ts; info['duration_ticks']=dur; info['duration']=round(dur/ts,3)
    if typ==b'tkhd':
        info['width']=be32(i+size-8)/65536
        info['height']=be32(i+size-4)/65536
    if typ in (b'moov', b'trak', b'mdia', b'minf', b'stbl'):
        i+=8
        continue
    i+=size
print(json.dumps(info))
`,
    path,
  ], { encoding: 'utf8' })
  if (data.status !== 0) throw new Error(`probe failed ${path}: ${data.stderr}`)
  return JSON.parse(data.stdout.trim().split('\n').at(-1))
}

function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const README = `Chad MOC MP4 V1.1 Handoff
===========================

Silent H.264 plates at 30 fps. Landscape files are 1920x1080. Phone files
keep the 1170x2532 screen ratio (390x844 at 3x). Do not crop or stretch
phone files to 9:16.

01_CONTINUOUS_LOOPS
  Seamless 15-second plates. These may repeat indefinitely.

02_PLAY_ONCE_INTROS
  One-shot editorial clips. Play once, then cut or dissolve into the loop
  named after "__then_" in the filename.

03_PHONE_LOOPS
  Seamless 15-second phone-screen plates at 1170x2532.

04_OPERATOR_ALTERNATES
  operator-console-status_hold  completed STATUS plate (matches the
                                operator intro)
  operator-console-idle_hold    CHANNEL OPEN — AWAITING DIRECTIVE

05_OPTIONAL_LEGACY_2D_HEARTS
  Optional legacy 2D heart-monitor plates. The preferred cardiac plate is
  01_CONTINUOUS_LOOPS/cardiac-3d-lab.mp4 (3D volumetric scan). Do not
  treat these five 2D files as the primary cardiac shot.

V1.1 replacements (new 1920x1080 captures):
  cardiac-3d-lab, thoughts, script-cogito, script-tower-cranes,
  paused, partial.

All other loops, intros, phone plates, and operator holds are the
validated V1 files, copied unchanged.

See MANIFEST.csv for filename, folder, scene ID, resolution, duration,
fps, and role (loop / intro / hold / phone / optional).
`

async function copyTo(src, dest) {
  await mkdir(dirname(dest), { recursive: true })
  await copyFile(src, dest)
}

async function main() {
  await rm(OUT, { recursive: true, force: true })
  await rm(ZIP, { force: true })
  const dirs = [
    '01_CONTINUOUS_LOOPS',
    '02_PLAY_ONCE_INTROS',
    '03_PHONE_LOOPS',
    '04_OPERATOR_ALTERNATES',
    '05_OPTIONAL_LEGACY_2D_HEARTS',
  ]
  for (const d of dirs) await mkdir(join(OUT, d), { recursive: true })

  const rows = [['filename', 'folder', 'scene_id', 'resolution', 'duration', 'fps', 'role']]

  for (const scene of LOOPS_01) {
    const src = V11_SCENES.has(scene)
      ? join(V11_FINAL, `${scene}.mp4`)
      : join(V1_FINAL, 'landscape', `${scene}.mp4`)
    const dest = join(OUT, '01_CONTINUOUS_LOOPS', `${scene}.mp4`)
    await copyTo(src, dest)
    const info = probeMp4(dest)
    rows.push([`${scene}.mp4`, '01_CONTINUOUS_LOOPS', scene, `${info.width}x${info.height}`, info.duration, 30, 'loop'])
  }

  for (const spec of INTRO_MAP) {
    const dest = join(OUT, '02_PLAY_ONCE_INTROS', spec.dest)
    await copyTo(join(INTROS, spec.src), dest)
    const info = probeMp4(dest)
    rows.push([spec.dest, '02_PLAY_ONCE_INTROS', spec.scene, `${info.width}x${info.height}`, info.duration, 30, 'intro'])
  }

  for (const scene of ['phone-story-status', 'phone-map']) {
    const dest = join(OUT, '03_PHONE_LOOPS', `${scene}.mp4`)
    await copyTo(join(V1_FINAL, 'phone', `${scene}.mp4`), dest)
    const info = probeMp4(dest)
    rows.push([`${scene}.mp4`, '03_PHONE_LOOPS', scene, `${info.width}x${info.height}`, info.duration, 30, 'phone'])
  }

  const holds = [
    ['operator-console-status_hold-loop.mp4', 'operator-console-status_hold.mp4', 'operator-console'],
    ['operator-console-idle_hold-loop.mp4', 'operator-console-idle_hold.mp4', 'operator-console'],
  ]
  for (const [srcName, destName, scene] of holds) {
    const dest = join(OUT, '04_OPERATOR_ALTERNATES', destName)
    await copyTo(join(INTROS, srcName), dest)
    const info = probeMp4(dest)
    rows.push([destName, '04_OPERATOR_ALTERNATES', scene, `${info.width}x${info.height}`, info.duration, 30, 'hold'])
  }

  for (const scene of HEARTS) {
    const dest = join(OUT, '05_OPTIONAL_LEGACY_2D_HEARTS', `${scene}.mp4`)
    await copyTo(join(V1_FINAL, 'landscape', `${scene}.mp4`), dest)
    const info = probeMp4(dest)
    rows.push([`${scene}.mp4`, '05_OPTIONAL_LEGACY_2D_HEARTS', scene, `${info.width}x${info.height}`, info.duration, 30, 'optional'])
  }

  await writeFile(join(OUT, 'START_HERE_README.txt'), README)
  await writeFile(join(OUT, 'MANIFEST.csv'), `${rows.map((r) => r.map(csvEscape).join(',')).join('\n')}\n`)

  spawnSync('xattr', ['-cr', OUT], { encoding: 'utf8' })
  const zip = spawnSync(
    'zip',
    ['-r', '-X', ZIP, NAME, '-x', '*.DS_Store', '-x', '*__MACOSX*'],
    { encoding: 'utf8', cwd: EXPORTS, env: { ...process.env, COPYFILE_DISABLE: '1' } },
  )
  if (zip.status !== 0) throw new Error(`zip failed: ${zip.stderr || zip.stdout}`)

  const listed = []
  async function walk(dir, prefix) {
    for (const name of await readdir(dir)) {
      if (name === '.DS_Store') continue
      const p = join(dir, name)
      const st = await stat(p)
      if (st.isDirectory()) await walk(p, `${prefix}${name}/`)
      else listed.push(`${prefix}${name}`)
    }
  }
  await walk(OUT, `${NAME}/`)
  const zipList = spawnSync('zipinfo', ['-1', ZIP], { encoding: 'utf8' })
  const zipNames = zipList.stdout.split('\n').map((s) => s.replace(/\/$/, '')).filter((s) => s && !s.endsWith('.DS_Store'))
  console.log(JSON.stringify({
    folder: OUT,
    zip: ZIP,
    zipBytes: (await stat(ZIP)).size,
    files: listed.sort(),
    fileCount: listed.length,
    zipCount: zipNames.length,
  }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
