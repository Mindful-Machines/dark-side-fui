import { CAPTURE, captureOrigin } from './config'
import { introCssMs, introVideoMs } from './intro'

const DIVISORS = [15 / 17, 1, 1.5, 2.5, 3, 3.75, 5, 7.5, 15]

let timeMs = 0
const listeners = new Set<() => void>()

export function getCaptureTimeMs() {
  return timeMs
}

export function subscribeCapture(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function notify() {
  for (const fn of listeners) fn()
}

export function wrapLoop(ms: number) {
  const loop = CAPTURE.duration * 1000
  return ((ms % loop) + loop) % loop
}

export function hash01(t: number, seed = CAPTURE.seed) {
  const x = Math.sin((t + 1.17) * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function frozenClock() {
  return captureOrigin(CAPTURE.seed)
}

function snapDuration(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return 15
  return DIVISORS.reduce((best, d) => (Math.abs(d - sec) < Math.abs(best - sec) ? d : best))
}

function parseSeconds(value: string) {
  return value.split(',').map((part) => {
    const n = Number.parseFloat(part.trim())
    if (part.includes('ms')) return n / 1000
    return n
  })
}

export function applyCssCaptureTime(ms: number) {
  const t = wrapLoop(ms) / 1000
  document.documentElement.style.setProperty('--capture-t', `${t}s`)
  document.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const style = getComputedStyle(el)
    if (!style.animationName || style.animationName === 'none') return
    const durs = parseSeconds(style.animationDuration)
    el.style.animationPlayState = durs.map(() => 'paused').join(', ')
    el.style.animationDuration = durs.map((d) => `${snapDuration(d)}s`).join(', ')
    const snapped = parseSeconds(el.style.animationDuration)
    el.style.animationDelay = snapped.map((d) => `-${(t % d + d) % d}s`).join(', ')
  })
}

function waitSeeked(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener('seeked', done)
      window.clearTimeout(timeout)
      resolve()
    }
    const timeout = window.setTimeout(done, 2000)
    video.addEventListener('seeked', done)
  })
}

function waitReady(video: HTMLVideoElement) {
  if (video.readyState >= 2) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener('loadeddata', done)
      video.removeEventListener('error', done)
      window.clearTimeout(timeout)
      resolve()
    }
    const timeout = window.setTimeout(done, 4000)
    video.addEventListener('loadeddata', done)
    video.addEventListener('error', done)
  })
}

function targetTime(video: HTMLVideoElement) {
  const raw = CAPTURE.isIntro ? introVideoMs(CAPTURE.scene, timeMs, CAPTURE.command) : timeMs
  const t = wrapLoop(raw) / 1000
  const dur = video.duration
  if (!Number.isFinite(dur) || dur <= 0) return t
  let ct = t % dur
  if (ct > dur - 1 / Math.max(CAPTURE.fps, 1)) ct = 0
  return ct
}

async function seekVideos() {
  const videos = [...document.querySelectorAll('video')]
  await Promise.all(
    videos.map(async (video) => {
      video.pause()
      video.muted = true
      await waitReady(video)
      const ct = targetTime(video)
      const close = Math.abs(video.currentTime - ct) <= 1 / Math.max(CAPTURE.fps, 1)
      if (close) {
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1
        const nudge = (ct + 1 / Math.max(CAPTURE.fps, 1)) % dur
        const first = waitSeeked(video)
        video.currentTime = nudge
        await first
      }
      const waited = waitSeeked(video)
      video.currentTime = ct
      await waited
    }),
  )
}

export async function seekCapture(ms: number) {
  timeMs = CAPTURE.isIntro ? Math.max(0, ms) : wrapLoop(ms)
  notify()
  if (CAPTURE.isIntro && CAPTURE.command) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
  }
  const cssMs = CAPTURE.isIntro ? introCssMs(CAPTURE.scene, timeMs, CAPTURE.command) : timeMs
  applyCssCaptureTime(cssMs)
  await seekVideos()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export async function waitCaptureAssets() {
  await document.fonts.ready
  const images = [...document.images]
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          }),
    ),
  )
  const videos = [...document.querySelectorAll('video')]
  await Promise.all(
    videos.map((video) => {
      if (video.readyState >= 2) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const done = () => resolve()
        video.addEventListener('loadeddata', done, { once: true })
        video.addEventListener('error', done, { once: true })
        window.setTimeout(done, 4000)
      })
    }),
  )
}
