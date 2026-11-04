import type { SceneId } from '../types'
import {
  CORE_SCENE_ORDER,
  EPISODE_SCENE_ORDER,
  HEART_SCENE_ORDER,
  OPERATOR_SCENE_ORDER,
  PHONE_SCENE_ORDER,
  RESEARCH_SCENE_ORDER,
  THORACIC_SCENE_ORDER,
} from './scenes'

/** Build / review readiness shown in the Scene Directory. */
export type ViewStatus = 'READY' | 'IN PROGRESS' | 'PLANNED' | 'LOCKED'

export type ProductionSurface =
  | 'WALL-01'
  | 'CTRL-C'
  | 'CTRL-L1'
  | 'CTRL-L2'
  | 'CTRL-R1'
  | 'CTRL-R2'
  | 'STATION-A-L'
  | 'STATION-A-R'
  | 'STATION-B-L'
  | 'STATION-B-R'
  | 'LAB-TERM-01'
  | 'PHONE-01'

export type Importance = 'HERO' | 'FEATURE' | 'BG' | 'AMBIENT'

export type DeviceKind = 'wall' | 'monitor' | 'laptop' | 'phone'

export type ViewFormat = 'landscape' | 'portrait' | 'square'

export type ViewGroup =
  | 'directory'
  | 'operations'
  | 'cardiac'
  | 'thoracic'
  | 'research'
  | 'operator'
  | 'phone'
  | 'episode'

export type AppMode = 'review' | 'display'

/** Sections that host letter-key views. */
export type LetterSection = 'operations' | 'cardiac' | 'thoracic' | 'research' | 'phone' | 'episode'

export interface ViewMeta {
  id: SceneId
  indexLabel: string
  name: string
  /** Episode / script scene number — centralized, change here only. */
  scene: string | null
  surface: ProductionSurface | null
  importance: Importance | null
  device: DeviceKind | null
  status: ViewStatus
  cue: string
  format: ViewFormat | null
  /**
   * Directory KEY display as a sequence (not a chord), e.g. `2 · W`.
   */
  shortcut: string
  sectionKey: string
  letterKey: string | null
  group: ViewGroup
  hidden?: boolean
  /** Review directory only. Stays off production lists and the keyboard map. */
  devOnly?: boolean
}

/** Default / first view opened when a section number is pressed. */
export const SECTION_DEFAULT: Record<Exclude<ViewGroup, 'directory'>, SceneId> = {
  operations: 'idle',
  cardiac: 'heart-idle',
  thoracic: 'thoracic-idle',
  research: 'research-pending',
  operator: 'operator-console',
  phone: 'phone-story-status',
  episode: 'heart-monitor-elevated',
}

/**
 * Digit → section.
 * Research=4, Operator=5, Phone=6.
 */
export const SECTION_BY_DIGIT: Record<string, ViewGroup> = {
  '0': 'directory',
  '1': 'operations',
  '2': 'cardiac',
  '3': 'thoracic',
  '4': 'research',
  '5': 'operator',
  '6': 'phone',
  '7': 'episode',
}

export const LETTER_MAP: Record<LetterSection, Record<string, SceneId>> = {
  operations: {
    q: 'idle',
    w: 'elevated',
    e: 'thoughts',
    r: 'executing',
    t: 'paused',
    y: 'uploading',
    u: 'partial',
    i: 'script-cogito',
    o: 'script-tower-cranes',
  },
  cardiac: {
    q: 'heart-idle',
    w: 'heart-elevated',
    e: 'heart-irregular',
    r: 'heart-intervention',
    t: 'heart-recovered',
  },
  thoracic: {
    q: 'thoracic-idle',
    w: 'thoracic-elevated',
    e: 'thoracic-irregular',
    r: 'thoracic-intervention',
    t: 'thoracic-recovered',
  },
  research: {
    q: 'research-pending',
    w: 'research-approved',
  },
  phone: {
    q: 'phone-story-status',
    w: 'phone-map',
  },
  episode: {
    q: 'heart-monitor-elevated',
    w: 'heart-monitor-normal',
    e: 'subconscious-stream',
    r: 'hope-overwhelmed',
    t: 'script-highlight-edit',
    y: 'overflow-detected-scapula',
    u: 'uploading-new-script',
    i: 'missing-ending',
  },
}

