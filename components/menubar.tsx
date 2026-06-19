"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Search, Wifi, WifiOff } from "lucide-react"
import { AppleIcon } from "@/components/icons"
import { useSystem } from "@/components/system-provider"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"

interface MenubarProps {
  activeApp: { id: string; title: string } | null
  controlCenterOpen: boolean
  onToggleSpotlight: () => void
  onToggleControlCenter: () => void
  onOpenApp: (id: string) => void
  onLogout: () => void
  onSleep: () => void
  onShutdown: () => void
  onRestart: () => void
}

const noop = () => {}

const menuTitleClass =
  "flex h-[18px] items-center rounded-[5px] px-2 text-[13px] leading-none outline-none transition-colors data-[state=open]:bg-white/20 hover:bg-white/15 lg-focus"

const menuContentClass =
  "glass-thick rounded-menu min-w-[15rem] border-0 p-1 text-[13px] shadow-glass-lg"

const menuItemClass =
  "lg-vibrant rounded-[6px] px-2.5 py-1 text-[13px] focus:glass-tint-accent focus:text-white data-[disabled]:opacity-40"

/* ---- right-side battery glyph ---- */
function BatteryGlyph({ level, charging }: { level: number; charging: boolean }) {
  const fillWidth = Math.max(2, Math.round((level / 100) * 18))
  const low = level <= 20 && !charging
  return (
    <svg width="26" height="13" viewBox="0 0 26 13" fill="none" aria-hidden="true">
      <rect
        x="0.75"
        y="0.75"
        width="21.5"
        height="11.5"
        rx="3"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      <rect
        x="2"
        y="2"
        width={fillWidth}
        height="9"
        rx="1.6"
        fill={low ? "#ff453a" : "currentColor"}
      />
      <path
        d="M24 4.2c1.1.35 1.1 4.25 0 4.6V4.2Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
      {charging && (
        <path
          d="M12.4 2.2 7.6 7.1h3.1l-1.1 3.7 4.8-4.9h-3.1l1.1-3.7Z"
          fill="#ffffff"
          stroke="#000000"
          strokeOpacity="0.15"
          strokeWidth="0.4"
        />
      )}
    </svg>
  )
}

