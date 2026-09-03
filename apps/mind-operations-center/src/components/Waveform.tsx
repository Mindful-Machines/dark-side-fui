import { useEffect, useState } from 'react'
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

export function Waveform({
  bpm,
  noise,
  paused = false,
  tone = 'nominal',
  mode = 'ecg',
  height = 72,
  irregular = false,
  className,
}: WaveformProps) {
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: 140 }, (_, i) => sample(i * 0.05, bpm, noise, mode, irregular)),
  )

  useEffect(() => {
    if (paused) return
    let t = 7
    const id = window.setInterval(() => {
      t += 0.05
      const next = sample(t, bpm, noise, mode, irregular)
      setPoints((prev) => [...prev.slice(1), next])
    }, 50)
    return () => window.clearInterval(id)
  }, [bpm, noise, paused, mode, irregular])

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
      className={`waveform tone-${tone}${paused ? ' is-paused' : ''}${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={mode === 'ecg' ? 'Cardiac waveform' : 'Neural waveform'}
    >
      <path d={d} />
    </svg>
  )
}
