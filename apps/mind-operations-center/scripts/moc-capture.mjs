#!/usr/bin/env node
/**
 * Deterministic MOC MP4 exporter.
 *
 * From apps/mind-operations-center:
 *   npm run capture:moc:v1
 *   npm run capture:moc -- --package chad-moc-v1 --scene idle
 *   npm run capture:moc -- --profile preview --scene research-pending
 *
 * Serves dist on 127.0.0.1:5193. Does not bind 5191 or 5192.
 */

import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = dirname(fileURLToPath(import.meta.url))
const APP = dirname(ROOT)
const MANIFEST_PATH = join(ROOT, 'moc-capture-manifest.json')
const ENCODE_SCRIPT = join(ROOT, 'encode-png-sequence.py')
const PORT = 5193
const HOST = '127.0.0.1'
const LOOP_MAX_CHANGED_PCT = 5
const LOOP_MAX_MEAN_ABS = 4
const PACKAGE_NAME = 'chad-moc-v1'
const INVENTORY = [
  'idle',
  'elevated',
  'thoughts',
  'executing',
  'paused',
  'uploading',
  'partial',
  'script-cogito',
  'script-tower-cranes',
  'heart-idle',
  'heart-elevated',
  'heart-irregular',
  'heart-intervention',
  'heart-recovered',
  'thoracic-idle',
  'thoracic-elevated',
  'thoracic-irregular',
  'thoracic-intervention',
  'thoracic-recovered',
  'research-pending',
  'research-approved',
  'operator-console',
  'phone-story-status',
  'phone-map',
  'cardiac-3d-lab',
]
const EXCLUDED = new Set(['directory', 'thoracic-scan'])

function parseArgs(argv) {
  const out = {
    profile: 'preview',
    scene: null,
    skipBuild: false,
    port: PORT,
    packageName: null,
    force: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--profile') out.profile = argv[++i]
    else if (a === '--scene') out.scene = argv[++i]
    else if (a === '--skip-build') out.skipBuild = true
    else if (a === '--port') out.port = Number(argv[++i])
    else if (a === '--package') out.packageName = argv[++i]
    else if (a === '--force') out.force = true
  }
  return out
}

function sceneIds(value) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function resolveLayout(entry) {
  if (entry.category === 'phone-screen') {
    return {
      category: 'phone',
      viewportWidth: 390,
      viewportHeight: 844,
      deviceScaleFactor: 3,
      captureWidth: 1170,
      captureHeight: 2532,
      previewWidth: 390,
      previewHeight: 844,
      finalWidth: 1170,
      finalHeight: 2532,
    }
  }
  return {
    category: 'landscape',
    viewportWidth: 1920,
    viewportHeight: 1080,
    deviceScaleFactor: 1,
    captureWidth: 1920,
    captureHeight: 1080,
    previewWidth: 960,
    previewHeight: 540,
    finalWidth: 1920,
    finalHeight: 1080,
  }
}

function which(cmd) {
  const r = spawnSync('which', [cmd], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : ''
}

function findFfmpeg() {
  return (
    which('ffmpeg') ||
    ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'].find((p) => {
      const r = spawnSync('test', ['-x', p])
      return r.status === 0
    }) ||
    ''
  )
}

function findFfprobe() {
  return (
    which('ffprobe') ||
    ['/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe'].find((p) => {
      const r = spawnSync('test', ['-x', p])
      return r.status === 0
    }) ||
    ''
  )
}

function findBlender() {
  const candidates = [
    which('blender'),
    '/Applications/Blender.app/Contents/MacOS/Blender',
  ]
  return candidates.find((p) => p && spawnSync('test', ['-x', p]).status === 0) || ''
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: APP, ...opts })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`)
}

function startPreview(port) {
  const child = spawn(
    'npx',
    ['vite', 'preview', '--host', HOST, '--port', String(port), '--strictPort', '--base', '/'],
    { cwd: APP, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  child.stdout.on('data', (d) => process.stdout.write(d))
  child.stderr.on('data', (d) => process.stderr.write(d))
  return child
}

function waitPreview(child, port) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`preview on ${port} timed out`)), 20000)
    const onExit = (code) => {
      clearTimeout(timer)
      reject(new Error(`preview exited ${code}`))
    }
    child.once('exit', onExit)
    const poll = async () => {
      try {
        const res = await fetch(`http://${HOST}:${port}/`)
        if (res.ok) {
          clearTimeout(timer)
          child.off('exit', onExit)
          resolve()
          return
        }
      } catch {
        /* not up yet */
      }
      setTimeout(poll, 200)
    }
    poll()
  })
}

