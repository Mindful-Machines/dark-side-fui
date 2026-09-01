import { useEffect, useState } from 'react'
import type { Tone } from '../types'

interface WaveformProps {
  bpm: number
  noise: number
  paused?: boolean
  tone?: Tone
  mode?: 'ecg' | 'neural'
  height?: number
}

function sample(t: number, bpm: number, noise: number, mode: 'ecg' | 'neural') {
  if (mode === 'neural') {
    return (
      Math.sin(t * 1.4) * 0.35 +
      Math.sin(t * 3.1) * 0.18 +
      Math.sin(t * 7.7) * 0.08 +
      (Math.random() - 0.5) * noise
    )
  }

  const cycle = (t * (bpm / 60)) % 1
  let v = (Math.random() - 0.5) * noise * 0.35
  if (cycle > 0.16 && cycle < 0.22) {
    v += Math.sin(((cycle - 0.16) / 0.06) * Math.PI) * 1.35
  } else if (cycle > 0.34 && cycle < 0.5) {
    v += Math.sin(((cycle - 0.34) / 0.16) * Math.PI) * 0.28
  } else if (cycle > 0.08 && cycle < 0.14) {
    v += Math.sin(((cycle - 0.08) / 0.06) * Math.PI) * 0.12
  }
  return v
}

export function Waveform({
  bpm,
  noise,
  paused = false,
  tone = 'nominal',
  mode = 'ecg',
  height = 72,
}: WaveformProps) {
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: 140 }, (_, i) => sample(i * 0.05, bpm, noise, mode)),
  )

  useEffect(() => {
    if (paused) return
    let t = 7
    const id = window.setInterval(() => {
      t += 0.05
      const next = sample(t, bpm, noise, mode)
      setPoints((prev) => [...prev.slice(1), next])
    }, 50)
    return () => window.clearInterval(id)
  }, [bpm, noise, paused, mode])

  const w = 600
  const mid = height / 2
  const amp = height * 0.38
  const step = w / Math.max(points.length - 1, 1)
  const d = points
    .map((p, i) => {
      const x = i * step
      const y = mid - p * amp
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      className={`waveform tone-${tone}${paused ? ' is-paused' : ''}`}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={mode === 'ecg' ? 'Cardiac waveform' : 'Neural waveform'}
    >
      <path d={d} />
    </svg>
  )
}
