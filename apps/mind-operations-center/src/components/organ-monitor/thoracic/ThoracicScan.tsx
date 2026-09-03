import { CardiacFocusRegion } from './CardiacFocusRegion'
import { ThoracicAnatomy } from './ThoracicAnatomy'
import { ThoracicFieldGuides, ThoracicOverlay } from './ThoracicOverlay'

export function ThoracicScan() {
  return (
    <div className="thoracic-scan">
      <svg className="thx-field" viewBox="0 0 240 320" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Thoracic scan">
        <ThoracicFieldGuides />
        <ThoracicAnatomy />
        <CardiacFocusRegion />
      </svg>
      <ThoracicOverlay />
    </div>
  )
}
