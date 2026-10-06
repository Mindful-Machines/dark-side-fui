import { AnatomyViewport } from '../AnatomyViewport'
import { ECGStrip } from '../ECGStrip'
import { SceneControls } from '../SceneControls'
import { StatusBadge } from '../StatusBadge'
import { VitalReadout } from '../VitalReadout'
import { ThoracicScan } from '../thoracic/ThoracicScan'
import { isThoracicStateId, THORACIC_PROFILES } from '../thoracic/profile'
import { HeartVisual } from './HeartVisual'
import { HEART_PROFILES, isHeartStateId } from './states'
import { CardiacTomographyLab } from '../lab/CardiacTomographyLab'
import { CARDIAC_LAB_PROFILE } from '../lab/profile'
import { useScene } from '../../../context/SceneContext'
import { isCardiacLabScene } from '../../../data/scenes'
import '../organ-monitor.css'

export function HeartMonitorScene() {
  const { scene } = useScene()
  let thoracic = false
  const lab = isCardiacLabScene(scene.id)
  let profile
  if (isThoracicStateId(scene.id)) {
    thoracic = true
    profile = THORACIC_PROFILES[scene.id]
  } else if (isHeartStateId(scene.id)) {
    profile = HEART_PROFILES[scene.id]
  } else if (lab) {
    profile = CARDIAC_LAB_PROFILE
  } else {
    return null
  }
  const beatMs = Math.round(60_000 / Math.max(scene.heartRate, 1))

  return (
    <div className="heart-monitor" data-cardiac={profile.key} data-view={thoracic ? 'thoracic' : 'organ'}>
      <header className="heart-monitor-head">
        {thoracic ? (
          <span className="wip-badge">WIP PREVIEW</span>
        ) : (
          <StatusBadge label={profile.badge} tone={profile.tone} />
        )}
        <SceneControls />
      </header>

      <div className="heart-monitor-body">
        <AnatomyViewport state={profile.key} beatMs={beatMs} caption={profile.caption}>
          {thoracic ? (
            <ThoracicScan bpm={scene.heartRate} metrics={scene.metrics} />
          ) : lab ? (
            <CardiacTomographyLab />
          ) : (
            <HeartVisual />
          )}
        </AnatomyViewport>
        {thoracic ? null : <VitalReadout bpm={scene.heartRate} metrics={scene.metrics} />}
      </div>

      <ECGStrip
        bpm={scene.heartRate}
        noise={scene.waveformNoise}
        tone={profile.tone}
        irregular={profile.irregular}
      />
    </div>
  )
}
