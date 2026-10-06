import { CAPTURE } from './config'
import { wrapLoop } from './runtime'

/** 17 sinus cycles in the 15 s capture loop → 68 BPM. */
export const CAPTURE_LOOP_S = 15
export const CAPTURE_BEATS = 17
export const CAPTURE_BEAT_S = CAPTURE_LOOP_S / CAPTURE_BEATS

const WINDOW_S = 5
const SAMPLE_HZ = 120

function gauss(x: number, mu: number, sigma: number) {
  const d = (x - mu) / sigma
  return Math.exp(-0.5 * d * d)
}

function wrapTime(t: number) {
  const loop = CAPTURE_LOOP_S
  return ((t % loop) + loop) % loop
}

/** Recognizable P-QRS-T; phase is 0–1 within one beat. */
function pqrst(phase: number) {
  return (
    0.14 * gauss(phase, 0.12, 0.022) -
    0.12 * gauss(phase, 0.205, 0.009) +
    1.18 * gauss(phase, 0.24, 0.011) -
    0.32 * gauss(phase, 0.275, 0.012) +
    0.35 * gauss(phase, 0.46, 0.04)
  )
}

function pvc(phase: number) {
  return 0.58 * gauss(phase, 0.3, 0.05) - 0.22 * gauss(phase, 0.42, 0.045)
}

function loopNoise(tau: number, noise: number, seed: number) {
  const w = (2 * Math.PI * tau) / CAPTURE_LOOP_S
  return noise * (0.2 * Math.sin(w * 31 + seed) + 0.07 * Math.sin(w * 47 + seed * 1.7))
}

function sampleEcg(t: number, noise: number, irregular: boolean) {
  const tau = wrapTime(t)
  const beat = Math.floor(tau / CAPTURE_BEAT_S) % CAPTURE_BEATS
  const phase = (tau - beat * CAPTURE_BEAT_S) / CAPTURE_BEAT_S
  const v = irregular && beat % 4 === 2 ? pvc(phase) : pqrst(phase)
  return v + loopNoise(tau, noise, CAPTURE.seed)
}

function sampleNeural(t: number, noise: number) {
  const tau = wrapTime(t)
  const w = (2 * Math.PI * tau) / CAPTURE_LOOP_S
  return (
    Math.sin(w * 3) * 0.35 +
    Math.sin(w * 8) * 0.18 +
    Math.sin(w * 17) * 0.08 +
    loopNoise(tau, noise, CAPTURE.seed)
  )
}

/**
 * Visible strip sampled from one 15 s looping signal.
 * Frame N→N+1 advances every sample time by exactly 1/fps seconds.
 */
export function captureWavePoints(
  timeMs: number,
  opts: { noise: number; mode: 'ecg' | 'neural'; irregular?: boolean },
): number[] {
  const tEnd = wrapLoop(timeMs) / 1000
  const count = Math.round(WINDOW_S * SAMPLE_HZ) + 1
  const dt = 1 / SAMPLE_HZ
  const pts = new Array<number>(count)
  for (let i = 0; i < count; i++) {
    const t = tEnd - (count - 1 - i) * dt
    pts[i] =
      opts.mode === 'neural'
        ? sampleNeural(t, opts.noise)
        : sampleEcg(t, opts.noise, Boolean(opts.irregular))
  }
  return pts
}
