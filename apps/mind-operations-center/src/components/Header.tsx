import { useState } from 'react'
import { SceneSwitcher } from './SceneSwitcher'
import { useScene } from '../context/SceneContext'
import { useWhenVisibleInterval } from '../hooks/useWhenVisibleInterval'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useWhenVisibleInterval(() => setNow(new Date()), 1000)
  return now
}

function formatClock(date: Date) {
  return date.toISOString().slice(11, 19) + 'Z'
}

export function Header() {
  const { scene, mode, setMode, goTo } = useScene()
  const now = useClock()

  const requestFullscreen = () => {
    const el = document.documentElement
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.()
    } else {
      void document.exitFullscreen?.()
    }
  }

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-kicker">Mindful Machines</span>
        <h1>
          <button
            type="button"
            className="brand-title"
            aria-label="Return to Scene Directory"
            onClick={() => goTo('directory', 'review', 'push')}
          >
            Mind Operations Center
          </button>
        </h1>
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

        <div className="review-controls">
          <button
            type="button"
            className="review-link"
            onClick={() => goTo('directory', 'review', 'push')}
          >
            Directory
          </button>
          <div className="dir-mode compact" role="group" aria-label="Review or display mode">
            <button
              type="button"
              className={mode === 'review' ? 'is-active' : undefined}
              onClick={() => setMode('review')}
            >
              Review
            </button>
            <button
              type="button"
              className={mode === 'display' ? 'is-active' : undefined}
              onClick={() => setMode('display')}
            >
              Display
            </button>
          </div>
          <button type="button" className="dir-fs compact" onClick={requestFullscreen}>
            Fullscreen
          </button>
        </div>

        <SceneSwitcher />
      </div>
    </header>
  )
}
