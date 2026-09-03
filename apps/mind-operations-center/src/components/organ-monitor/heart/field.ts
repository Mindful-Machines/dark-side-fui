import { SILHOUETTE_POLY, SOURCE_SIZE } from './source/paths'

export const HEART_CLIP_ID = 'heart-data-clip'

export const CX = 198
export const CY = 244

type Pt = { x: number; y: number }

const POLY: Pt[] = SILHOUETTE_POLY

const GLYPH_POOL = ['04', '11', 'A7', '3F', '92', '18', 'B2', '07', 'LV', 'RV', '0.6', 'SEP', 'Δ', '·', 'CH', 'Σ']

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function inside(p: Pt, poly = POLY) {
  let n = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + 0.0001) + a.x) {
      n = !n
    }
  }
  return n
}

function scalePoly(s: number) {
  return POLY.map((p) => ({ x: CX + (p.x - CX) * s, y: CY + (p.y - CY) * s }))
}

function edgeFragments(poly: Pt[], rand: () => number, keep: number) {
  const segs: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    let t = rand() * 0.12
    while (t < 0.92) {
      const span = 0.1 + rand() * 0.16
      if (rand() < keep) {
        segs.push({
          x1: a.x + (b.x - a.x) * t,
          y1: a.y + (b.y - a.y) * t,
          x2: a.x + (b.x - a.x) * Math.min(1, t + span),
          y2: a.y + (b.y - a.y) * Math.min(1, t + span),
        })
      }
      t += span + 0.06 + rand() * 0.14
    }
  }
  return segs
}

function toPath(segs: { x1: number; y1: number; x2: number; y2: number }[]) {
  return segs.map((s) => `M${s.x1.toFixed(1)} ${s.y1.toFixed(1)}L${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`).join('')
}

function sampleField(count: number, rand: () => number) {
  const pts: Pt[] = []
  let guard = 0
  while (pts.length < count && guard < count * 16) {
    guard += 1
    const p = { x: 8 + rand() * (SOURCE_SIZE.w - 16), y: 8 + rand() * (SOURCE_SIZE.h - 16) }
    if (!inside(p)) continue
    const r = Math.hypot((p.x - CX) / 150, (p.y - CY) / 190)
    if (rand() > 0.22 + 0.7 * (1 - Math.min(1, r))) continue
    pts.push(p)
  }
  return pts
}

const rand = rng(0x4a7c11)

const basePts = sampleField(160, rand)
const hiPts = sampleField(90, rand)

type Seg = { x1: number; y1: number; x2: number; y2: number }

function segmentsFrom(pts: Pt[], rand: () => number, coralRate: number) {
  const base: Seg[] = []
  const hi: Seg[] = []
  const signal: Seg[] = []
  const fault: Seg[] = []
  pts.forEach((p, i) => {
    const a = Math.atan2(p.y - CY, p.x - CX) + Math.PI / 2 + (rand() - 0.5) * 1.1
    const len = 2.4 + rand() * 8.5
    const s = {
      x1: p.x,
      y1: p.y,
      x2: p.x + Math.cos(a) * len,
      y2: p.y + Math.sin(a) * len,
    }
    if (rand() < coralRate) signal.push(s)
    else if (i % 9 === 0) fault.push(s)
    else if (i % 3 === 0) hi.push(s)
    else base.push(s)
  })
  return { base, hi, signal, fault }
}

const baseSeg = segmentsFrom(basePts, rand, 0.1)
const hiSeg = segmentsFrom(hiPts, rand, 0.16)

export const FIELD = {
  dots: basePts.map((p, i) => ({ ...p, beat: i % 7 === 0, hi: false, fault: i % 11 === 0 })),
  dotsHi: hiPts.map((p, i) => ({ ...p, beat: i % 8 === 0, hi: true, fault: i % 13 === 0 })),
  segs: {
    base: toPath(baseSeg.base),
    hi: toPath(baseSeg.hi.concat(hiSeg.base, hiSeg.hi)),
    signal: toPath(baseSeg.signal.concat(hiSeg.signal)),
    fault: toPath(baseSeg.fault.concat(hiSeg.fault)),
  },
  glyphs: sampleField(22, rand).map((p, i) => ({
    ...p,
    t: GLYPH_POOL[i % GLYPH_POOL.length],
    hi: i % 3 !== 0,
    fault: i % 10 === 0,
  })),
  contours: {
    outer: toPath(edgeFragments(POLY, rand, 0.55)),
    mid: toPath(edgeFragments(scalePoly(0.78), rand, 0.42)),
    inner: toPath(edgeFragments(scalePoly(0.56), rand, 0.38)),
  },
  flow: [
    'M92 210 C98 268 110 330 168 392',
    'M286 196 C300 258 292 340 250 404',
    'M188 128 C230 118 286 112 336 108',
    'M198 72 C236 28 292 22 328 48',
  ],
  pulsePath: 'M210 86 C198 168 186 260 214 348 C232 400 258 430 248 448',
  scans: [48, 96, 144, 192, 240, 288, 336, 384, 432],
}
