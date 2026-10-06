import { useEffect, useMemo, useRef, useState } from 'react'
import { Panel } from './Panel'
import { CAPTURE } from '../capture/config'
import { frozenClock, wrapLoop } from '../capture/runtime'
import { useCaptureTime } from '../capture/useCaptureTime'
import { useScene } from '../context/SceneContext'
import { useWhenVisibleInterval } from '../hooks/useWhenVisibleInterval'
import type { Scene } from '../types'

const LOG_MS = 1700

function stamp(date: Date) {
  return date.toISOString().slice(11, 23)
}

function seedLines(scene: Scene, origin: Date) {
  const msgs = [...scene.initialLog, ...scene.logPool]
  return msgs.map(
    (msg, i) => `${stamp(new Date(origin.getTime() - (msgs.length - i) * 720))}  ${msg}`,
  )
}

function linesAt(scene: Scene, origin: Date, timeMs: number) {
  const t = wrapLoop(timeMs)
  const extra = Math.floor(t / LOG_MS)
  const more = Array.from({ length: extra }, (_, i) => {
    const msg = scene.logPool[i % scene.logPool.length]
    return `${stamp(new Date(origin.getTime() + (i + 1) * LOG_MS))}  ${msg}`
  })
  return [...seedLines(scene, origin), ...more].slice(-40)
}

export function SignalLog() {
  const { scene } = useScene()
  const captureTime = useCaptureTime()
  const origin = useMemo(() => (CAPTURE.enabled ? frozenClock() : new Date()), [])
  const [lines, setLines] = useState(() =>
    CAPTURE.enabled ? linesAt(scene, origin, 0) : seedLines(scene, origin),
  )
  const scroller = useRef<HTMLUListElement>(null)
  const index = useRef(0)

  useEffect(() => {
    if (captureTime === null) return
    setLines(linesAt(scene, origin, captureTime))
  }, [captureTime, scene, origin])

  useWhenVisibleInterval(() => {
    const msg = scene.logPool[index.current % scene.logPool.length]
    index.current += 1
    setLines((prev) => [...prev.slice(-40), `${stamp(new Date())}  ${msg}`])
  }, CAPTURE.enabled ? null : LOG_MS, [scene.logPool])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  return (
    <Panel title="Signal log" meta="LIVE">
      <ul className="signal-log" ref={scroller}>
        {lines.map((line, i) => (
          <li key={`${line}-${i}`}>{line}</li>
        ))}
      </ul>
    </Panel>
  )
}
