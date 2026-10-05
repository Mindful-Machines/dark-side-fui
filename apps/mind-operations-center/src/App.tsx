import { SceneProvider, useScene } from './context/SceneContext'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { VitalsPanel } from './components/VitalsPanel'
import { ChannelGrid } from './components/ChannelGrid'
import { MainStage } from './components/MainStage'
import { SignalLog } from './components/SignalLog'
import { ScriptMeta } from './components/ScriptMeta'
import { SceneDirectory } from './components/SceneDirectory'
import { PhoneStage } from './components/phone/PhoneStage'
import { isDirectoryScene } from './data/registry'
import { isPhoneScene } from './data/scenes'

function Shell() {
  const { scene, mode, motion } = useScene()
  const directory = isDirectoryScene(scene.id)
  const phone = isPhoneScene(scene.id)

  return (
    <div
      className={`app${phone ? ' is-phone' : ''}`}
      data-scene={scene.id}
      data-tone={scene.tone}
      data-mode={mode}
      data-motion={motion}
    >
      {phone && mode === 'display' ? null : <Header />}
      {directory ? (
        <main className="app-body is-directory">
          <SceneDirectory />
        </main>
      ) : phone ? (
        <main className="app-body is-phone">
          <PhoneStage />
        </main>
      ) : (
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
      )}
      {phone && mode === 'display' ? null : <Footer />}
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
