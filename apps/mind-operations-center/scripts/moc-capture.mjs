#!/usr/bin/env node
/**
 * Deterministic MOC MP4 exporter.
 *
 * From apps/mind-operations-center:
 *   npm run capture:moc -- --profile preview
 *   npm run capture:moc -- --profile final
 *   npm run capture:moc -- --scene phone-map --profile preview
 *
 * Serves dist on 127.0.0.1:5193. Does not bind 5191 or 5192.
 */

import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
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

function parseArgs(argv) {
  const out = { profile: 'preview', scene: null, skipBuild: false, port: PORT }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--profile') out.profile = argv[++i]
    else if (a === '--scene') out.scene = argv[++i]
    else if (a === '--skip-build') out.skipBuild = true
    else if (a === '--port') out.port = Number(argv[++i])
  }
  return out
}

function sceneIds(value) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function resolveLayout(entry, profileName, profileSize) {
  if (entry.category === 'phone-screen') {
    return {
      captureWidth: profileSize.width,
      captureHeight: profileSize.height,
      encodeWidth: profileSize.width,
      encodeHeight: profileSize.height,
    }
  }
  return {
    captureWidth: 1920,
    captureHeight: 1080,
    encodeWidth: profileName === 'preview' ? 960 : 1920,
    encodeHeight: profileName === 'preview' ? 540 : 1080,
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

async function waitReady(page) {
  await page.waitForFunction(() => window.__MOC_CAPTURE__?.ready === true, null, { timeout: 45000 })
  const api = await page.evaluate(() => ({
    duration: window.__MOC_CAPTURE__.duration,
    fps: window.__MOC_CAPTURE__.fps,
    seed: window.__MOC_CAPTURE__.seed,
  }))
  return api
}

async function seek(page, ms) {
  await page.evaluate(async (t) => {
    const api = window.__MOC_CAPTURE__
    if (!api) throw new Error('capture API missing')
    await api.seek(t)
  }, ms)
}

async function screenshotTarget(page, target, path) {
  if (target === 'viewport') {
    await page.screenshot({ path, type: 'png', animations: 'allow', caret: 'hide' })
    return
  }
  const loc = page.locator(target)
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

async function measureTarget(page, target) {
  if (target === 'viewport') {
    const vp = page.viewportSize()
    return { width: vp.width, height: vp.height, selector: 'viewport' }
  }
  const box = await page.locator(target).boundingBox()
  if (!box) throw new Error(`capture target not found: ${target}`)
  return {
    width: even(Math.round(box.width)),
    height: even(Math.round(box.height)),
    selector: target,
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

async function captureEntry(page, origin, entry, defaults, layout, dirs) {
  const fps = entry.fps ?? defaults.fps
  const duration = entry.duration ?? defaults.duration
  const { last, loop, total } = frameTimes(duration, fps)
  const url = captureUrl(origin, entry, defaults)
  const started = Date.now()
  const scale =
    layout.captureWidth !== layout.encodeWidth || layout.captureHeight !== layout.encodeHeight
  const captureDir = scale ? join(dirs.frames, 'full') : dirs.frames

  await page.setViewportSize({ width: layout.captureWidth, height: layout.captureHeight })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await waitReady(page)
  if (entry.scene === 'cardiac-3d-lab' || entry.captureTarget !== 'viewport') {
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

  const crop = await measureTarget(page, entry.captureTarget)
  await mkdir(captureDir, { recursive: true })
  await mkdir(dirs.frames, { recursive: true })
  if (dirs.ecg) await mkdir(dirs.ecg, { recursive: true })

  const ecgFrom = 180
  const ecgTo = 191
  const waveSel = (await page.locator('.ecg-strip').count())
    ? '.ecg-strip'
    : (await page.locator('.waveform').count())
      ? '.waveform'
      : null

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
    const capturePath = join(captureDir, `frame_${String(i).padStart(4, '0')}.png`)
    await screenshotTarget(page, entry.captureTarget, capturePath)
    if (dirs.ecg && waveSel && i >= ecgFrom && i <= ecgTo) {
      await page.locator(waveSel).first().screenshot({
        path: join(dirs.ecg, `ecg_${String(i).padStart(4, '0')}.png`),
        animations: 'allow',
        caret: 'hide',
      })
    }
    if (i % 50 === 0 || i === total - 1) {
      console.log(`  frame ${i}/${loop}  t=${ms.toFixed(0)}ms`)
    }
  }

  if (scale) {
    console.log(
      `[capture] downscale ${layout.captureWidth}x${layout.captureHeight} -> ${layout.encodeWidth}x${layout.encodeHeight}`,
    )
    for (let i = 0; i < total; i++) {
      const name = `frame_${String(i).padStart(4, '0')}.png`
      downscalePng(join(captureDir, name), join(dirs.frames, name), layout.encodeWidth, layout.encodeHeight)
    }
  }

  const loopMetrics = await pngDiff(
    page,
    join(dirs.frames, 'frame_0000.png'),
    join(dirs.frames, `frame_${String(loop).padStart(4, '0')}.png`),
  )
  const loopFail =
    Boolean(loopMetrics.error) ||
    loopMetrics.changedPct > LOOP_MAX_CHANGED_PCT ||
    loopMetrics.meanAbs > LOOP_MAX_MEAN_ABS

  const sheetFrames = [0, 0.25, 0.5, 0.75, 1].map((p) =>
    join(dirs.frames, `frame_${String(Math.round(p * last)).padStart(4, '0')}.png`),
  )
  const ecgFrames =
    dirs.ecg && waveSel
      ? Array.from({ length: ecgTo - ecgFrom + 1 }, (_, i) =>
          join(dirs.ecg, `ecg_${String(ecgFrom + i).padStart(4, '0')}.png`),
        )
      : []

  const renderMs = Date.now() - started
  return {
    fps,
    duration,
    last,
    loop,
    crop,
    overflow,
    captureSize: { width: layout.captureWidth, height: layout.captureHeight },
    encodeSize: { width: layout.encodeWidth, height: layout.encodeHeight },
    loopMetrics,
    loopFail,
    renderMs,
    url,
    sheetFrames,
    ecgFrames,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.profile !== 'preview' && args.profile !== 'final') {
    throw new Error(`unknown profile ${args.profile}`)
  }

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
  const defaults = manifest.defaults
  let entries = manifest.entries
  if (args.scene) {
    const ids = sceneIds(args.scene)
    entries = entries.filter((e) => ids.includes(e.scene))
    if (entries.length === 0) throw new Error(`scene not in manifest: ${args.scene}`)
  } else {
    entries = entries.filter((e) => e.enabled)
  }
  if (entries.length === 0) throw new Error('no scenes selected')
  const preferred = ['research-pending', 'thoracic-idle', 'cardiac-3d-lab', 'phone-story-status', 'phone-map']
  entries.sort((a, b) => {
    const ia = preferred.indexOf(a.scene)
    const ib = preferred.indexOf(b.scene)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  const ffmpeg = findFfmpeg()
  const ffprobe = findFfprobe()
  const blender = findBlender()
  if (!ffmpeg && !blender) throw new Error('need ffmpeg or Blender to encode')
  const encoder = ffmpeg ? `ffmpeg:${ffmpeg}` : `blender:${blender}`
  console.log(`[capture] profile=${args.profile} encoder=${encoder} scenes=${entries.map((e) => e.scene).join(',')}`)

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
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
    })
    const outRoot = join(APP, 'exports', args.profile === 'final' ? 'mp4-final' : 'mp4-preview')
    const sheetDir = join(outRoot, 'contact')
    const ecgRoot = join(outRoot, 'ecg-inspect')
    await mkdir(sheetDir, { recursive: true })

    for (const entry of entries) {
      const size = manifest.profiles[args.profile][entry.category]
      const layout = resolveLayout(entry, args.profile, size)
      const frames = join(APP, 'exports', 'frames', args.profile, entry.scene)
      const mp4 = join(outRoot, entry.output)
      const sheet = join(sheetDir, entry.output.replace(/\.mp4$/, '.png'))
      const ecgDir = join(ecgRoot, entry.scene)
      const ecgSheet = join(ecgRoot, `${entry.scene}.png`)
      console.log(
        `[capture] ${entry.scene} layout ${layout.captureWidth}x${layout.captureHeight} encode ${layout.encodeWidth}x${layout.encodeHeight} target=${entry.captureTarget}`,
      )
      const page = await context.newPage()
      try {
        const result = await captureEntry(
          page,
          origin,
          entry,
          defaults,
          layout,
          { frames, sheet, ecg: entry.category === 'phone-screen' ? null : ecgDir },
        )
        await contactSheet(context, result.sheetFrames, sheet)
        if (result.ecgFrames.length > 0) {
          await contactSheet(context, result.ecgFrames, ecgSheet)
        }
        if (ffmpeg) encodeWithFfmpeg(ffmpeg, frames, mp4, result.fps, result.last)
        else encodeWithBlender(blender, frames, mp4, result.fps, result.last)

        const info = await stat(mp4)
        const probe = probeMp4(ffprobe, mp4)
        const expectedFrames = result.last + 1
        const expectedDuration = expectedFrames / result.fps
        let probeOk = true
        if (probe?.streams?.[0]) {
          const s = probe.streams[0]
          const nb = Number(s.nb_frames)
          const dur = Number(s.duration ?? probe.format?.duration)
          if (Number.isFinite(nb) && nb !== expectedFrames) probeOk = false
          if (Number.isFinite(dur) && Math.abs(dur - expectedDuration) > 0.08) probeOk = false
          if (s.width && s.height && (s.width !== layout.encodeWidth || s.height !== layout.encodeHeight)) {
            probeOk = false
          }
        }

        const row = {
          scene: entry.scene,
          category: entry.category,
          captureTarget: entry.captureTarget,
          requested: { width: layout.encodeWidth, height: layout.encodeHeight },
          captureSize: result.captureSize,
          encodeSize: result.encodeSize,
          crop: result.crop,
          overflow: result.overflow,
          duration: result.duration,
          fps: result.fps,
          framesEncoded: expectedFrames,
          loopCheckFrame: result.loop,
          file: mp4,
          contactSheet: sheet,
          ecgInspect: result.ecgFrames.length > 0 ? ecgSheet : null,
          bytes: info.size,
          encode: encoder,
          loop: result.loopMetrics,
          loopFail: result.loopFail,
          probe,
          probeOk,
          renderSeconds: result.renderMs / 1000,
          url: result.url,
        }
        rows.push(row)
        if (result.loopFail || !probeOk) failed = true
        console.log(
          `[capture] ${entry.scene} capture ${result.captureSize.width}x${result.captureSize.height} encode ${result.encodeSize.width}x${result.encodeSize.height} overflow=${result.overflow.overflow} loop changed=${result.loopMetrics.changedPct?.toFixed?.(3)}% mean=${result.loopMetrics.meanAbs?.toFixed?.(3)} max=${result.loopMetrics.maxDiff}  ${result.renderMs / 1000}s  ${result.loopFail ? 'LOOP FAIL' : 'loop ok'}`,
        )
      } catch (err) {
        failed = true
        console.error(`[capture] ${entry.scene} failed:`, err)
        rows.push({
          scene: entry.scene,
          category: entry.category,
          captureTarget: entry.captureTarget,
          requested: { width: layout.encodeWidth, height: layout.encodeHeight },
          crop: {},
          duration: entry.duration ?? defaults.duration,
          fps: entry.fps ?? defaults.fps,
          framesEncoded: 0,
          file: mp4,
          contactSheet: sheet,
          bytes: 0,
          encode: encoder,
          loop: { error: String(err) },
          loopFail: true,
          probeOk: false,
          renderSeconds: 0,
          url: '',
        })
      } finally {
        await page.close()
      }
    }

    await browser.close()
    const report = {
      profile: args.profile,
      encoder,
      generatedAt: new Date().toISOString(),
      thresholds: { changedPct: LOOP_MAX_CHANGED_PCT, meanAbs: LOOP_MAX_MEAN_ABS },
      phoneNative: manifest.phoneNative,
      scenes: rows,
    }
    const reportPath = join(outRoot, 'report.json')
    const mdPath = join(outRoot, 'report.md')
    await writeFile(reportPath, JSON.stringify(report, null, 2))
    const md = [
      `# MOC capture ${args.profile}`,
      '',
      `| scene | capture | encode | overflow | duration | size | loop changed% | mean abs | max | result | seconds |`,
      `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
      ...rows.map((r) => {
        const cap = r.captureSize ? `${r.captureSize.width}×${r.captureSize.height}` : '—'
        const enc = r.encodeSize ? `${r.encodeSize.width}×${r.encodeSize.height}` : `${r.requested?.width}×${r.requested?.height}`
        const kb = `${(r.bytes / 1024).toFixed(0)} KB`
        const loop = r.loopFail ? 'FAIL' : 'ok'
        const ov = r.overflow?.overflow ? 'YES' : 'no'
        return `| ${r.scene} | ${cap} | ${enc} | ${ov} | ${r.duration}s @${r.fps} | ${kb} | ${r.loop.changedPct?.toFixed?.(3)} | ${r.loop.meanAbs?.toFixed?.(3)} | ${r.loop.maxDiff} | ${loop} | ${r.renderSeconds.toFixed(1)} |`
      }),
      '',
    ].join('\n')
    await writeFile(mdPath, md)
    console.log(md)
    console.log(`[capture] report ${reportPath}`)
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
