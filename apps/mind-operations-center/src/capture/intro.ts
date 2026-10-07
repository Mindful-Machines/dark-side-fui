import { OPERATOR_COMMANDS } from '../components/operator-console/commands'
import type { SceneId } from '../types'

export const INTRO_HOLD_MS = 2000
export const THOUGHT_CHAR_MS = 32
export const THOUGHT_GAP_MS = 1500
export const COGITO_HERO = 'I think, therefore I am.'
export const COGITO_TYPE_MS = 2500
export const COGITO_CONFIRM_MS = 1500
export const COGITO_CHAR_MS = COGITO_TYPE_MS / COGITO_HERO.length
export const TOWER_HERO = 'This whole idea reminds me of tower cranes'
export const TOWER_SELECT_MS = 1400
export const TOWER_DELETE_MS = 1400
export const TOWER_INSERT_MS = 1800
export const TOWER_READY_MS = 1400
export const TOWER_CHAR_MS = TOWER_INSERT_MS / TOWER_HERO.length
export const RESEARCH_PENDING_MS = 2400
export const RESEARCH_FLASH_MS = 900
export const RESEARCH_SETTLE_MS = 700
export const OPERATOR_BOOT_MS = 800
export const OPERATOR_TYPE_MS = 2000
export const OPERATOR_LINES_MS = 3200
export const OPERATOR_LABEL = 'STATUS SUBJECT-04'
export const OPERATOR_LINE_COUNT = 6
export const OPERATOR_CHAR_MS = OPERATOR_TYPE_MS / OPERATOR_LABEL.length
export const OPERATOR_LINE_MS = OPERATOR_LINES_MS / OPERATOR_LINE_COUNT
export const OPERATOR_COMMAND_IDLE_MS = 800
export const OPERATOR_COMMAND_SELECT_MS = 400
export const OPERATOR_COMMAND_DESTINATIONS: SceneId[] = [
  'operator-console',
  'executing',
  'paused',
  'uploading',
  'cardiac-3d-lab',
]
export const UPLOAD_END = 0.82
export const UPLOAD_RAMP_MS = 7500
export const UPLOAD_STALL_MS = 8000
export const INTRO_DURATION_MS: Record<string, number> = {
  'script-cogito': COGITO_TYPE_MS + COGITO_CONFIRM_MS + INTRO_HOLD_MS,
  'script-tower-cranes': TOWER_SELECT_MS + TOWER_DELETE_MS + TOWER_INSERT_MS + TOWER_READY_MS + INTRO_HOLD_MS,
  'research-approved': RESEARCH_PENDING_MS + RESEARCH_FLASH_MS + RESEARCH_SETTLE_MS + INTRO_HOLD_MS,
  'operator-console': OPERATOR_BOOT_MS + OPERATOR_TYPE_MS + OPERATOR_LINES_MS + INTRO_HOLD_MS,
  uploading: UPLOAD_STALL_MS + INTRO_HOLD_MS,
}

export type ThoughtCursor = { shown: number; typed: number }
export type EditPhase = 'select' | 'delete' | 'insert' | 'ready'

export function thoughtsAt(thoughts: string[], tMs: number): ThoughtCursor {
  let t = 0
  for (let i = 0; i < thoughts.length; i++) {
    const typeMs = thoughts[i].length * THOUGHT_CHAR_MS
    if (tMs < t + typeMs) {
      return { shown: i, typed: Math.max(0, Math.floor((tMs - t) / THOUGHT_CHAR_MS)) }
    }
    t += typeMs
    if (i < thoughts.length - 1) {
      if (tMs < t + THOUGHT_GAP_MS) return { shown: i, typed: thoughts[i].length }
      t += THOUGHT_GAP_MS
    }
  }
  const last = thoughts[thoughts.length - 1] ?? ''
  return { shown: Math.max(0, thoughts.length - 1), typed: last.length }
}

export function thoughtsRevealMs(thoughts: string[]) {
  if (thoughts.length === 0) return 0
  const type = thoughts.reduce((n, s) => n + s.length * THOUGHT_CHAR_MS, 0)
  const gaps = Math.max(0, thoughts.length - 1) * THOUGHT_GAP_MS
  return type + gaps
}

export function cogitoHeroCount(tMs: number) {
  return Math.min(COGITO_HERO.length, Math.floor(tMs / COGITO_CHAR_MS))
}

export function cogitoConfirmed(tMs: number) {
  return tMs >= COGITO_TYPE_MS
}

