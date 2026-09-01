import { Panel } from './Panel'
import { useScene } from '../context/SceneContext'

const STATE_LABEL: Record<string, string> = {
  ok: 'OK',
  warn: 'WARN',
  crit: 'CRIT',
  idle: 'IDLE',
  active: 'LIVE',
}

export function ChannelGrid() {
  const { scene } = useScene()

  return (
    <Panel title="Channels" meta="8-band">
      <ul className="channel-grid">
        {scene.channels.map((channel) => (
          <li key={channel.id} className={`channel state-${channel.state}`}>
            <span className="pip" />
            <span className="ch-id">{channel.id}</span>
            <span className="ch-label">{channel.label}</span>
            <span className="ch-state">{STATE_LABEL[channel.state]}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
