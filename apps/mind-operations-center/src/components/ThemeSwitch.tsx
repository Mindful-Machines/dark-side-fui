import { useScene, type ThemeId } from '../context/SceneContext'

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'phosphor', label: 'Phosphor' },
]

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useScene()

  return (
    <div
      className={`dir-mode theme-switch${compact ? ' compact' : ''}`}
      role="group"
      aria-label="Visual theme"
    >
      {THEMES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={theme === item.id ? 'is-active' : undefined}
          aria-pressed={theme === item.id}
          onClick={() => setTheme(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