export function cogitoPulsing(tMs: number) {
  return tMs >= COGITO_TYPE_MS && tMs < COGITO_TYPE_MS + COGITO_CONFIRM_MS
}

export function towerPhaseAt(tMs: number): EditPhase {
  if (tMs < TOWER_SELECT_MS) return 'select'
  if (tMs < TOWER_SELECT_MS + TOWER_DELETE_MS) return 'delete'
  if (tMs < TOWER_SELECT_MS + TOWER_DELETE_MS + TOWER_INSERT_MS) return 'insert'
  return 'ready'
}

export function towerHeroAt(tMs: number) {
  const phase = towerPhaseAt(tMs)
  if (phase === 'select') return { text: COGITO_HERO, cleared: false }
  if (phase === 'delete') return { text: COGITO_HERO, cleared: true }
  const insertT = Math.max(0, tMs - TOWER_SELECT_MS - TOWER_DELETE_MS)
  const n = phase === 'insert' ? Math.min(TOWER_HERO.length, Math.floor(insertT / TOWER_CHAR_MS)) : TOWER_HERO.length
  return { text: TOWER_HERO.slice(0, n), cleared: false }
}

export function uploadProgressAt(tMs: number) {
  if (tMs >= UPLOAD_RAMP_MS) return UPLOAD_END
  return (tMs / UPLOAD_RAMP_MS) * UPLOAD_END
}

export function operatorBooting(tMs: number) {
  return tMs < OPERATOR_BOOT_MS
}

export type OperatorQuickCommand = {
  key: string
  index: number
  label: string
  lineCount: number
  destination: SceneId
}

export function operatorQuickCommand(key: string): OperatorQuickCommand | null {
  const index = 'qwert'.indexOf(key.toLowerCase())
  if (index < 0) return null
  const command = OPERATOR_COMMANDS[index]
  return {
    key: 'qwert'[index],
    index,
    label: command.label,
    lineCount: command.response.length,
    destination: OPERATOR_COMMAND_DESTINATIONS[index],
  }
}

export function operatorCommandExecuteMs() {
  return OPERATOR_COMMAND_IDLE_MS + OPERATOR_COMMAND_SELECT_MS
}

export function operatorCommandRevealEndMs(quick: OperatorQuickCommand) {
  return (
    operatorCommandExecuteMs() +
    quick.label.length * OPERATOR_CHAR_MS +
    quick.lineCount * OPERATOR_LINE_MS
  )
}

export function operatorCommandDurationMs(quick: OperatorQuickCommand) {
  return operatorCommandRevealEndMs(quick) + INTRO_HOLD_MS
}

export function introSceneAt(captureScene: string, tMs: number, command = ''): SceneId | null {
  const quick = operatorQuickCommand(command)
  if (quick) {
    if (tMs >= operatorCommandRevealEndMs(quick) && quick.destination !== 'operator-console') {
      return quick.destination
    }
    return null
  }
  if (captureScene === 'research-approved') {
    return tMs < RESEARCH_PENDING_MS ? 'research-pending' : 'research-approved'
  }
  if (captureScene === 'uploading') {
    return tMs < UPLOAD_STALL_MS ? 'uploading' : 'partial'
  }
  return null
}

export function introCssMs(captureScene: string, tMs: number, command = '') {
  if (operatorQuickCommand(command)) return 0
  if (captureScene === 'research-approved') {
    if (tMs < RESEARCH_PENDING_MS) return tMs
    if (tMs < RESEARCH_PENDING_MS + RESEARCH_FLASH_MS) return tMs - RESEARCH_PENDING_MS
    return 0
  }
  if (captureScene === 'script-cogito' && cogitoPulsing(tMs)) return tMs - COGITO_TYPE_MS
  return 0
}

export function introVideoMs(_captureScene: string, tMs: number, command = '') {
  const quick = operatorQuickCommand(command)
  if (quick && tMs >= operatorCommandRevealEndMs(quick) && quick.destination !== 'operator-console') {
    return 0
  }
  return tMs
}

export function introDurationMs(sceneId: string, thoughts: string[] = []) {
  if (sceneId === 'thoughts') return thoughtsRevealMs(thoughts) + INTRO_HOLD_MS
  return INTRO_DURATION_MS[sceneId] ?? INTRO_HOLD_MS
}

export function introRevealMs(sceneId: string, thoughts: string[] = []) {
  return introDurationMs(sceneId, thoughts) - INTRO_HOLD_MS
}

export function introHoldMatchScene(sceneId: string) {
  if (sceneId === 'uploading') return 'partial'
  if (sceneId === 'operator-console') return 'operator-console-status'
  return sceneId
}
