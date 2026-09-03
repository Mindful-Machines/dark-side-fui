export function ScanOverlay() {
  return (
    <g className="scan-overlay" fill="none">
      <g className="scan-plane">
        <path d="M10 0 H90" />
      </g>
      <g className="scan-plane scan-plane-b">
        <path d="M16 0 H84" />
      </g>
      <path className="scan-caliper" d="M5.2 13 V70" />
      <path className="scan-tick" d="M4.2 13 H6.2 M4.2 70 H6.2" />
      <circle className="scan-anchor" cx="58.2" cy="43" r="0.45" />
      <path className="scan-lead" d="M58.2 43 L66.4 33.5" />
      <circle className="scan-anchor" cx="46.4" cy="62" r="0.4" />
      <path className="scan-lead" d="M22 76 C32 70 40 65 46.4 62" />
    </g>
  )
}
