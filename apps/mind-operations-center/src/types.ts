export type SceneId =
  | 'idle'
  | 'elevated'
  | 'thoughts'
  | 'executing'
  | 'paused'
  | 'uploading'
  | 'partial'
  | 'heart-idle'
  | 'heart-elevated'
  | 'heart-irregular'
  | 'heart-intervention'
  | 'heart-recovered'
  | 'thoracic-idle'
  | 'thoracic-elevated'
  | 'thoracic-irregular'
  | 'thoracic-intervention'
  | 'thoracic-recovered'
  | 'thoracic-scan'

export type Tone = 'nominal' | 'warning' | 'critical'

export type ChannelState = 'ok' | 'warn' | 'crit' | 'idle' | 'active'

export interface ScriptLine {
  n: number
  code: string
  state: 'ok' | 'current' | 'corrupt' | 'missing'
}

export interface Channel {
  id: string
  label: string
  state: ChannelState
}

export interface Metric {
  label: string
  value: string
  hint?: string
  tone?: Tone
}

export interface Scene {
  id: SceneId
  label: string
  shortLabel: string
  status: string
  tone: Tone
  heartRate: number
  neuralLoad: number
  coherence: number
  latencyMs: number
  uplink: string
  scriptName: string
  scriptStatus: string
  scriptHash: string
  uploadProgress: number | null
  executingLine: number | null
  contaminationLine: number | null
  thoughts: string[]
  scriptLines: ScriptLine[]
  logPool: string[]
  initialLog: string[]
  channels: Channel[]
  metrics: Metric[]
  waveformNoise: number
  waveformPaused: boolean
}
