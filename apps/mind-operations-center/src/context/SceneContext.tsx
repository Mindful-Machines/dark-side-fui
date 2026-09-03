import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  CORE_SCENE_ORDER,
  HEART_SCENE_ORDER,
  SCENES,
  THORACIC_SCENE_ORDER,
  isHeartScene,
  isThoracicScene,
} from '../data/scenes'
import type { Scene, SceneId } from '../types'

interface SceneContextValue {
  sceneId: SceneId
  scene: Scene
  setSceneId: (id: SceneId) => void
}

const SceneContext = createContext<SceneContextValue | null>(null)

function isSceneId(value: string | null): value is SceneId {
  return value !== null && Object.hasOwn(SCENES, value)
}

function readSceneParam(): SceneId {
  const param = new URLSearchParams(window.location.search).get('scene')
  if (param === 'thoracic-scan') return 'thoracic-idle'
  return isSceneId(param) ? param : 'idle'
}

function writeSceneParam(id: SceneId) {
  const url = new URL(window.location.href)
  url.searchParams.set('scene', id)
  window.history.replaceState(null, '', url)
}

export function SceneProvider({ children }: { children: ReactNode }) {
  const [sceneId, setSceneIdState] = useState<SceneId>(readSceneParam)

  const setSceneId = useCallback((id: SceneId) => {
    setSceneIdState(id)
    writeSceneParam(id)
  }, [])

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'SELECT' || target.tagName === 'INPUT')) return
      const index = Number(event.key) - 1
      if (index < 0) return
      if (isThoracicScene(sceneId)) {
        if (index < THORACIC_SCENE_ORDER.length) setSceneId(THORACIC_SCENE_ORDER[index])
        return
      }
      if (isHeartScene(sceneId)) {
        if (index < HEART_SCENE_ORDER.length) setSceneId(HEART_SCENE_ORDER[index])
        return
      }
      if (index < CORE_SCENE_ORDER.length) setSceneId(CORE_SCENE_ORDER[index])
    },
    [sceneId, setSceneId],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  const value = useMemo(
    () => ({
      sceneId,
      scene: SCENES[sceneId],
      setSceneId,
    }),
    [sceneId, setSceneId],
  )

  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
}

export function useScene() {
  const ctx = useContext(SceneContext)
  if (!ctx) throw new Error('useScene must be used within SceneProvider')
  return ctx
}
