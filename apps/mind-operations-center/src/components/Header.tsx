import { useEffect, useState } from 'react'
import { SceneSwitcher } from './SceneSwitcher'
import { useScene } from '../context/SceneContext'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function formatClock(date: Date) {
  return date.toISOString().slice(11, 19) + 'Z'
}

export function Header() {
  const { scene } = useScene()
  const now = useClock()

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-kicker">Mindful Machines</span>
        <h1>Mind Operations Center</h1>
      </div>

      <div className={`status-pill tone-${scene.tone}`}>
        <span className="status-dot" />
        <span>{scene.status}</span>
      </div>

      <div className="header-right">
        <div className="header-meta">
          <span>SUBJ-04</span>
          <span className="sep">/</span>
          <span>SESS 19</span>
          <span className="sep">/</span>
          <time dateTime={now.toISOString()}>{formatClock(now)}</time>
        </div>
        <SceneSwitcher />
      </div>
    </header>
  )
}
