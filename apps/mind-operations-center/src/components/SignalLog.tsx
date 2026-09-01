import { useEffect, useRef, useState } from 'react'
import { Panel } from './Panel'
import { useScene } from '../context/SceneContext'
import type { Scene } from '../types'

function stamp(date: Date) {
  return date.toISOString().slice(11, 23)
}

function seedLines(scene: Scene) {
  const origin = new Date()
  const msgs = [...scene.initialLog, ...scene.logPool]
  return msgs.map(
    (msg, i) => `${stamp(new Date(origin.getTime() - (msgs.length - i) * 720))}  ${msg}`,
  )
}

export function SignalLog() {
  const { scene } = useScene()
  const [lines, setLines] = useState(() => seedLines(scene))
  const scroller = useRef<HTMLUListElement>(null)
  const index = useRef(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      const msg = scene.logPool[index.current % scene.logPool.length]
      index.current += 1
      setLines((prev) => [...prev.slice(-40), `${stamp(new Date())}  ${msg}`])
    }, 1700)
    return () => window.clearInterval(id)
  }, [scene.logPool])

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
