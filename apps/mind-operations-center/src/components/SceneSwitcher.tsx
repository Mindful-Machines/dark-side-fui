import { CORE_SCENE_ORDER, HEART_SCENE_ORDER, SCENES, THORACIC_SCENE_ORDER } from '../data/scenes'
import { useScene } from '../context/SceneContext'
import type { SceneId } from '../types'

function options(ids: SceneId[]) {
  return ids.map((id, index) => (
    <option key={id} value={id}>
      {index + 1} · {SCENES[id].label}
    </option>
  ))
}

export function SceneSwitcher() {
  const { sceneId, setSceneId } = useScene()

  return (
    <div className="scene-switcher">
      <span className="dev-badge">DEV</span>
      <span className="switcher-label">Scene</span>
      <select
        value={sceneId}
        onChange={(event) => setSceneId(event.target.value as typeof sceneId)}
        aria-label="Developer scene switcher"
      >
        <optgroup label="Operations">{options(CORE_SCENE_ORDER)}</optgroup>
        <optgroup label="Cardiac">{options(HEART_SCENE_ORDER)}</optgroup>
        <optgroup label="Thoracic">{options(THORACIC_SCENE_ORDER)}</optgroup>
      </select>
    </div>
  )
}
