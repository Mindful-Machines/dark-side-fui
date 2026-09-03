import { SOURCE_SIZE } from '../source/paths'
import { DiagnosticLayer } from './DiagnosticLayer'
import { HeartFocus } from './HeartFocus'
import { OrganInset } from './OrganInset'
import { ScanOverlay } from './ScanOverlay'

export function AnatomyScan() {
  return (
    <div className="anatomy-scan-root">
      <svg className="anatomy-field" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ScanOverlay />
      </svg>
      <svg
        className="heart-visual"
        viewBox={`0 0 ${SOURCE_SIZE.w} ${SOURCE_SIZE.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Cardiac organ scan"
      >
        <HeartFocus />
      </svg>
      <span className="scan-dim">118 mm</span>
      <span className="scan-target" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="2.35" />
          <path d="M12 5.4 V8.9 M12 15.1 V18.6 M5.4 12 H8.9 M15.1 12 H18.6" />
        </svg>
      </span>
      <DiagnosticLayer />
      <OrganInset />
    </div>
  )
}