function captureUrl(origin, entry, defaults) {
  const u = new URL(origin)
  u.searchParams.set('scene', entry.scene)
  u.searchParams.set('mode', entry.mode || defaults.mode)
  u.searchParams.set('motion', defaults.motion)
  u.searchParams.set('capture', defaults.capture)
  u.searchParams.set('duration', String(entry.duration ?? defaults.duration))
  u.searchParams.set('fps', String(entry.fps ?? defaults.fps))
  u.searchParams.set('seed', String(entry.seed ?? defaults.seed))
  return u.toString()
}

function even(n) {
  return n - (n % 2)
}

function frameName(i) {
  return `frame_${String(i).padStart(4, '0')}.png`
}

async function waitReady(page) {
  await page.waitForFunction(() => window.__MOC_CAPTURE__?.ready === true, null, { timeout: 45000 })
  return page.evaluate(() => ({
    duration: window.__MOC_CAPTURE__.duration,
    fps: window.__MOC_CAPTURE__.fps,
    seed: window.__MOC_CAPTURE__.seed,
  }))
}

async function seek(page, ms) {
  await page.evaluate(async (t) => {
    const api = window.__MOC_CAPTURE__
    if (!api) throw new Error('capture API missing')
    await api.seek(t)
  }, ms)
}

async function screenshotTarget(page, entry, path) {
  if (entry.category === 'phone-screen' || entry.captureTarget === 'viewport') {
    await page.screenshot({ path, type: 'png', animations: 'allow', caret: 'hide' })
    return
  }
  const loc = page.locator(entry.captureTarget)
  await loc.screenshot({ path, type: 'png', animations: 'allow', caret: 'hide' })
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const html = document.documentElement
    const body = document.body
    return {
      htmlScrollWidth: html.scrollWidth,
      htmlClientWidth: html.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      overflow:
        html.scrollWidth > html.clientWidth || body.scrollWidth > body.clientWidth,
    }
  })
}

function downscalePng(src, dest, width, height) {
  const r = spawnSync('sips', ['-z', String(height), String(width), src, '--out', dest], {
    encoding: 'utf8',
  })
  if (r.status !== 0) throw new Error(`sips scale failed: ${r.stderr || r.stdout}`)
}

function pngSize(path) {
  const r = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path], { encoding: 'utf8' })
  const width = Number(/pixelWidth:\s+(\d+)/.exec(r.stdout)?.[1])
  const height = Number(/pixelHeight:\s+(\d+)/.exec(r.stdout)?.[1])
  return { width, height }
}

async function measureTarget(page, entry, layout) {
  if (entry.category === 'phone-screen' || entry.captureTarget === 'viewport') {
    return {
      width: layout.captureWidth,
      height: layout.captureHeight,
      selector: entry.category === 'phone-screen' ? 'viewport@3x' : 'viewport',
    }
  }
  const box = await page.locator(entry.captureTarget).boundingBox()
  if (!box) throw new Error(`capture target not found: ${entry.captureTarget}`)
  return {
    width: even(Math.round(box.width)),
    height: even(Math.round(box.height)),
    selector: entry.captureTarget,
    nativeWidth: box.width,
    nativeHeight: box.height,
    aspect: `${box.width}:${box.height}`,
  }
}

