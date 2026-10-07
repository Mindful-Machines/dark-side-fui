import { useEffect, useRef } from 'react'
import { CAPTURE } from '../../capture/config'
import { RESEARCH_FLASH_MS, RESEARCH_PENDING_MS } from '../../capture/intro'
import { useCaptureTime } from '../../capture/useCaptureTime'
import { useScene } from '../../context/SceneContext'
import './research-terminal.css'

export function ResearchTerminal() {
  const { sceneId, goTo } = useScene()
  const captureTime = useCaptureTime()
  const pending = sceneId === 'research-pending'
  const approved = sceneId === 'research-approved'
  const flashRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pending) return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        goTo('research-approved', undefined, 'push')
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [pending, goTo])

  useEffect(() => {
    if (!approved || !flashRef.current) return
    if (CAPTURE.isLoop) return
    if (CAPTURE.isIntro) {
      const on =
        captureTime !== null &&
        captureTime >= RESEARCH_PENDING_MS &&
        captureTime < RESEARCH_PENDING_MS + RESEARCH_FLASH_MS
      flashRef.current.classList.toggle('is-confirm', on)
      return
    }
    flashRef.current.classList.remove('is-confirm')
    // Retrigger CSS animation on each entry into approved.
    void flashRef.current.offsetWidth
    flashRef.current.classList.add('is-confirm')
  }, [approved, sceneId, captureTime])

  if (pending) {
    return (
      <div className="research-terminal is-pending" data-state="pending">
        <header className="rt-head">
          <span className="rt-kicker">LAB-TERM-01 · Scene 18</span>
          <span className="rt-mode">MANUAL CONTROL</span>
        </header>

        <div className="rt-body">
          <p className="rt-prompt">APPROVE AUTONOMOUS OPERATION?</p>

          <div className="rt-choices" role="group" aria-label="Authorization choice">
            <button
              type="button"
              className="rt-choice is-selected"
              aria-pressed="true"
              onClick={() => goTo('research-approved', undefined, 'push')}
            >
              YES
            </button>
            <span className="rt-sep">/</span>
            <button type="button" className="rt-choice" aria-pressed="false" disabled>
              NO
            </button>
          </div>

          <p className="rt-await">
            <span className="rt-yes-arm">YES SELECTED</span>
            <span className="rt-enter">
              AWAITING <kbd>ENTER</kbd>
            </span>
          </p>
        </div>

        <footer className="rt-foot">
          <span>AUTH CHANNEL OPEN</span>
          <span>CURSOR HOLD</span>
        </footer>
      </div>
    )
  }

  return (
    <div className="research-terminal is-approved" data-state="approved" ref={flashRef}>
      <header className="rt-head">
        <span className="rt-kicker">LAB-TERM-01 · Scene 18</span>
        <span className="rt-mode is-live">AUTONOMOUS</span>
      </header>

      <div className="rt-body">
        <p className="rt-confirm-line">AUTONOMOUS OPERATION APPROVED</p>
        <p className="rt-confirm-sub">AUTHORIZATION ACCEPTED</p>
        <p className="rt-confirm-mode">CONTROL MODE: AUTONOMOUS</p>
        <div className="rt-seal" aria-hidden="true">
          <span>ENTER</span>
          <span>CONFIRMED</span>
        </div>
      </div>

      <footer className="rt-foot">
        <span>AUTH LOCKED</span>
        <span>LAB SESSION ACTIVE</span>
      </footer>
    </div>
  )
}