export const SECTION_NAV_ORDER: Record<ViewGroup, SceneId[]> = {
  directory: ['directory'],
  operations: [...CORE_SCENE_ORDER],
  cardiac: [...HEART_SCENE_ORDER],
  thoracic: [...THORACIC_SCENE_ORDER],
  research: [...RESEARCH_SCENE_ORDER],
  operator: [...OPERATOR_SCENE_ORDER],
  phone: [...PHONE_SCENE_ORDER],
  episode: [...EPISODE_SCENE_ORDER],
}

/** Sequence display — never implies simultaneous keypress. */
function seq(sectionKey: string, letter: string | null): string {
  return letter ? `${sectionKey} · ${letter}` : sectionKey
}

/**
 * Single metadata registry for directory, switcher, and navigation.
 * Runtime vitals stay in `SCENES`. Change episode `scene` numbers here only.
 */
export const VIEW_REGISTRY: Record<SceneId, ViewMeta> = {
  directory: {
    id: 'directory',
    indexLabel: '00',
    name: 'Scene Directory',
    scene: null,
    surface: 'CTRL-C',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'Inventory · launch · review',
    format: 'landscape',
    shortcut: '0',
    sectionKey: '0',
    letterKey: null,
    group: 'directory',
  },

  idle: {
    id: 'idle',
    indexLabel: '01',
    name: 'Idle / system overview',
    scene: '12',
    surface: 'WALL-01',
    importance: 'HERO',
    device: 'wall',
    status: 'READY',
    cue: 'Boot · session held',
    format: 'landscape',
    shortcut: seq('1', 'Q'),
    sectionKey: '1',
    letterKey: 'Q',
    group: 'operations',
  },
  elevated: {
    id: 'elevated',
    indexLabel: '02',
    name: 'Elevated heart rate',
    scene: '12',
    surface: 'WALL-01',
    importance: 'HERO',
    device: 'wall',
    status: 'READY',
    cue: 'Sympathetic spike · standby',
    format: 'landscape',
    shortcut: seq('1', 'W'),
    sectionKey: '1',
    letterKey: 'W',
    group: 'operations',
  },
  thoughts: {
    id: 'thoughts',
    indexLabel: '03',
    name: 'Subconscious thought stream',
    scene: '12',
    surface: 'WALL-01',
    importance: 'HERO',
    device: 'wall',
    status: 'READY',
    cue: 'CH-7 open · no bind',
    format: 'landscape',
    shortcut: seq('1', 'E'),
    sectionKey: '1',
    letterKey: 'E',
    group: 'operations',
  },
  executing: {
    id: 'executing',
    indexLabel: '04',
    name: 'Current script: executing',
    scene: '14',
    surface: 'WALL-01',
    importance: 'HERO',
    device: 'wall',
    status: 'READY',
    cue: 'Title rewrite · AURORA-7 live',
    format: 'landscape',
    shortcut: seq('1', 'R'),
    sectionKey: '1',
    letterKey: 'R',
    group: 'operations',
  },
  paused: {
    id: 'paused',
    indexLabel: '05',
    name: 'Paused / contamination detected',
    scene: '37',
    surface: 'WALL-01',
    importance: 'HERO',
    device: 'wall',
    status: 'READY',
    cue: 'Pause intervention · hold',
    format: 'landscape',
    shortcut: seq('1', 'T'),
    sectionKey: '1',
    letterKey: 'T',
    group: 'operations',
  },
  uploading: {
    id: 'uploading',
    indexLabel: '06',
    name: 'Uploading new script',
    scene: '51',
    surface: 'CTRL-C',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'AURORA-8 inbound',
    format: 'landscape',
    shortcut: seq('1', 'Y'),
    sectionKey: '1',
    letterKey: 'Y',
    group: 'operations',
  },
  partial: {
    id: 'partial',
    indexLabel: '07',
    name: '82% partial upload / missing ending',
    scene: '51',
    surface: 'CTRL-C',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'Ending missing · do not execute',
    format: 'landscape',
    shortcut: seq('1', 'U'),
    sectionKey: '1',
    letterKey: 'U',
    group: 'operations',
  },

  'script-cogito': {
    id: 'script-cogito',
    indexLabel: '08',
    name: 'I think, therefore I am.',
    scene: '26',
    surface: 'WALL-01',
    importance: 'HERO',
    device: 'wall',
    status: 'READY',
    cue: 'Execution line state',
    format: 'landscape',
    shortcut: seq('1', 'I'),
    sectionKey: '1',
    letterKey: 'I',
    group: 'operations',
  },
  'script-tower-cranes': {
    id: 'script-tower-cranes',
    indexLabel: '09',
    name: 'Script edit / tower cranes',
    scene: '39',
    surface: 'CTRL-C',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'Edit · play · tower cranes',
    format: 'landscape',
    shortcut: seq('1', 'O'),
    sectionKey: '1',
    letterKey: 'O',
    group: 'operations',
  },

  'heart-idle': {
    id: 'heart-idle',
    indexLabel: 'C1',
    name: 'Cardiac · Idle / sinus',
    scene: null,
    surface: 'CTRL-L1',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'Sinus · observe only',
    format: 'landscape',
    shortcut: seq('2', 'Q'),
    sectionKey: '2',
    letterKey: 'Q',
    group: 'cardiac',
  },
  'heart-elevated': {
    id: 'heart-elevated',
    indexLabel: 'C2',
    name: 'Cardiac · Elevated',
    scene: null,
    surface: 'CTRL-L1',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'Sinus tach · no intervention',
    format: 'landscape',
    shortcut: seq('2', 'W'),
    sectionKey: '2',
    letterKey: 'W',
    group: 'cardiac',
  },
  'heart-irregular': {
    id: 'heart-irregular',
    indexLabel: 'C3',
    name: 'Cardiac · Irregular',
    scene: null,
    surface: 'CTRL-L1',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'Ectopy · hold script',
    format: 'landscape',
    shortcut: seq('2', 'E'),
    sectionKey: '2',
    letterKey: 'E',
    group: 'cardiac',
  },
  'heart-intervention': {
    id: 'heart-intervention',
    indexLabel: 'C4',
    name: 'Cardiac · Intervention',
    scene: null,
    surface: 'CTRL-L1',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'Correction pulse · capture',
    format: 'landscape',
    shortcut: seq('2', 'R'),
    sectionKey: '2',
    letterKey: 'R',
    group: 'cardiac',
  },
  'heart-recovered': {
    id: 'heart-recovered',
    indexLabel: 'C5',
    name: 'Cardiac · Recovered',
    scene: null,
    surface: 'CTRL-L1',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'Sinus restored · hold observe',
    format: 'landscape',
    shortcut: seq('2', 'T'),
    sectionKey: '2',
    letterKey: 'T',
    group: 'cardiac',
  },

  'thoracic-idle': {
    id: 'thoracic-idle',
    indexLabel: 'T1',
    name: 'Thoracic · Idle / sinus',
    scene: null,
    surface: 'CTRL-L2',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'IN PROGRESS',
    cue: 'Field open · organ in view',
    format: 'landscape',
    shortcut: seq('3', 'Q'),
    sectionKey: '3',
    letterKey: 'Q',
    group: 'thoracic',
  },
  'thoracic-elevated': {
    id: 'thoracic-elevated',
    indexLabel: 'T2',
    name: 'Thoracic · Elevated',
    scene: null,
    surface: 'CTRL-L2',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'IN PROGRESS',
    cue: 'Cardiac focus high',
    format: 'landscape',
    shortcut: seq('3', 'W'),
    sectionKey: '3',
    letterKey: 'W',
    group: 'thoracic',
  },
  'thoracic-irregular': {
    id: 'thoracic-irregular',
    indexLabel: 'T3',
    name: 'Thoracic · Irregular',
    scene: null,
    surface: 'CTRL-L2',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'IN PROGRESS',
    cue: 'Mediastinum flag · hold',
    format: 'landscape',
    shortcut: seq('3', 'E'),
    sectionKey: '3',
    letterKey: 'E',
    group: 'thoracic',
  },
  'thoracic-intervention': {
    id: 'thoracic-intervention',
    indexLabel: 'T4',
    name: 'Thoracic · Intervention',
    scene: null,
    surface: 'CTRL-L2',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'IN PROGRESS',
    cue: 'Thorax cardiac lock',
    format: 'landscape',
    shortcut: seq('3', 'R'),
    sectionKey: '3',
    letterKey: 'R',
    group: 'thoracic',
  },
  'thoracic-recovered': {
    id: 'thoracic-recovered',
    indexLabel: 'T5',
    name: 'Thoracic · Recovered',
    scene: null,
    surface: 'CTRL-L2',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'IN PROGRESS',
    cue: 'Field stable · sinus restored',
    format: 'landscape',
    shortcut: seq('3', 'T'),
    sectionKey: '3',
    letterKey: 'T',
    group: 'thoracic',
  },
  'thoracic-scan': {
    id: 'thoracic-scan',
    indexLabel: 'T1',
    name: 'Thoracic · Idle / sinus',
    scene: null,
    surface: 'CTRL-L2',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'IN PROGRESS',
    cue: 'Alias → thoracic-idle',
    format: 'landscape',
    shortcut: seq('3', 'Q'),
    sectionKey: '3',
    letterKey: 'Q',
    group: 'thoracic',
    hidden: true,
  },
  'cardiac-3d-lab': {
    id: 'cardiac-3d-lab',
    indexLabel: 'CX',
    name: 'DEV · 3D Cardiac Organ',
    scene: null,
    surface: null,
    importance: null,
    device: 'monitor',
    status: 'IN PROGRESS',
    cue: 'Review only · not on keyboard',
    format: 'landscape',
    shortcut: '—',
    sectionKey: '2',
    letterKey: null,
    group: 'cardiac',
    hidden: true,
    devOnly: true,
  },

  'research-pending': {
    id: 'research-pending',
    indexLabel: 'R1',
    name: 'Research Terminal · Authorization Pending',
    scene: '18',
    surface: 'LAB-TERM-01',
    importance: 'HERO',
    device: 'laptop',
    status: 'READY',
    cue: 'Approve autonomous operation?',
    format: 'landscape',
    shortcut: seq('4', 'Q'),
    sectionKey: '4',
    letterKey: 'Q',
    group: 'research',
  },
  'research-approved': {
    id: 'research-approved',
    indexLabel: 'R2',
    name: 'Research Terminal · Autonomous Approved',
    scene: '18',
    surface: 'LAB-TERM-01',
    importance: 'HERO',
    device: 'laptop',
    status: 'READY',
    cue: 'Authorization accepted',
    format: 'landscape',
    shortcut: seq('4', 'W'),
    sectionKey: '4',
    letterKey: 'W',
    group: 'research',
  },

  'operator-console': {
    id: 'operator-console',
    indexLabel: 'OP',
    name: 'Operator Console',
    scene: null,
    surface: 'CTRL-R1',
    importance: 'FEATURE',
    device: 'monitor',
    status: 'READY',
    cue: 'Awaiting directive · Q–T execute',
    format: 'landscape',
    shortcut: '5',
    sectionKey: '5',
    letterKey: null,
    group: 'operator',
  },

  'phone-story-status': {
    id: 'phone-story-status',
    indexLabel: 'P1',
    name: 'Phone · Story Status',
    scene: '54',
    surface: 'PHONE-01',
    importance: 'FEATURE',
    device: 'phone',
    status: 'READY',
    cue: 'Story status readout',
    format: 'portrait',
    shortcut: seq('6', 'Q'),
    sectionKey: '6',
    letterKey: 'Q',
    group: 'phone',
  },
  'phone-map': {
    id: 'phone-map',
    indexLabel: 'P2',
    name: 'Phone · Map + Story Status',
    scene: '67',
    surface: 'PHONE-01',
    importance: 'FEATURE',
    device: 'phone',
    status: 'READY',
    cue: 'Map · story status',
    format: 'portrait',
    shortcut: seq('6', 'W'),
    sectionKey: '6',
    letterKey: 'W',
    group: 'phone',
  },

  'heart-monitor-elevated': {
    id: 'heart-monitor-elevated',
    indexLabel: 'E1',
    name: 'Heart monitor · elevated',
    scene: '12.K',
    surface: 'CTRL-C',
    importance: 'HERO',
    device: 'monitor',
    status: 'READY',
    cue: 'Alert rhythm · warning',
    format: 'landscape',
    shortcut: seq('7', 'Q'),
    sectionKey: '7',
    letterKey: 'Q',
    group: 'episode',
  },
  'heart-monitor-normal': {
    id: 'heart-monitor-normal',
    indexLabel: 'E2',
    name: 'Heart monitor · normal',
    scene: '12.KA',
    surface: 'CTRL-C',
    importance: 'HERO',
    device: 'monitor',
    status: 'READY',
    cue: 'Same plate · sinus',
    format: 'landscape',
    shortcut: seq('7', 'W'),
    sectionKey: '7',
    letterKey: 'W',
    group: 'episode',
  },
  'subconscious-stream': {
    id: 'subconscious-stream',
    indexLabel: 'E3',
    name: 'Subconscious stream',
    scene: '12.L',
    surface: 'CTRL-C',
    importance: 'HERO',
    device: 'monitor',
    status: 'READY',
    cue: 'Thoughts rising',
    format: 'landscape',
    shortcut: seq('7', 'E'),
    sectionKey: '7',
    letterKey: 'E',
    group: 'episode',
  },
  'hope-overwhelmed': {
    id: 'hope-overwhelmed',
    indexLabel: 'E4',
    name: 'HOPE · overwhelmed',
    scene: '14.D',
    surface: 'CTRL-C',
    importance: 'HERO',
    device: 'monitor',
    status: 'READY',
    cue: 'Queue saturated',
    format: 'landscape',
    shortcut: seq('7', 'R'),
    sectionKey: '7',
    letterKey: 'R',
    group: 'episode',
  },
  'script-highlight-edit': {
    id: 'script-highlight-edit',
    indexLabel: 'E5',
    name: 'Script highlight edit',
    scene: '14.I',
    surface: 'CTRL-C',
    importance: 'HERO',
    device: 'monitor',
    status: 'READY',
    cue: 'Highlight · delete · retype',
    format: 'landscape',
    shortcut: seq('7', 'T'),
    sectionKey: '7',
    letterKey: 'T',
    group: 'episode',
  },
  'overflow-detected-scapula': {
    id: 'overflow-detected-scapula',
    indexLabel: 'E6',
    name: 'Overflow · right scapula',
    scene: '39A.B',
    surface: 'CTRL-C',
    importance: 'HERO',
    device: 'monitor',
    status: 'READY',
    cue: 'Warning modal · then diagnostic',
    format: 'landscape',
    shortcut: seq('7', 'Y'),
    sectionKey: '7',
    letterKey: 'Y',
    group: 'episode',
  },
  'uploading-new-script': {
    id: 'uploading-new-script',
    indexLabel: 'E7',
    name: 'Uploading new script',
    scene: '39A.H',
    surface: 'CTRL-C',
    importance: 'HERO',
    device: 'monitor',
    status: 'READY',
    cue: 'SHADOW USB boot',
    format: 'landscape',
    shortcut: seq('7', 'U'),
    sectionKey: '7',
    letterKey: 'U',
    group: 'episode',
  },
  'missing-ending': {
    id: 'missing-ending',
    indexLabel: 'E8',
    name: 'Missing ending',
    scene: '39A.I',
    surface: 'CTRL-C',
    importance: 'HERO',
    device: 'monitor',
    status: 'READY',
    cue: 'Frozen at 82%',
    format: 'landscape',
    shortcut: seq('7', 'I'),
    sectionKey: '7',
    letterKey: 'I',
    group: 'episode',
  },
}