async function pngDiff(page, aPath, bPath) {
  const a = (await readFile(aPath)).toString('base64')
  const b = (await readFile(bPath)).toString('base64')
  return page.evaluate(async ({ a, b }) => {
    const dec = async (b64) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      return ctx.getImageData(0, 0, c.width, c.height)
    }
    const A = await dec(a)
    const B = await dec(b)
    if (A.width !== B.width || A.height !== B.height) {
      return { error: `size mismatch ${A.width}x${A.height} vs ${B.width}x${B.height}` }
    }
    let changed = 0
    let abs = 0
    let max = 0
    const n = A.data.length
    for (let i = 0; i < n; i += 4) {
      let pixelChanged = false
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(A.data[i + c] - B.data[i + c])
        abs += d
        if (d > max) max = d
        if (d > 0) pixelChanged = true
      }
      if (pixelChanged) changed += 1
    }
    const pixels = A.width * A.height
    return {
      width: A.width,
      height: A.height,
      changedPixels: changed,
      changedPct: (changed / pixels) * 100,
      meanAbs: abs / (pixels * 3),
      maxDiff: max,
    }
  }, { a, b })
}

async function contactSheet(context, frames, outPath) {
  const imgs = await Promise.all(frames.map((f) => readFile(f).then((b) => b.toString('base64'))))
  const page = await context.newPage()
  try {
    await page.setContent(`<!doctype html>
<html><head><style>
  html,body{margin:0;padding:0;background:#000}
  body{display:flex;flex-direction:row;align-items:flex-start}
  img{display:block;flex:none}
</style></head><body>
${imgs.map((b) => `<img src="data:image/png;base64,${b}">`).join('')}
</body></html>`)
    await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0))
    const size = await page.evaluate(() => {
      const list = [...document.images]
      return {
        width: list.reduce((sum, img) => sum + img.naturalWidth, 0),
        height: Math.max(...list.map((img) => img.naturalHeight)),
      }
    })
    await page.setViewportSize({
      width: Math.max(even(size.width), 2),
      height: Math.max(even(size.height), 2),
    })
    await page.screenshot({ path: outPath, type: 'png', fullPage: true, animations: 'allow' })
  } finally {
    await page.close()
  }
}

function encodeWithFfmpeg(ffmpeg, framesDir, out, fps, last) {
  run(ffmpeg, [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-start_number',
    '0',
    '-framerate',
    String(fps),
    '-i',
    join(framesDir, 'frame_%04d.png'),
    '-frames:v',
    String(last + 1),
    '-r',
    String(fps),
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'slow',
    '-crf',
    '16',
    '-vf',
    'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-movflags',
    '+faststart',
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'iec61966-2-1',
    out,
  ])
}

function encodeWithBlender(blender, framesDir, out, fps, last) {
  run(blender, [
    '-b',
    '--factory-startup',
    '-P',
    ENCODE_SCRIPT,
    '--',
    '--frames',
    framesDir,
    '--out',
    out,
    '--fps',
    String(fps),
    '--first',
    '0',
    '--last',
    String(last),
  ])
}

function probeMp4(ffprobe, file) {
  if (!ffprobe) return null
  const r = spawnSync(
    ffprobe,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,nb_frames,avg_frame_rate,codec_name,pix_fmt,duration',
      '-show_entries',
      'format=duration,size',
      '-of',
      'json',
      file,
    ],
    { encoding: 'utf8' },
  )
  if (r.status !== 0) return { error: r.stderr }
  return JSON.parse(r.stdout)
}

