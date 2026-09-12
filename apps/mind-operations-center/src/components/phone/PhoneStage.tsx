import { PhoneShell } from './PhoneShell'
import { useScene } from '../../context/SceneContext'
import './phone.css'

function StatusBar({ label }: { label: string }) {
  return (
    <header className="ph-top">
      <span className="ph-brand">MOC</span>
      <span className="ph-link">{label}</span>
      <span className="ph-clock">14:22</span>
    </header>
  )
}

export function PhoneStoryStatus() {
  return (
    <PhoneShell>
      <div className="ph-ui is-status">
        <StatusBar label="LINK WEAK" />
        <p className="ph-kicker">STORY STATUS</p>
        <div className="ph-hero-pct" aria-live="polite">
          <strong>82%</strong>
        </div>
        <p className="ph-missing">MISSING ENDING</p>
        <div className="ph-progress" role="progressbar" aria-valuenow={82} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: '82%' }} />
        </div>
        <p className="ph-stall">TRANSFER STALLED · ENDING SEQUENCE UNAVAILABLE</p>
        <div className="ph-tile" aria-hidden="true">
          <span className="ph-tile-scan" />
          <span>FEED · HOLD</span>
        </div>
        <footer className="ph-foot">
          <span>PHONE-01</span>
          <span>SC 54</span>
        </footer>
      </div>
    </PhoneShell>
  )
}

export function PhoneMapStatus() {
  return (
    <PhoneShell>
      <div className="ph-ui is-map">
        <StatusBar label="NAV LIVE" />
        <p className="ph-kicker">FACILITY MAP · SUBCONSCIOUS</p>

        <div className="ph-map" aria-label="Internal navigation map">
          <svg viewBox="0 0 200 240" className="ph-map-svg">
            <path className="ph-path explored" d="M30 200 H90 V140 H50 V90 H110 V50" />
            <path className="ph-path route" d="M110 50 H150 V30" />
            <path className="ph-path unmapped" d="M150 30 H180 V80" />
            <circle className="ph-node" cx="30" cy="200" r="3" />
            <circle className="ph-node" cx="90" cy="200" r="3" />
            <circle className="ph-node" cx="90" cy="140" r="3" />
            <circle className="ph-node" cx="50" cy="140" r="3" />
            <circle className="ph-node" cx="50" cy="90" r="3" />
            <circle className="ph-node" cx="110" cy="90" r="3" />
            <circle className="ph-node current" cx="110" cy="50" r="5" />
            <circle className="ph-pulse" cx="110" cy="50" r="10" />
            <polygon className="ph-objective" points="150,22 158,30 150,38 142,30" />
            <rect className="ph-fog" x="160" y="40" width="30" height="50" />
          </svg>
          <div className="ph-map-legend">
            <span>POS NODE-4</span>
            <span>OBJ EAST</span>
            <span>UNMAPPED</span>
          </div>
        </div>

        <div className="ph-story-strip">
          <span>STORY STATUS</span>
          <strong>82% — MISSING ENDING</strong>
        </div>

        <footer className="ph-foot">
          <span>PHONE-01</span>
          <span>SC 67</span>
        </footer>
      </div>
    </PhoneShell>
  )
}

export function PhoneStage() {
  const { sceneId } = useScene()
  return sceneId === 'phone-map' ? <PhoneMapStatus /> : <PhoneStoryStatus />
}
