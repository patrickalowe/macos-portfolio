import type { AppWindow } from "@/types"

export interface AppMeta {
  id: string
  title: string
  icon: string
  /** key into the window componentMap */
  component: string
  defaultSize: { width: number; height: number }
  minSize?: { width: number; height: number }
  /** appears in the Dock */
  inDock: boolean
  /** ordering within the Dock (lower = left) */
  dockOrder?: number
  /** appears in Launchpad / Spotlight */
  inLaunchpad: boolean
  /** extra search terms for Spotlight */
  keywords?: string[]
}

/**
 * Single source of truth for every launchable app. Dock, Spotlight, Launchpad,
 * the Menubar app menu and the Terminal all read from here.
 */
export const APPS: AppMeta[] = [
  {
    id: "safari", title: "Safari", icon: "/safari.png", component: "Safari",
    defaultSize: { width: 980, height: 680 }, inDock: true, dockOrder: 1, inLaunchpad: true,
    keywords: ["browser", "web", "internet"],
  },
  {
    id: "mail", title: "Mail", icon: "/mail.png", component: "Mail",
    defaultSize: { width: 940, height: 640 }, inDock: true, dockOrder: 2, inLaunchpad: true,
    keywords: ["email", "inbox", "message", "contact"],
  },
  {
    id: "notes", title: "Notes", icon: "/notes.png", component: "Notes",
    defaultSize: { width: 860, height: 600 }, inDock: true, dockOrder: 3, inLaunchpad: true,
    keywords: ["note", "memo", "resume", "about", "bio"],
  },
  {
    id: "vscode", title: "VS Code", icon: "/vscode.png", component: "VSCode",
    defaultSize: { width: 1040, height: 700 }, inDock: true, dockOrder: 4, inLaunchpad: true,
    keywords: ["code", "editor", "vscode", "ide", "source", "files"],
  },
  {
    id: "terminal", title: "Terminal", icon: "/terminal.png", component: "Terminal",
    defaultSize: { width: 740, height: 480 }, minSize: { width: 420, height: 280 },
    inDock: true, dockOrder: 5, inLaunchpad: true,
    keywords: ["shell", "console", "bash", "cli", "command"],
  },
  {
    id: "github", title: "GitHub", icon: "/github.png", component: "GitHub",
    defaultSize: { width: 960, height: 680 }, inDock: true, dockOrder: 6, inLaunchpad: true,
    keywords: ["git", "repos", "code", "projects", "stars", "contributions"],
  },
  {
    id: "weather", title: "Weather", icon: "/weather.png", component: "Weather",
    defaultSize: { width: 900, height: 640 }, inDock: true, dockOrder: 7, inLaunchpad: true,
    keywords: ["forecast", "temperature", "rain", "climate"],
  },
  {
    id: "spotify", title: "Spotify", icon: "/spotify.png", component: "Spotify",
    defaultSize: { width: 920, height: 640 }, inDock: true, dockOrder: 8, inLaunchpad: true,
    keywords: ["music", "songs", "player", "audio", "playlist"],
  },
  {
    id: "facetime", title: "FaceTime", icon: "/facetime.png", component: "FaceTime",
    defaultSize: { width: 760, height: 560 }, inDock: false, inLaunchpad: true,
    keywords: ["video", "call", "camera"],
  },
  {
    id: "music", title: "Music", icon: "/spotify.png", component: "Music",
    defaultSize: { width: 900, height: 620 }, inDock: false, inLaunchpad: true,
    keywords: ["songs", "audio", "player"],
  },
  {
    id: "snake", title: "Snake", icon: "/snake.png", component: "Snake",
    defaultSize: { width: 560, height: 640 }, minSize: { width: 420, height: 520 },
    inDock: false, inLaunchpad: true, keywords: ["game", "play", "arcade"],
  },
  {
    id: "settings", title: "System Settings", icon: "/control-center-icon.webp", component: "Settings",
    defaultSize: { width: 900, height: 640 }, inDock: false, inLaunchpad: true,
    keywords: ["preferences", "settings", "system", "appearance", "about", "control"],
  },
]

const APP_BY_ID = new Map(APPS.map((a) => [a.id, a]))

export function getApp(id: string): AppMeta | undefined {
  return APP_BY_ID.get(id)
}

export const DOCK_APPS = APPS.filter((a) => a.inDock).sort(
  (a, b) => (a.dockOrder ?? 99) - (b.dockOrder ?? 99),
)

export const LAUNCHPAD_APPS = APPS.filter((a) => a.inLaunchpad)

/**
 * Build the AppWindow descriptor used by the desktop window manager.
 * Position is supplied by the desktop (deterministic cascade), not random.
 */
export function makeWindow(id: string, position: { x: number; y: number }): AppWindow | null {
  const app = getApp(id)
  if (!app) return null
  return {
    id: app.id,
    title: app.title,
    component: app.component,
    position,
    size: { ...app.defaultSize },
  }
}