function frameTimes(duration, fps) {
  const last = Math.round(duration * fps) - 1
  const loop = last + 1
  return { last, loop, total: loop + 1 }
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function csvRow(cols) {
  return cols.map(csvEscape).join(',')
}

const CSV_HEADER = [
  'scene',
  'filename',
  'category',
  'resolution',
  'fps',
  'duration',
  'frame count',
  'file size',
  'loop changed-pixel percentage',
  'loop mean difference',
  'status',
  'notes',
]

function packageReadme() {
  return `# Chad MOC V1

Silent seamless 15 second / 30 fps H.264 plates. No audio.
yuv420p. 450 production frames. Frame 450 is captured only to
validate loop closure against frame 0 and is not encoded.

## Folders

- \`finals/landscape\` — 1920×1080 delivery plates
- \`finals/phone\` — 1170×2532 delivery plates (390×844 CSS at 3×)
- \`previews/landscape\` — 960×540 review proxies from the same capture
- \`previews/phone\` — 390×844 review proxies from the same capture
- \`contact-sheets\` — five-frame strips from the preview encodes
- \`validation\` — per-scene loop metrics and progress log

Preview files show the same composition as the matching final,
only at lower resolution. Phone plates keep the native 390:844
aspect. They are not cropped, stretched, or converted to 9:16.

These are V1 loopable hold plates, not intro/build files.
`
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function captureFrames(page, origin, entry, defaults, layout, captureDir) {
  const fps = entry.fps ?? defaults.fps
  const duration = entry.duration ?? defaults.duration
  const { last, loop, total } = frameTimes(duration, fps)
  const url = captureUrl(origin, entry, defaults)
  await page.setViewportSize({ width: layout.viewportWidth, height: layout.viewportHeight })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await waitReady(page)
  if (entry.scene === 'cardiac-3d-lab' || entry.category === 'phone-screen') {
    await page.waitForTimeout(250)
  }

  const overflow = await measureOverflow(page)
  if (overflow.overflow) {
    console.warn(`[capture] HORIZONTAL OVERFLOW ${entry.scene}`, overflow)
  } else {
    console.log(
      `[capture] overflow ok ${entry.scene} html ${overflow.htmlScrollWidth}/${overflow.htmlClientWidth} body ${overflow.bodyScrollWidth}/${overflow.bodyClientWidth}`,
    )
  }

  const crop = await measureTarget(page, entry, layout)
  await mkdir(captureDir, { recursive: true })

  for (let i = 0; i < total; i++) {
    const ms = (i / fps) * 1000
    await seek(page, ms)
    if (i === 0 || i === loop) {
      const videoMeta = await page.evaluate(() => {
        const video = document.querySelector('video')
        if (!video) return null
        return { currentTime: video.currentTime, duration: video.duration, readyState: video.readyState }
      })
      if (videoMeta) console.log(`  video @ frame ${i}`, videoMeta)
    }
    await screenshotTarget(page, entry, join(captureDir, frameName(i)))
    if (i % 50 === 0 || i === total - 1) {
      console.log(`  frame ${i}/${loop}  t=${ms.toFixed(0)}ms`)
    }
  }

  const firstSize = pngSize(join(captureDir, frameName(0)))
  return { fps, duration, last, loop, total, url, overflow, crop, firstSize }
}

async function downscaleSequence(srcDir, destDir, count, width, height) {
  await mkdir(destDir, { recursive: true })
  console.log(`[capture] downscale ${count} frames -> ${width}x${height}`)
  for (let i = 0; i < count; i++) {
    downscalePng(join(srcDir, frameName(i)), join(destDir, frameName(i)), width, height)
  }
}

function encodeFrames(ffmpeg, blender, framesDir, out, fps, last) {
  if (ffmpeg) encodeWithFfmpeg(ffmpeg, framesDir, out, fps, last)
  else encodeWithBlender(blender, framesDir, out, fps, last)
}

async function writeCsv(path, rows) {
  const body = [csvRow(CSV_HEADER), ...rows.map((r) => csvRow(r))].join('\n')
  await writeFile(path, `${body}\n`)
}

function outputRow(scene, filename, category, resolution, fps, duration, frames, bytes, loop, status, notes) {
  return [
    scene,
    filename,
    category,
    resolution,
    fps,
    duration,
    frames,
    bytes,
    loop?.changedPct != null ? Number(loop.changedPct).toFixed(3) : '',
    loop?.meanAbs != null ? Number(loop.meanAbs).toFixed(3) : '',
    status,
    notes,
  ]
}

async function loadExistingRows(pkgRoot) {
  const csvPath = join(pkgRoot, 'MANIFEST.csv')
  if (!(await exists(csvPath))) return []
  const text = await readFile(csvPath, 'utf8')
  const lines = text.trim().split('\n').slice(1)
  return lines
    .map((line) => {
      const cols = []
      let cur = ''
      let q = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (q) {
          if (ch === '"' && line[i + 1] === '"') {
            cur += '"'
            i += 1
          } else if (ch === '"') q = false
          else cur += ch
        } else if (ch === '"') q = true
        else if (ch === ',') {
          cols.push(cur)
          cur = ''
        } else cur += ch
      }
      cols.push(cur)
      return cols
    })
    .filter((cols) => cols.length >= 11)
}

function replaceSceneRows(rows, scene, next) {
  return [...rows.filter((r) => r[0] !== scene), ...next]
}

async function alreadyValidated(pkgRoot, entry, layout, force) {
  if (force) return false
  const valPath = join(pkgRoot, 'validation', `${entry.scene}.json`)
  const preview = join(pkgRoot, 'previews', layout.category, entry.output)
  const finalMp4 = join(pkgRoot, 'finals', layout.category, entry.output)
  if (!(await exists(valPath)) || !(await exists(preview)) || !(await exists(finalMp4))) return false
  try {
    const val = JSON.parse(await readFile(valPath, 'utf8'))
    return val.status === 'ok'
  } catch {
    return false
  }
}

async function packageEntry({
  browser,
  origin,
  entry,
  defaults,
  layout,
  pkgRoot,
  ffmpeg,
  blender,
  ffprobe,
}) {
  const started = Date.now()
  const fps = entry.fps ?? defaults.fps
  const duration = entry.duration ?? defaults.duration
  const { last, loop } = frameTimes(duration, fps)
  const captureDir = join(pkgRoot, '.tmp', entry.scene, 'capture')
  const previewDir = join(pkgRoot, '.tmp', entry.scene, 'preview')
  const previewMp4 = join(pkgRoot, 'previews', layout.category, entry.output)
  const finalMp4 = join(pkgRoot, 'finals', layout.category, entry.output)
  const sheet = join(pkgRoot, 'contact-sheets', `${entry.scene}.png`)
  const valDir = join(pkgRoot, 'validation')
  const valJson = join(valDir, `${entry.scene}.json`)

  await mkdir(join(pkgRoot, 'previews', layout.category), { recursive: true })
  await mkdir(join(pkgRoot, 'finals', layout.category), { recursive: true })
  await mkdir(join(pkgRoot, 'contact-sheets'), { recursive: true })
  await mkdir(valDir, { recursive: true })
  await rm(join(pkgRoot, '.tmp', entry.scene), { recursive: true, force: true })

  const context = await browser.newContext({
    deviceScaleFactor: layout.deviceScaleFactor,
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    viewport: { width: layout.viewportWidth, height: layout.viewportHeight },
  })
  const page = await context.newPage()
  let overflow
  let crop
  let firstSize
  let loopMetrics
  let url
  try {
    const captured = await captureFrames(page, origin, entry, defaults, layout, captureDir)
    overflow = captured.overflow
    crop = captured.crop
    firstSize = captured.firstSize
    url = captured.url
    if (
      firstSize.width !== layout.captureWidth ||
      firstSize.height !== layout.captureHeight
    ) {
      throw new Error(
        `capture size ${firstSize.width}x${firstSize.height} != ${layout.captureWidth}x${layout.captureHeight}`,
      )
    }
    loopMetrics = await pngDiff(page, join(captureDir, frameName(0)), join(captureDir, frameName(loop)))
  } finally {
    await page.close()
    await context.close()
  }

  const loopFail =
    Boolean(loopMetrics.error) ||
    loopMetrics.changedPct > LOOP_MAX_CHANGED_PCT ||
    loopMetrics.meanAbs > LOOP_MAX_MEAN_ABS

  await copyFile(join(captureDir, frameName(0)), join(valDir, `${entry.scene}-0000.png`))
  await copyFile(join(captureDir, frameName(loop)), join(valDir, `${entry.scene}-0450.png`))

  encodeFrames(ffmpeg, blender, captureDir, finalMp4, fps, last)
  await downscaleSequence(
    captureDir,
    previewDir,
    last + 1,
    layout.previewWidth,
    layout.previewHeight,
  )
  downscalePng(
    join(captureDir, frameName(loop)),
    join(previewDir, frameName(loop)),
    layout.previewWidth,
    layout.previewHeight,
  )
  encodeFrames(ffmpeg, blender, previewDir, previewMp4, fps, last)

  const sheetContext = await browser.newContext({
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    viewport: { width: 200, height: 200 },
  })
  try {
    const sheetFrames = [0, 0.25, 0.5, 0.75, 1].map((p) =>
      join(previewDir, frameName(Math.round(p * last))),
    )
    await contactSheet(sheetContext, sheetFrames, sheet)
  } finally {
    await sheetContext.close()
  }

  const finalInfo = await stat(finalMp4)
  const previewInfo = await stat(previewMp4)
  const finalProbe = probeMp4(ffprobe, finalMp4)
  const previewProbe = probeMp4(ffprobe, previewMp4)
  const expectedFrames = last + 1
  const expectedDuration = expectedFrames / fps

  const probeOk = (probe, width, height) => {
    if (!probe?.streams?.[0]) return true
    const s = probe.streams[0]
    const nb = Number(s.nb_frames)
    const dur = Number(s.duration ?? probe.format?.duration)
    if (Number.isFinite(nb) && nb !== expectedFrames) return false
    if (Number.isFinite(dur) && Math.abs(dur - expectedDuration) > 0.08) return false
    if (s.width && s.height && (s.width !== width || s.height !== height)) return false
    return true
  }

  const ok =
    !loopFail &&
    probeOk(finalProbe, layout.finalWidth, layout.finalHeight) &&
    probeOk(previewProbe, layout.previewWidth, layout.previewHeight)

  await rm(join(pkgRoot, '.tmp', entry.scene), { recursive: true, force: true })

  const result = {
    scene: entry.scene,
    category: entry.category,
    layout,
    overflow,
    crop,
    captureSize: firstSize,
    loop: loopMetrics,
    loopFail,
    status: ok ? 'ok' : loopFail ? 'loop-fail' : 'probe-fail',
    fps,
    duration,
    framesEncoded: expectedFrames,
    loopCheckFrame: loop,
    preview: { file: previewMp4, bytes: previewInfo.size, probe: previewProbe },
    final: { file: finalMp4, bytes: finalInfo.size, probe: finalProbe },
    contactSheet: sheet,
    renderSeconds: (Date.now() - started) / 1000,
    url,
    notes: entry.notes,
  }
  await writeFile(valJson, JSON.stringify(result, null, 2))
  return result
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const packaging = Boolean(args.packageName)
  if (packaging && args.packageName !== PACKAGE_NAME) {
    throw new Error(`unknown package ${args.packageName}`)
  }
  if (!packaging && args.profile !== 'preview' && args.profile !== 'final') {
    throw new Error(`unknown profile ${args.profile}`)
  }

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
  const defaults = manifest.defaults
  let entries = manifest.entries.filter((e) => !EXCLUDED.has(e.scene))
  if (args.scene) {
    const ids = sceneIds(args.scene)
    entries = entries.filter((e) => ids.includes(e.scene))
    if (entries.length === 0) throw new Error(`scene not in manifest: ${args.scene}`)
  } else if (packaging) {
    entries = entries.filter((e) => e.enabled)
    entries.sort((a, b) => INVENTORY.indexOf(a.scene) - INVENTORY.indexOf(b.scene))
  } else {
    entries = entries.filter((e) => e.enabled)
  }
  if (entries.length === 0) throw new Error('no scenes selected')

  const ffmpeg = findFfmpeg()
  const ffprobe = findFfprobe()
  const blender = findBlender()
  if (!ffmpeg && !blender) throw new Error('need ffmpeg or Blender to encode')
  const encoder = ffmpeg ? `ffmpeg:${ffmpeg}` : `blender:${blender}`
  console.log(
    `[capture] package=${args.packageName || 'no'} profile=${args.profile} encoder=${encoder} scenes=${entries.map((e) => e.scene).join(',')}`,
  )

  if (!args.skipBuild) {
    console.log('[capture] building with VITE_BASE=/')
    run('npx', ['vite', 'build', '--base', '/'])
  }

  const preview = startPreview(args.port)
  let failed = false
  const rows = []
  try {
    await waitPreview(preview, args.port)
    const origin = `http://${HOST}:${args.port}/`
    let browser
    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: true,
        args: ['--force-color-profile=srgb', '--disable-lcd-text', '--hide-scrollbars'],
      })
    } catch (err) {
      const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      console.warn(`[capture] chrome channel failed (${err.message}); trying ${chrome}`)
      browser = await chromium.launch({
        executablePath: chrome,
        headless: true,
        args: ['--force-color-profile=srgb', '--disable-lcd-text', '--hide-scrollbars'],
      })
    }

    if (packaging) {
      const pkgRoot = join(APP, 'exports', PACKAGE_NAME)
      await mkdir(pkgRoot, { recursive: true })
      await writeFile(join(pkgRoot, 'README.md'), packageReadme())
      const progressPath = join(pkgRoot, 'validation', 'progress.log')
      await mkdir(join(pkgRoot, 'validation'), { recursive: true })
      let csvRows = await loadExistingRows(pkgRoot)

      for (const entry of entries) {
        const layout = resolveLayout(entry)
        const label = `${entry.scene} ${layout.captureWidth}x${layout.captureHeight} -> final ${layout.finalWidth}x${layout.finalHeight} preview ${layout.previewWidth}x${layout.previewHeight}`
        console.log(`[capture] ${label}`)
        if (await alreadyValidated(pkgRoot, entry, layout, args.force)) {
          console.log(`[capture] ${entry.scene} skip (already validated)`)
          await writeFile(progressPath, `[${new Date().toISOString()}] ${entry.scene} skipped\n`, { flag: 'a' })
          continue
        }
        try {
          const result = await packageEntry({
            browser,
            origin,
            entry,
            defaults,
            layout,
            pkgRoot,
            ffmpeg,
            blender,
            ffprobe,
          })
          if (result.status !== 'ok') failed = true
          const notes = [
            result.notes,
            result.overflow?.overflow ? 'HORIZONTAL OVERFLOW' : '',
            result.status === 'ok' ? '' : result.status,
          ]
            .filter(Boolean)
            .join(' | ')
          const nextRows = [
            outputRow(
              entry.scene,
              `previews/${layout.category}/${entry.output}`,
              entry.category,
              `${layout.previewWidth}x${layout.previewHeight}`,
              result.fps,
              result.duration,
              result.framesEncoded,
              result.preview.bytes,
              result.loop,
              result.status,
              notes,
            ),
            outputRow(
              entry.scene,
              `finals/${layout.category}/${entry.output}`,
              entry.category,
              `${layout.finalWidth}x${layout.finalHeight}`,
              result.fps,
              result.duration,
              result.framesEncoded,
              result.final.bytes,
              result.loop,
              result.status,
              notes,
            ),
          ]
          csvRows = replaceSceneRows(csvRows, entry.scene, nextRows)
          await writeCsv(join(pkgRoot, 'MANIFEST.csv'), csvRows)
          const line = `[${new Date().toISOString()}] ${entry.scene} ${result.status} overflow=${result.overflow?.overflow} loop=${result.loop.changedPct?.toFixed?.(3)}% mean=${result.loop.meanAbs?.toFixed?.(3)} ${result.renderSeconds.toFixed(1)}s\n`
          await writeFile(progressPath, line, { flag: 'a' })
          console.log(
            `[capture] ${entry.scene} ${result.status} capture ${result.captureSize.width}x${result.captureSize.height} overflow=${result.overflow.overflow} loop changed=${result.loop.changedPct?.toFixed?.(3)}% mean=${result.loop.meanAbs?.toFixed?.(3)} max=${result.loop.maxDiff}  ${result.renderSeconds}s`,
          )
        } catch (err) {
          failed = true
          console.error(`[capture] ${entry.scene} failed:`, err)
          const nextRows = [
            outputRow(
              entry.scene,
              `previews/${layout.category}/${entry.output}`,
              entry.category,
              `${layout.previewWidth}x${layout.previewHeight}`,
              entry.fps ?? defaults.fps,
              entry.duration ?? defaults.duration,
              0,
              0,
              null,
              'failed',
              String(err),
            ),
            outputRow(
              entry.scene,
              `finals/${layout.category}/${entry.output}`,
              entry.category,
              `${layout.finalWidth}x${layout.finalHeight}`,
              entry.fps ?? defaults.fps,
              entry.duration ?? defaults.duration,
              0,
              0,
              null,
              'failed',
              String(err),
            ),
          ]
          csvRows = replaceSceneRows(csvRows, entry.scene, nextRows)
          await writeCsv(join(pkgRoot, 'MANIFEST.csv'), csvRows)
          await writeFile(
            join(pkgRoot, 'validation', `${entry.scene}.json`),
            JSON.stringify({ scene: entry.scene, status: 'failed', error: String(err) }, null, 2),
          )
          await writeFile(
            progressPath,
            `[${new Date().toISOString()}] ${entry.scene} failed ${err}\n`,
            { flag: 'a' },
          )
          await rm(join(pkgRoot, '.tmp', entry.scene), { recursive: true, force: true })
        }
      }
      console.log(`[capture] package ${pkgRoot}`)
    } else {
      const context = await browser.newContext({
        deviceScaleFactor: 1,
        colorScheme: 'dark',
        reducedMotion: 'no-preference',
      })
      const outRoot = join(APP, 'exports', args.profile === 'final' ? 'mp4-final' : 'mp4-preview')
      const sheetDir = join(outRoot, 'contact')
      await mkdir(sheetDir, { recursive: true })

      for (const entry of entries) {
        const layout = resolveLayout(entry)
        const encodeWidth = args.profile === 'preview' ? layout.previewWidth : layout.finalWidth
        const encodeHeight = args.profile === 'preview' ? layout.previewHeight : layout.finalHeight
        const frames = join(APP, 'exports', 'frames', args.profile, entry.scene)
        const mp4 = join(outRoot, entry.output)
        const sheet = join(sheetDir, entry.output.replace(/\.mp4$/, '.png'))
        console.log(
          `[capture] ${entry.scene} layout ${layout.captureWidth}x${layout.captureHeight} encode ${encodeWidth}x${encodeHeight}`,
        )
        const page = await context.newPage()
        try {
          await rm(frames, { recursive: true, force: true })
          const captured = await captureFrames(page, origin, entry, defaults, layout, join(frames, 'full'))
          const scale =
            layout.captureWidth !== encodeWidth || layout.captureHeight !== encodeHeight
          if (scale) {
            await downscaleSequence(
              join(frames, 'full'),
              frames,
              captured.total,
              encodeWidth,
              encodeHeight,
            )
          } else {
            for (let i = 0; i < captured.total; i++) {
              await copyFile(join(frames, 'full', frameName(i)), join(frames, frameName(i)))
            }
          }
          const loopMetrics = await pngDiff(
            page,
            join(frames, frameName(0)),
            join(frames, frameName(captured.loop)),
          )
          const loopFail =
            Boolean(loopMetrics.error) ||
            loopMetrics.changedPct > LOOP_MAX_CHANGED_PCT ||
            loopMetrics.meanAbs > LOOP_MAX_MEAN_ABS
          const sheetFrames = [0, 0.25, 0.5, 0.75, 1].map((p) =>
            join(frames, frameName(Math.round(p * captured.last))),
          )
          await contactSheet(context, sheetFrames, sheet)
          encodeFrames(ffmpeg, blender, frames, mp4, captured.fps, captured.last)
          const info = await stat(mp4)
          rows.push({
            scene: entry.scene,
            overflow: captured.overflow,
            captureSize: { width: layout.captureWidth, height: layout.captureHeight },
            encodeSize: { width: encodeWidth, height: encodeHeight },
            bytes: info.size,
            loop: loopMetrics,
            loopFail,
            duration: captured.duration,
            fps: captured.fps,
            renderSeconds: 0,
          })
          if (loopFail) failed = true
          console.log(
            `[capture] ${entry.scene} overflow=${captured.overflow.overflow} loop changed=${loopMetrics.changedPct?.toFixed?.(3)}%`,
          )
        } catch (err) {
          failed = true
          console.error(`[capture] ${entry.scene} failed:`, err)
        } finally {
          await page.close()
        }
      }
      await context.close()
      await writeFile(join(outRoot, 'report.json'), JSON.stringify({ profile: args.profile, encoder, scenes: rows }, null, 2))
    }

    await browser.close()
  } finally {
    preview.kill('SIGTERM')
  }

  if (failed) {
    console.error('[capture] one or more scenes failed loop or probe checks')
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
