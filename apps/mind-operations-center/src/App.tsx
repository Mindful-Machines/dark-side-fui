import { SceneProvider, useScene } from './context/SceneContext'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { VitalsPanel } from './components/VitalsPanel'
import { ChannelGrid } from './components/ChannelGrid'
import { MainStage } from './components/MainStage'
import { SignalLog } from './components/SignalLog'
import { ScriptMeta } from './components/ScriptMeta'

function Shell() {
  const { scene } = useScene()

  return (
    <div className="app" data-scene={scene.id} data-tone={scene.tone}>
      <Header />
      <main className="app-body">
        <aside className="col col-left">
          <VitalsPanel />
          <ChannelGrid />
        </aside>
        <MainStage />
        <aside className="col col-right">
          <SignalLog key={scene.id} />
          <ScriptMeta />
        </aside>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <SceneProvider>
      <Shell />
    </SceneProvider>
  )
}
