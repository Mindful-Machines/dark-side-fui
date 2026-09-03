import { isThoracicScene } from '../data/scenes'
import { isThoracicStateId, THORACIC_PROFILES } from './organ-monitor/thoracic/profile'
import { useScene } from '../context/SceneContext'

export function Footer() {
  const { scene } = useScene()
  const thoracic = isThoracicScene(scene.id)
  const descriptor =
    thoracic && isThoracicStateId(scene.id) ? THORACIC_PROFILES[scene.id].caption : null
  const body = scene.logPool.join('    ·    ')
  const ticker = descriptor ? `${descriptor}    ·    ${body}` : body

  return (
    <footer className="app-footer">
      <div className="footer-fixed">
        <span>SITE BLACKWOOD ANNEX</span>
        <span>UPLINK {scene.uplink}</span>
        <span>BUF {scene.scriptName}</span>
        {thoracic && <span className="footer-wip">PREVIEW BUILD</span>}
      </div>
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          <span>{ticker}</span>
          <span>{ticker}</span>
        </div>
      </div>
    </footer>
  )
}
