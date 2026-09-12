import { viewsInGroup } from '../data/registry'
import { useScene } from '../context/SceneContext'
import type { SceneId } from '../types'

function options(
  group: 'operations' | 'cardiac' | 'thoracic' | 'research' | 'operator' | 'phone',
) {
  return viewsInGroup(group)
    .filter((meta) => meta.status === 'READY' || meta.status === 'IN PROGRESS')
    .map((meta) => (
      <option key={meta.id} value={meta.id}>
        {meta.shortcut} · {meta.name}
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
        value={sceneId === 'thoracic-scan' ? 'thoracic-idle' : sceneId}
        onChange={(event) => setSceneId(event.target.value as SceneId)}
        aria-label="Developer scene switcher"
      >
        <optgroup label="Index">
          <option value="directory">0 · Scene Directory</option>
        </optgroup>
        <optgroup label="Operations">{options('operations')}</optgroup>
        <optgroup label="Cardiac">{options('cardiac')}</optgroup>
        <optgroup label="Thoracic">{options('thoracic')}</optgroup>
        <optgroup label="Research">{options('research')}</optgroup>
        <optgroup label="Operator">{options('operator')}</optgroup>
        <optgroup label="Phone">{options('phone')}</optgroup>
      </select>
    </div>
  )
}
