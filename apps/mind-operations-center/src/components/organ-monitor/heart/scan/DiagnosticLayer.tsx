function Bar({ label, fill }: { label: string; fill: number }) {
  return (
    <div className="diag-mod">
      <span>{label}</span>
      <span className="diag-bar">
        <i className="diag-fill" style={{ width: `${fill}%` }} />
      </span>
    </div>
  )
}

export function DiagnosticLayer() {
  return (
    <div className="diag-layer" aria-hidden="true">
      <p className="diag-note">LV / RV</p>
      <Bar label="SNR" fill={58} />
      <Bar label="LOCK" fill={82} />
      <Bar label="NOISE" fill={36} />
    </div>
  )
}
