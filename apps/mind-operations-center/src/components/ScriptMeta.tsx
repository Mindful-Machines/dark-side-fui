import { Panel } from './Panel'
import { useScene } from '../context/SceneContext'

export function ScriptMeta() {
  const { scene } = useScene()

  return (
    <Panel title="Active payload" meta={scene.scriptStatus} tone={scene.tone === 'nominal' ? undefined : scene.tone}>
      <dl className="meta-list">
        <div>
          <dt>Script</dt>
          <dd>{scene.scriptName}</dd>
        </div>
        <div>
          <dt>Hash</dt>
          <dd>{scene.scriptHash}</dd>
        </div>
        <div>
          <dt>Uplink</dt>
          <dd>{scene.uplink}</dd>
        </div>
        <div>
          <dt>Operator</dt>
          <dd>K. VOSS</dd>
        </div>
      </dl>
    </Panel>
  )
}
