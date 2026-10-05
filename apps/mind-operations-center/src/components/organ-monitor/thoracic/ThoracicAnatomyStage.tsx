import { useId } from 'react'
import torsoUrl from '../../../assets/anatomy/human-body-silhouette.svg?url'
import { CardiacFocusRegion } from './CardiacFocusRegion'

/** Fixed upper-body crop of the 970×2200 Wikimedia silhouette. */
export const THORACIC_VIEWBOX = '0 0 970 1180' as const

/**
 * Single SVG stage: exact silhouette + heart share one coordinate system
 * and therefore one responsive scale.
 */
export function ThoracicAnatomyStage() {
  const maskId = useId().replace(/:/g, '')

  return (
    <svg
      className="thoracic-anatomy-stage"
      viewBox={THORACIC_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Thoracic anatomy"
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="970"
          height="2200"
          style={{ maskType: 'alpha' }}
        >
          <image href={torsoUrl} x="0" y="0" width="970" height="2200" preserveAspectRatio="none" />
        </mask>
      </defs>

      {/* Painted only within the upper-torso viewBox (legs stay in mask, not drawn) */}
      <rect
        className="thx-body-fill"
        x="0"
        y="0"
        width="970"
        height="1180"
        mask={`url(#${maskId})`}
      />

      <CardiacFocusRegion />
    </svg>
  )
}