export const DIRECTORY_GROUPS: { id: ViewGroup; label: string }[] = [
  { id: 'directory', label: 'Index' },
  { id: 'operations', label: 'Operations' },
  { id: 'cardiac', label: 'Cardiac' },
  { id: 'thoracic', label: 'Thoracic' },
  { id: 'research', label: 'Research Terminal' },
  { id: 'operator', label: 'Operator' },
  { id: 'phone', label: 'Phone' },
  { id: 'episode', label: 'Episode One' },
]

export const DIRECTORY_VIEWS: ViewMeta[] = Object.values(VIEW_REGISTRY).filter((v) => !v.hidden)

export function viewsInGroup(group: ViewGroup): ViewMeta[] {
  return DIRECTORY_VIEWS.filter((v) => v.group === group)
}

/** Hidden from production lists. Shown in the review directory only. */
export function devDirectoryViews(): ViewMeta[] {
  return Object.values(VIEW_REGISTRY).filter((v) => v.devOnly)
}

export function isDirectoryScene(id: SceneId): boolean {
  return id === 'directory'
}

export function isResearchScene(id: SceneId): boolean {
  return id === 'research-pending' || id === 'research-approved'
}

export function sectionOf(id: SceneId): ViewGroup {
  return VIEW_REGISTRY[id]?.group ?? 'directory'
}

export function isLetterSection(group: ViewGroup): group is LetterSection {
  return (
    group === 'operations' ||
    group === 'cardiac' ||
    group === 'thoracic' ||
    group === 'research' ||
    group === 'phone' ||
    group === 'episode'
  )
}

export function canLaunch(meta: ViewMeta): boolean {
  return meta.status === 'READY' || meta.status === 'IN PROGRESS'
}
