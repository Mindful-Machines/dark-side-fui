import type { Tone } from '../../types'

export type OperatorCommandId =
  | 'status'
  | 'exec'
  | 'pause'
  | 'load'
  | 'scan'

export interface OperatorCommand {
  id: OperatorCommandId
  label: string
  status: string
  tone: Tone
  response: string[]
  /** Soft hint for related existing scene — display only. */
  relatedScene?: string
  script?: string
  uplink?: string
}

export const OPERATOR_COMMANDS: OperatorCommand[] = [
  {
    id: 'status',
    label: 'STATUS SUBJECT-04',
    status: 'READY',
    tone: 'nominal',
    script: 'AURORA-7',
    uplink: 'STABLE',
    response: [
      'SUBJECT ............. 04',
      'STATE ............... STABLE',
      'HEART RATE .......... 68 BPM',
      'LOAD ................ 22%',
      'UPLINK .............. STABLE',
      'SCRIPT .............. AURORA-7 READY',
    ],
  },
  {
    id: 'exec',
    label: 'EXEC AURORA-7',
    status: 'EXECUTING',
    tone: 'nominal',
    script: 'AURORA-7',
    uplink: 'STABLE',
    relatedScene: 'executing',
    response: [
      'SCRIPT .............. AURORA-7',
      'SUBJECT LOCK ........ CONFIRMED',
      'CHANNELS ............ ALIGNED',
      'EXECUTION ........... STARTED',
      'STATUS .............. RUNNING',
    ],
  },
  {
    id: 'pause',
    label: 'PAUSE SUBJECT-04',
    status: 'HOLD',
    tone: 'critical',
    script: 'AURORA-7',
    uplink: 'DEGRADED',
    relatedScene: 'paused',
    response: [
      'SUBJECT LOCK ........ HELD',
      'MOTOR CHANNEL ....... HOLD',
      'SCRIPT EXECUTION .... PAUSED',
      'STATUS .............. MANUAL HOLD',
    ],
  },
  {
    id: 'load',
    label: 'LOAD AURORA-8',
    status: 'TRANSFER',
    tone: 'nominal',
    script: 'AURORA-8',
    uplink: 'BUSY',
    relatedScene: 'uploading',
    response: [
      'PAYLOAD ............. AURORA-8',
      'SOURCE .............. EXTERNAL BUFFER',
      'SIGNATURE ........... VALID',
      'TRANSFER ............ READY',
      'STATUS .............. STAGED',
    ],
  },
  {
    id: 'scan',
    label: 'SCAN CARDIAC',
    status: 'EXECUTING',
    tone: 'warning',
    script: 'AURORA-7',
    uplink: 'STABLE',
    relatedScene: 'heart-elevated',
    response: [
      'FIELD ............... CARDIAC',
      'CHANNEL ............. CH-3',
      'ACQUISITION ......... OK',
      'RATE ................ 124 BPM',
      'STATUS .............. TACHYCARDIA',
    ],
  },
]
