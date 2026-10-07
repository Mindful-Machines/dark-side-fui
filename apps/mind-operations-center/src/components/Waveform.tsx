import { memo, useEffect, useMemo, useRef } from 'react'
import { CAPTURE } from '../capture/config'
import { captureWavePoints } from '../capture/signal'
import { useCaptureTime } from '../capture/useCaptureTime'
import type { Tone } from '../types'

interface WaveformProps {
  bpm: number
  noise: number
  paused?: boolean
  tone?: Tone
  mode?: 'ecg' | 'neural'
  height?: number
  irregular?: boolean
  className?: string
}

const POINT_COUNT = 140
/** ~10 FPS — preserves waveform character with far less React/SVG churn than 50ms. */
const FRAME_MS = 100
/** Advance sample clock to keep visual scroll speed matched to the old 50ms/0.05 step. */
const TIME_STEP = 0.1

function sample(
  t: number,
  bpm: number,
  noise: number,
  mode: 'ecg' | 'neural',
  irregular = false,
) {
  if (mode === 'neural') {
    return (
      Math.sin(t * 1.4) * 0.35 +
      Math.sin(t * 3.1) * 0.18 +
      Math.sin(t * 7.7) * 0.08 +
      (Math.random() - 0.5) * noise
    )
  }

  const cycleTime = t * (bpm / 60)
  const beat = Math.floor(cycleTime)
  let phase = cycleTime % 1
  if (irregular) {
    if (beat % 4 === 2) {
      return Math.sin(t * 11) * 0.08 + (Math.random() - 0.5) * noise
    }
    if (beat % 6 === 4) phase = Math.min(0.99, phase * 1.35)
  }

  let v = (Math.random() - 0.5) * noise * 0.35
  if (phase > 0.16 && phase < 0.22) {
    v += Math.sin(((phase - 0.16) / 0.06) * Math.PI) * 1.35
  } else if (phase > 0.34 && phase < 0.5) {
    v += Math.sin(((phase - 0.34) / 0.16) * Math.PI) * 0.28
  } else if (phase > 0.08 && phase < 0.14) {
    v += Math.sin(((phase - 0.08) / 0.06) * Math.PI) * 0.12
  }
  return v
}

function buildPath(points: number[], height: number) {
  const w = 600
  const mid = height / 2
  const amp = height * 0.38
  const step = w / Math.max(points.length - 1, 1)
  return points
    .map((p, i) => {
      const x = i * step
      const y = mid - p * amp
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function WaveformInner({
  bpm,
  noise,
  paused = false,
  tone = 'nominal',
  mode = 'ecg',
  height = 72,
  irregular = false,
  className,
}: WaveformProps) {
  const captureTime = useCaptureTime()
  const pathRef = useRef<SVGPathElement>(null)
  const pointsRef = useRef<number[]>(
    Array.from({ length: POINT_COUNT }, (_, i) => sample(i * 0.05, bpm, noise, mode, irregular)),
  )
  const initialD = useMemo(
    () =>
      buildPath(
        CAPTURE.enabled
          ? captureWavePoints(0, { noise, mode, irregular })
          : pointsRef.current,
        height,
      ),
    // Initial paint only — live updates mutate the path attribute directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    if (captureTime === null) return
    const pts = captureWavePoints(paused || CAPTURE.isIntro ? 0 : captureTime, {
      noise,
      mode,
      irregular,
    })
    pointsRef.current = pts
    const el = pathRef.current
    if (el) el.setAttribute('d', buildPath(pts, height))
  }, [captureTime, noise, paused, mode, irregular, height])

  useEffect(() => {
    if (CAPTURE.enabled || paused) return

    let t = 7
    let id = 0

    const paint = () => {
      t += TIME_STEP
      const pts = pointsRef.current
      pts.shift()
      pts.push(sample(t, bpm, noise, mode, irregular))
      const el = pathRef.current
      if (el) el.setAttribute('d', buildPath(pts, height))
    }

    const start = () => {
      if (id !== 0) return
      id = window.setInterval(paint, FRAME_MS)
    }
    const stop = () => {
      if (id === 0) return
      window.clearInterval(id)
      id = 0
    }
    const onVis = () => {
      if (document.hidden) stop()
      else start()
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [bpm, noise, paused, mode, irregular, height, captureTime])

  return (
    <svg
      className={`waveform tone-${tone}${paused ? ' is-paused' : ''}${className ? ` ${className}` : ''}`}
      viewBox={`0 0 600 ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={mode === 'ecg' ? 'Cardiac waveform' : 'Neural waveform'}
    >
      <path ref={pathRef} d={initialD} />
    </svg>
  )
}

export const Waveform = memo(WaveformInner)
