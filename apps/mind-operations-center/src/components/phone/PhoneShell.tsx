import type { ReactNode } from 'react'
import { useScene } from '../../context/SceneContext'
import { VIEW_REGISTRY } from '../../data/registry'
import './phone.css'

export function PhoneShell({ children }: { children: ReactNode }) {
  const { sceneId, mode } = useScene()
  const meta = VIEW_REGISTRY[sceneId]

  return (
    <div className={`phone-stage mode-${mode}`} data-surface="PHONE-01">
      {mode === 'review' ? (
        <div className="phone-review-meta" aria-hidden="true">
          <span>PHONE-01</span>
          <span>Scene {meta?.scene ?? '—'}</span>
          <span>{meta?.name}</span>
          <span>390 × 844 crop</span>
        </div>
      ) : null}

      <div className="phone-frame">
        <div className="phone-bezel">
          <div className="phone-notch" aria-hidden="true" />
          <div className="phone-screen">{children}</div>
          <div className="phone-home" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
