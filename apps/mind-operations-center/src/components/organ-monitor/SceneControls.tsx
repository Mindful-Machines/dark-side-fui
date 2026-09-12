import { HEART_SCENE_ORDER, THORACIC_SCENE_ORDER, isThoracicScene } from '../../data/scenes'
import { HEART_PROFILES, type HeartStateId } from './heart/states'
import { THORACIC_PROFILES, type ThoracicStateId } from './thoracic/profile'
import { useScene } from '../../context/SceneContext'

export function SceneControls() {
  const { sceneId, setSceneId } = useScene()
  const thoracic = isThoracicScene(sceneId)
  const order = thoracic ? THORACIC_SCENE_ORDER : HEART_SCENE_ORDER
  const letters = ['Q', 'W', 'E', 'R', 'T'] as const

  return (
    <div className="om-controls" role="tablist" aria-label="Organ monitor states">
      {order.map((id, index) => {
        const active = sceneId === id || (id === 'thoracic-idle' && sceneId === 'thoracic-scan')
        const label = thoracic
          ? THORACIC_PROFILES[id as ThoracicStateId].label
          : HEART_PROFILES[id as HeartStateId].label
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? 'is-active' : undefined}
            onClick={() => setSceneId(id)}
          >
            {letters[index]} {label}
          </button>
        )
      })}
    </div>
  )
}
