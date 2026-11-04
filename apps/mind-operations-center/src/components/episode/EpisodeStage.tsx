import { useScene } from '../../context/SceneContext'
import { HeartMonitorPlate } from './HeartMonitorPlate'
import { OverflowDiagnostic } from './OverflowDiagnostic'
import { ScriptHighlightEdit } from './ScriptHighlightEdit'
import { SubconsciousStream } from './SubconsciousStream'
import { UploadTakeover } from './UploadTakeover'
import './episode.css'

export function EpisodeStage() {
  const { scene } = useScene()

  switch (scene.id) {
    case 'heart-monitor-elevated':
      return <HeartMonitorPlate variant="elevated" />
    case 'heart-monitor-normal':
      return <HeartMonitorPlate variant="normal" />
    case 'subconscious-stream':
      return <SubconsciousStream />
    case 'hope-overwhelmed':
      return <SubconsciousStream overwhelmed />
    case 'script-highlight-edit':
      return <ScriptHighlightEdit />
    case 'overflow-detected-scapula':
      return <OverflowDiagnostic />
    case 'uploading-new-script':
      return <UploadTakeover />
    case 'missing-ending':
      return <UploadTakeover stalled />
    default:
      return null
  }
}
