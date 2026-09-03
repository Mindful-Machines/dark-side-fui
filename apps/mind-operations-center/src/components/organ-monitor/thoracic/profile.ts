import type { SceneId } from '../../../types'
import type { HeartProfile } from '../heart/states'

export type ThoracicStateId =
  | 'thoracic-idle'
  | 'thoracic-elevated'
  | 'thoracic-irregular'
  | 'thoracic-intervention'
  | 'thoracic-recovered'
  | 'thoracic-scan'

export const THORACIC_PROFILES: Record<ThoracicStateId, HeartProfile> = {
  'thoracic-idle': {
    key: 'idle',
    label: 'Idle',
    badge: 'WIP PREVIEW',
    tone: 'nominal',
    caption: 'Cardiac · thoracic · observe',
    irregular: false,
  },
  'thoracic-scan': {
    key: 'idle',
    label: 'Idle',
    badge: 'WIP PREVIEW',
    tone: 'nominal',
    caption: 'Cardiac · thoracic · observe',
    irregular: false,
  },
  'thoracic-elevated': {
    key: 'elevated',
    label: 'Elevated',
    badge: 'WIP PREVIEW',
    tone: 'warning',
    caption: 'Cardiac · thoracic · rate high',
    irregular: false,
  },
  'thoracic-irregular': {
    key: 'irregular',
    label: 'Irregular',
    badge: 'WIP PREVIEW',
    tone: 'warning',
    caption: 'Cardiac · thoracic · ectopy',
    irregular: true,
  },
  'thoracic-intervention': {
    key: 'intervention',
    label: 'Intervention',
    badge: 'WIP PREVIEW',
    tone: 'critical',
    caption: 'Cardiac · thoracic · correction',
    irregular: false,
  },
  'thoracic-recovered': {
    key: 'recovered',
    label: 'Recovered',
    badge: 'WIP PREVIEW',
    tone: 'nominal',
    caption: 'Cardiac · thoracic · restored',
    irregular: false,
  },
}

export function isThoracicStateId(id: SceneId): id is ThoracicStateId {
  return id in THORACIC_PROFILES
}
