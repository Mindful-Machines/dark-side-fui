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

/** Mediastinum secondary block for the thoracic telemetry rail. */
export function ThoracicTelemetry() {
  return (
    <div className="thx-cluster">
      <p className="thx-note">MEDIASTINUM</p>
      <Bar label="SNR" fill={58} />
      <Bar label="LOCK" fill={82} />
      <Bar label="FOCUS" fill={64} />
    </div>
  )
}

export function ThoracicFieldGuides() {
  return (
    <g className="thx-guides" fill="none">
      <path className="thx-caliper" d="M22 48 V380" />
      <path className="thx-tick" d="M18 48 H26 M18 380 H26" />
      <path className="thx-span" d="M70 42 H330" />
      <g className="thx-plane">
        <path d="M60 0 H340" />
      </g>
      <g className="thx-plane thx-plane-b">
        <path d="M80 0 H320" />
      </g>
      <path className="thx-lead" d="M248 210 L318 168" />
      <circle className="thx-anchor" cx="248" cy="210" r="1" />
      <path className="thx-reg" d="M48 72 H56 M52 68 V76" />
      <path className="thx-reg" d="M344 72 H352 M348 68 V76" />
      <path className="thx-reg" d="M196 390 H204 M200 386 V394" />
    </g>
  )
}