export default function Menubar({
  activeApp,
  controlCenterOpen,
  onToggleSpotlight,
  onToggleControlCenter,
  onOpenApp,
  onLogout,
  onSleep,
  onShutdown,
  onRestart,
}: MenubarProps) {
  const { wifiEnabled, toggleWifi } = useSystem()

  const [now, setNow] = useState<Date>(() => new Date())
  const [batteryLevel, setBatteryLevel] = useState(100)
  const [isCharging, setIsCharging] = useState(false)
  const [wifiOpen, setWifiOpen] = useState(false)

  const appName = activeApp?.title ?? "Finder"

  /* clock */
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  /* battery */
  useEffect(() => {
    let battery: any = null
    const update = (b: any) => {
      setBatteryLevel(Math.round(b.level * 100))
      setIsCharging(b.charging)
    }
    const nav = navigator as any
    if (typeof nav.getBattery === "function") {
      nav
        .getBattery()
        .then((b: any) => {
          battery = b
          update(b)
          b.addEventListener("levelchange", () => update(b))
          b.addEventListener("chargingchange", () => update(b))
        })
        .catch(() => {
          setBatteryLevel(100)
          setIsCharging(false)
        })
    }
    return () => {
      if (battery) {
        battery.removeEventListener?.("levelchange", () => undefined)
        battery.removeEventListener?.("chargingchange", () => undefined)
      }
    }
  }, [])

  /* close wifi popover on Escape */
  useEffect(() => {
    if (!wifiOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWifiOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [wifiOpen])

  const formattedTime = now.toLocaleString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const openSettings = useCallback(() => onOpenApp("settings"), [onOpenApp])

  const statusBtn =
    "flex h-[20px] items-center justify-center rounded-[6px] px-1.5 outline-none transition-colors hover:bg-white/15 lg-focus"

  return (
    <header
      className="lg-text-scrim fixed inset-x-0 top-0 z-50 flex h-[26px] select-none items-center justify-between px-2 text-[13px] font-medium"
      role="banner"
    >
      {/* ============ LEFT ============ */}
      <nav className="flex items-center gap-0.5" aria-label="Application menus">
        {/* Apple menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Apple menu"
            className={cn(menuTitleClass, "px-2")}
          >
            <AppleIcon className="h-[15px] w-[15px]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className={menuContentClass}>
            <DropdownMenuItem className={menuItemClass} onSelect={openSettings}>
              About This Mac
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={openSettings}>
              System Settings…
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={onSleep}>
              Sleep
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={onRestart}>
              Restart…
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={onShutdown}>
              Shut Down…
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={onLogout}>
              Lock Screen
              <DropdownMenuShortcut>⌃⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={onLogout}>
              Log Out apple-techie…
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Active app name (bold) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${appName} menu`}
            className={cn(menuTitleClass, "font-bold")}
          >
            {appName}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className={menuContentClass}>
            <DropdownMenuItem className={menuItemClass} onSelect={openSettings}>
              About {appName}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={openSettings}>
              Settings…
              <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Hide {appName}
              <DropdownMenuShortcut>⌘H</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Hide Others
              <DropdownMenuShortcut>⌥⌘H</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* File */}
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="File menu" className={menuTitleClass}>
            File
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className={menuContentClass}>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              New Window
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              New Folder
              <DropdownMenuShortcut>⇧⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Open…
              <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Close Window
              <DropdownMenuShortcut>⌘W</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Print…
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Edit */}
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Edit menu" className={menuTitleClass}>
            Edit
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className={menuContentClass}>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Undo
              <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Redo
              <DropdownMenuShortcut>⇧⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Cut
              <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Copy
              <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Paste
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Select All
              <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View */}
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="View menu" className={menuTitleClass}>
            View
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className={menuContentClass}>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              as Icons
              <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              as List
              <DropdownMenuShortcut>⌘2</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              as Columns
              <DropdownMenuShortcut>⌘3</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Show Toolbar
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Enter Full Screen
              <DropdownMenuShortcut>⌃⌘F</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Window */}
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Window menu" className={menuTitleClass}>
            Window
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className={menuContentClass}>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Minimize
              <DropdownMenuShortcut>⌘M</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Zoom
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem className={menuItemClass} onSelect={noop}>
              Bring All to Front
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Help menu" className={menuTitleClass}>
            Help
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className={menuContentClass}>
            <DropdownMenuItem className={menuItemClass} onSelect={openSettings}>
              {appName} Help
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* ============ RIGHT ============ */}
      <div className="flex items-center gap-0.5">
        {/* Battery */}
        <div
          className="flex h-[20px] items-center gap-1 rounded-[6px] px-1.5"
          aria-label={`Battery ${batteryLevel} percent${isCharging ? ", charging" : ""}`}
          role="img"
        >
          <span className="text-[13px] tabular-nums">{batteryLevel}%</span>
          <BatteryGlyph level={batteryLevel} charging={isCharging} />
        </div>

        {/* Wi-Fi */}
        <div className="relative">
          <button
            type="button"
            className={statusBtn}
            aria-label={wifiEnabled ? "Wi-Fi on" : "Wi-Fi off"}
            aria-haspopup="dialog"
            aria-expanded={wifiOpen}
            onClick={() => setWifiOpen((v) => !v)}
          >
            {wifiEnabled ? (
              <Wifi className="h-[16px] w-[16px]" strokeWidth={2} />
            ) : (
              <WifiOff className="h-[16px] w-[16px]" strokeWidth={2} />
            )}
          </button>
          {wifiOpen && (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setWifiOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="false"
                aria-label="Wi-Fi"
                className="glass-thick lg-flex absolute right-0 top-[28px] z-50 w-[260px] rounded-control border-0 p-3 shadow-glass-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="lg-vibrant text-[14px] font-semibold">Wi-Fi</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={wifiEnabled}
                    aria-label="Toggle Wi-Fi"
                    onClick={toggleWifi}
                    className={cn(
                      "lg-focus relative h-[26px] w-[44px] rounded-full transition-colors duration-200 ease-glass",
                      wifiEnabled ? "bg-accent" : "bg-white/25",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-spring",
                        wifiEnabled ? "translate-x-[20px]" : "translate-x-[2px]",
                      )}
                    />
                  </button>
                </div>
                <p className="lg-vibrant-secondary mt-2 text-[12px]">
                  {wifiEnabled ? "Connected to “apple-techie’s Network”" : "Wi-Fi is turned off"}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Spotlight */}
        <button
          type="button"
          className={statusBtn}
          aria-label="Spotlight Search"
          onClick={onToggleSpotlight}
        >
          <Search className="h-[16px] w-[16px]" strokeWidth={2} />
        </button>

        {/* Control Center */}
        <button
          type="button"
          className={cn(statusBtn, controlCenterOpen && "bg-white/25")}
          aria-label="Control Center"
          aria-pressed={controlCenterOpen}
          onClick={onToggleControlCenter}
        >
          <img
            src="/control-center-icon.webp"
            alt=""
            aria-hidden="true"
            className="h-[16px] w-[16px] brightness-0 invert"
            draggable={false}
          />
        </button>

        {/* Clock */}
        <span
          className="flex h-[20px] items-center rounded-[6px] px-2 text-[13px] tabular-nums"
          aria-label={`Date and time ${formattedTime}`}
        >
          {formattedTime}
        </span>
      </div>
    </header>
  )
}
