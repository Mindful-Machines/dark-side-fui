import type { SceneId, Tone } from '../../../types'

export type HeartStateId =
  | 'heart-idle'
  | 'heart-elevated'
  | 'heart-irregular'
  | 'heart-intervention'
  | 'heart-recovered'

export interface HeartProfile {
  key: string
  label: string
  badge: string
  tone: Tone
  caption: string
  irregular: boolean
}

export const HEART_PROFILES: Record<HeartStateId, HeartProfile> = {
  'heart-idle': {
    key: 'idle',
    label: 'Idle',
    badge: 'SINUS RHYTHM',
    tone: 'nominal',
    caption: 'Cardiac · organ · observe',
    irregular: false,
  },
  'heart-elevated': {
    key: 'elevated',
    label: 'Elevated',
    badge: 'SINUS TACHYCARDIA',
    tone: 'warning',
    caption: 'Cardiac · organ · rate high',
    irregular: false,
  },
  'heart-irregular': {
    key: 'irregular',
    label: 'Irregular',
    badge: 'ARRHYTHMIA',
    tone: 'warning',
    caption: 'Cardiac · organ · ectopy',
    irregular: true,
  },
  'heart-intervention': {
    key: 'intervention',
    label: 'Intervention',
    badge: 'CORRECTION',
    tone: 'critical',
    caption: 'Cardiac · organ · drive lock',
    irregular: false,
  },
  'heart-recovered': {
    key: 'recovered',
    label: 'Recovered',
    badge: 'NOMINAL',
    tone: 'nominal',
    caption: 'Cardiac · organ · stable',
    irregular: false,
  },
}

export function isHeartStateId(id: SceneId): id is HeartStateId {
  return id in HEART_PROFILES
}
