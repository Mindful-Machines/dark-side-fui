import { useScene } from '../context/SceneContext'

export function Footer() {
  const { scene } = useScene()
  const ticker = [...scene.logPool, ...scene.logPool].join('    ·    ')

  return (
    <footer className="app-footer">
      <div className="footer-fixed">
        <span>SITE BLACKWOOD ANNEX</span>
        <span>UPLINK {scene.uplink}</span>
        <span>BUF {scene.scriptName}</span>
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
