import { CHAMBER_PATHS } from '../heart/source/paths'

function Bar({ label, fill }: { label: string; fill: number }) {
  return (
    <div className="thx-mod">
      <span>{label}</span>
      <span className="thx-bar">
        <i className="thx-fill" style={{ width: `${fill}%` }} />
      </span>
    </div>
  )
}

export function ThoracicOverlay() {
  const lv = CHAMBER_PATHS[1]
  return (
    <>
      <span className="thx-dim">142 mm</span>
      <div className="thx-cluster" aria-hidden="true">
        <p className="thx-note">MEDIASTINUM</p>
        <Bar label="SNR" fill={58} />
        <Bar label="LOCK" fill={82} />
        <Bar label="FOCUS" fill={64} />
      </div>
      <svg className="thx-inset" viewBox="0 0 72 60" aria-hidden="true">
        <path className="thx-inset-frame" d="M2 2 H8 M2 2 V8 M70 2 H64 M70 2 V8 M2 58 H8 M2 58 V52 M70 58 H64 M70 58 V52" />
        <text className="thx-inset-kicker" x="4" y="11">
          LV
        </text>
        <text className="thx-inset-metric" x="4" y="56">
          WALL 11
        </text>
        <g transform="translate(43 32) scale(0.235) translate(-275 -282)">
          <path className="thx-inset-lv" d={lv} />
        </g>
      </svg>
    </>
  )
}

export function ThoracicFieldGuides() {
  return (
    <g className="thx-guides" fill="none">
      <path className="thx-caliper" d="M16 42 V268" />
      <path className="thx-tick" d="M14 42 H18 M14 268 H18" />
      <path className="thx-span" d="M44 42 H196" />
      <g className="thx-plane">
        <path d="M32 0 H208" />
      </g>
      <g className="thx-plane thx-plane-b">
        <path d="M48 0 H192" />
      </g>
      <path className="thx-lead" d="M158 126 L176 98" />
      <circle className="thx-anchor" cx="158" cy="126" r="0.7" />
      <path className="thx-lead" d="M36 248 C58 220 78 176 108 156" />
    </g>
  )
}
