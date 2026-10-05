import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SCENES } from '../data/scenes'
import {
  LETTER_MAP,
  SECTION_BY_DIGIT,
  SECTION_DEFAULT,
  SECTION_NAV_ORDER,
  canLaunch,
  isDirectoryScene,
  isLetterSection,
  sectionOf,
  VIEW_REGISTRY,
  type AppMode,
  type ViewGroup,
} from '../data/registry'
import type { Scene, SceneId } from '../types'

type HistoryMode = 'push' | 'replace'

/** App motion policy. `auto` follows OS prefers-reduced-motion. */
export type MotionMode = 'auto' | 'full' | 'reduce'

interface SceneContextValue {
  sceneId: SceneId
  scene: Scene
  mode: AppMode
  motion: MotionMode
  /** Active nav section — inferred from the current scene (including direct URLs). */
  section: ViewGroup
  setSceneId: (id: SceneId) => void
  setMode: (mode: AppMode) => void
  setMotion: (motion: MotionMode) => void
  toggleMode: () => void
  goTo: (id: SceneId, mode?: AppMode, history?: HistoryMode) => void
}

const SceneContext = createContext<SceneContextValue | null>(null)

function isSceneId(value: string | null): value is SceneId {
  return value !== null && Object.hasOwn(SCENES, value)
}

function isAppMode(value: string | null): value is AppMode {
  return value === 'review' || value === 'display'
}

function readSceneParam(): SceneId {
  const param = new URLSearchParams(window.location.search).get('scene')
  if (param === null || param === '') return 'directory'
  if (param === 'thoracic-scan') return 'thoracic-idle'
  // Legacy planned-slug aliases from earlier local work.
  if (param === 'cogito') return 'script-cogito'
  if (param === 'tower-cranes') return 'script-tower-cranes'
  if (param === 'phone-status') return 'phone-story-status'
  return isSceneId(param) ? param : 'directory'
}

function readModeParam(): AppMode {
  const param = new URLSearchParams(window.location.search).get('mode')
  return isAppMode(param) ? param : 'review'
}

function isMotionMode(value: string | null): value is MotionMode {
  return value === 'auto' || value === 'full' || value === 'reduce'
}

function readMotionParam(): MotionMode {
  const param = new URLSearchParams(window.location.search).get('motion')
  if (param === null || param === '') return 'auto'
  return isMotionMode(param) ? param : 'auto'
}

function buildAppUrl(id: SceneId, mode: AppMode, motion: MotionMode) {
  const url = new URL(window.location.href)
  url.searchParams.set('scene', id)
  url.searchParams.set('mode', mode)
  if (motion === 'auto') {
    url.searchParams.delete('motion')
  } else {
    url.searchParams.set('motion', motion)
  }
  return url
}

function urlKey(url: URL) {
  return `${url.pathname}?${url.searchParams.toString()}`
}

function writeUrlParams(id: SceneId, mode: AppMode, motion: MotionMode, history: HistoryMode) {
  const url = buildAppUrl(id, mode, motion)
  const next = urlKey(url)
  const current = urlKey(new URL(window.location.href))
  if (next === current) return

  if (history === 'push') {
    window.history.pushState(null, '', url)
  } else {
    window.history.replaceState(null, '', url)
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function SceneProvider({ children }: { children: ReactNode }) {
  const [sceneId, setSceneIdState] = useState<SceneId>(readSceneParam)
  const [mode, setModeState] = useState<AppMode>(readModeParam)
  const [motion, setMotionState] = useState<MotionMode>(readMotionParam)
  const section = sectionOf(sceneId)
  const sceneIdRef = useRef(sceneId)
  const modeRef = useRef(mode)
  const motionRef = useRef(motion)
  sceneIdRef.current = sceneId
  modeRef.current = mode
  motionRef.current = motion

  const commit = useCallback(
    (id: SceneId, nextMode: AppMode, nextMotion: MotionMode, history: HistoryMode) => {
      sceneIdRef.current = id
      modeRef.current = nextMode
      motionRef.current = nextMotion
      setSceneIdState(id)
      setModeState(nextMode)
      setMotionState(nextMotion)
      writeUrlParams(id, nextMode, nextMotion, history)
    },
    [],
  )

  const goTo = useCallback(
    (id: SceneId, nextMode?: AppMode, history: HistoryMode = 'replace') => {
      commit(id, nextMode ?? modeRef.current, motionRef.current, history)
    },
    [commit],
  )

  const setSceneId = useCallback(
    (id: SceneId) => {
      goTo(id)
    },
    [goTo],
  )

  const setMode = useCallback(
    (next: AppMode) => {
      commit(sceneIdRef.current, next, motionRef.current, 'replace')
    },
    [commit],
  )

  const setMotion = useCallback(
    (next: MotionMode) => {
      commit(sceneIdRef.current, modeRef.current, next, 'replace')
    },
    [commit],
  )

  const toggleMode = useCallback(() => {
    const next = modeRef.current === 'review' ? 'display' : 'review'
    commit(sceneIdRef.current, next, motionRef.current, 'replace')
  }, [commit])

  useEffect(() => {
    writeUrlParams(sceneId, mode, motion, 'replace')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount sync only
  }, [])

  useEffect(() => {
    const onPopState = () => {
      setSceneIdState(readSceneParam())
      setModeState(readModeParam())
      setMotionState(readMotionParam())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const stepWithinSection = useCallback(
    (delta: number) => {
      const order = SECTION_NAV_ORDER[section]
      if (order.length === 0) return
      const current = order.indexOf(sceneId === 'thoracic-scan' ? 'thoracic-idle' : sceneId)
      const from = current < 0 ? 0 : current
      const next = order[(from + delta + order.length) % order.length]
      goTo(next, undefined, 'replace')
    },
    [section, sceneId, goTo],
  )

  const openSection = useCallback(
    (group: ViewGroup, history: HistoryMode) => {
      if (group === 'directory') {
        goTo('directory', 'review', history)
        return
      }
      const id = SECTION_DEFAULT[group]
      if (canLaunch(VIEW_REGISTRY[id])) goTo(id, undefined, history)
    },
    [goTo],
  )

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        stepWithinSection(-1)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        stepWithinSection(1)
        return
      }

      // Section digits 0–6 (global).
      if (event.key >= '0' && event.key <= '6') {
        const group = SECTION_BY_DIGIT[event.key]
        if (!group) return
        event.preventDefault()
        const history: HistoryMode =
          isDirectoryScene(sceneId) || sectionOf(sceneId) !== group ? 'push' : 'replace'
        openSection(group, history)
        return
      }

      // Letter keys — only inside the active letter section; inert on directory.
      if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
        if (!isLetterSection(section)) return
        const id = LETTER_MAP[section][event.key.toLowerCase()]
        if (!id) return
        event.preventDefault()
        goTo(id, undefined, 'replace')
      }
    },
    [sceneId, section, goTo, openSection, stepWithinSection],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  const value = useMemo(
    () => ({
      sceneId,
      scene: SCENES[sceneId],
      mode,
      motion,
      section,
      setSceneId,
      setMode,
      setMotion,
      toggleMode,
      goTo,
    }),
    [sceneId, mode, motion, section, setSceneId, setMode, setMotion, toggleMode, goTo],
  )

  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
}

export function useScene() {
  const ctx = useContext(SceneContext)
  if (!ctx) throw new Error('useScene must be used within SceneProvider')
  return ctx
}
