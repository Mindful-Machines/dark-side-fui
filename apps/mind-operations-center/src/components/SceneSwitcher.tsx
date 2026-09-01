import { SCENE_ORDER, SCENES } from '../data/scenes'
import { useScene } from '../context/SceneContext'

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
        {SCENE_ORDER.map((id, index) => (
          <option key={id} value={id}>
            {index + 1} · {SCENES[id].label}
          </option>
        ))}
      </select>
    </div>
  )
}
