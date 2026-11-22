import { Button } from "@heroui/react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

const themes = ["light", "dark", "system"] as const

const subscribe = () => () => {}

export function ThemeSwitcher() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-2">
      {themes.map((value) => (
        <Button
          key={value}
          size="sm"
          variant={mounted && theme === value ? "primary" : "secondary"}
          onPress={() => setTheme(value)}
        >
          {value[0].toUpperCase() + value.slice(1)}
        </Button>
      ))}
    </div>
  )
}
