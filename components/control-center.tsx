"use client"

import { useEffect, useRef, useState } from "react"
import { Wifi, Bluetooth, Radio, Moon, Sun, Volume2, VolumeX, SunMedium } from "lucide-react"
import { useSystem } from "@/components/system-provider"
import { cn } from "@/lib/utils"

interface ControlCenterProps {
  onClose: () => void
}

interface ToggleTileProps {
  active: boolean
  onToggle: () => void
  icon: React.ReactNode
  label: string
  sublabel: string
  ariaLabel: string
  className?: string
}

function ToggleTile({ active, onToggle, icon, label, sublabel, ariaLabel, className }: ToggleTileProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={cn(
        "glass-interactive lg-focus group flex items-center gap-2.5 rounded-control px-3 py-2.5 text-left transition-colors",
        active ? "glass-tint-accent" : "bg-foreground/[0.06] dark:bg-white/[0.06]",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
          active
            ? "bg-[var(--lg-accent)] text-white shadow-sm"
            : "bg-foreground/10 text-foreground/70 dark:bg-white/10 dark:text-white/70",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-medium lg-vibrant">{label}</span>
        <span className="block truncate text-[11px] lg-vibrant-secondary">{sublabel}</span>
      </span>
    </button>
  )
}

interface SliderPillProps {
  label: string
  icon: React.ReactNode
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  ariaLabel: string
  onIconClick?: () => void
  iconAriaLabel?: string
}

function SliderPill({
  label,
  icon,
  value,
  min,
  max,
  onChange,
  ariaLabel,
  onIconClick,
  iconAriaLabel,
}: SliderPillProps) {
  const pct = Math.round(((value - min) / (max - min)) * 100)

  return (
    <div className="space-y-1.5">
      <span className="block px-1 text-[13px] font-medium lg-vibrant">{label}</span>
      <div className="relative h-[30px] w-full overflow-hidden rounded-full">
        {/* track */}
        <div className="absolute inset-0 bg-foreground/[0.08] dark:bg-white/[0.10]" aria-hidden="true" />
        {/* fill */}
        <div
          className="absolute inset-y-0 left-0 bg-white/85 dark:bg-white/90 shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.06)]"
          style={{ width: `${pct}%`, minWidth: "30px" }}
          aria-hidden="true"
        />
        {/* inline icon over the fill */}
        {onIconClick ? (
          <button
            type="button"
            aria-label={iconAriaLabel ?? label}
            onClick={onIconClick}
            className="lg-focus absolute left-0 top-0 z-10 flex h-full w-[30px] items-center justify-center rounded-full text-neutral-700"
          >
            {icon}
          </button>
        ) : (
          <span
            className="pointer-events-none absolute left-0 top-0 z-10 flex h-full w-[30px] items-center justify-center text-neutral-700"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
          className="lg-focus absolute inset-0 z-20 h-full w-full cursor-pointer appearance-none bg-transparent focus-visible:rounded-full [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:appearance-none"
        />
      </div>
    </div>
  )
}

export default function ControlCenter({ onClose }: ControlCenterProps) {
  const {
    wifiEnabled,
    toggleWifi,
    bluetoothEnabled,
    toggleBluetooth,
    isDarkMode,
    toggleDarkMode,
    brightness,
    setBrightness,
    volume,
    setVolume,
    muted,
    toggleMuted,
  } = useSystem()

  const panelRef = useRef<HTMLDivElement>(null)
  const [airdropEnabled, setAirdropEnabled] = useState(true)

  useEffect(() => {
    const first = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    )
    first?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== "Tab") return

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const list = Array.from(focusable)
      const firstEl = list[0]
      const lastEl = list[list.length - 1]

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Control Center"
      onClick={(e) => e.stopPropagation()}
      className="glass-thick lg-flex fixed right-3 top-8 z-40 w-80 rounded-tile p-3 shadow-glass-lg"
    >
      <div className="space-y-3">
        {/* Connectivity module */}
        <div className="rounded-control bg-foreground/[0.04] p-2 dark:bg-white/[0.04]">
          <div className="grid grid-cols-2 gap-2">
            <ToggleTile
              active={wifiEnabled}
              onToggle={toggleWifi}
              icon={<Wifi className="h-4 w-4" />}
              label="Wi-Fi"
              sublabel={wifiEnabled ? "Home" : "Off"}
              ariaLabel="Wi-Fi"
            />
            <ToggleTile
              active={bluetoothEnabled}
              onToggle={toggleBluetooth}
              icon={<Bluetooth className="h-4 w-4" />}
              label="Bluetooth"
              sublabel={bluetoothEnabled ? "On" : "Off"}
              ariaLabel="Bluetooth"
            />
            <ToggleTile
              active={airdropEnabled}
              onToggle={() => setAirdropEnabled((v) => !v)}
              icon={<Radio className="h-4 w-4" />}
              label="AirDrop"
              sublabel={airdropEnabled ? "Contacts Only" : "Off"}
              ariaLabel="AirDrop"
            />
            <ToggleTile
              active={isDarkMode}
              onToggle={toggleDarkMode}
              icon={isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              label="Appearance"
              sublabel={isDarkMode ? "Dark" : "Light"}
              ariaLabel={isDarkMode ? "Switch to light appearance" : "Switch to dark appearance"}
            />
          </div>
        </div>

        {/* Display brightness */}
        <div className="rounded-control bg-foreground/[0.04] p-3 dark:bg-white/[0.04]">
          <SliderPill
            label="Display"
            icon={<SunMedium className="h-[18px] w-[18px]" />}
            value={brightness}
            min={10}
            max={100}
            onChange={setBrightness}
            ariaLabel="Display brightness"
          />
        </div>

        {/* Sound volume */}
        <div className="rounded-control bg-foreground/[0.04] p-3 dark:bg-white/[0.04]">
          <SliderPill
            label="Sound"
            icon={
              muted || volume === 0 ? (
                <VolumeX className="h-[18px] w-[18px]" />
              ) : (
                <Volume2 className="h-[18px] w-[18px]" />
              )
            }
            value={muted ? 0 : volume}
            min={0}
            max={100}
            onChange={setVolume}
            ariaLabel="Sound volume"
            onIconClick={toggleMuted}
            iconAriaLabel={muted ? "Unmute" : "Mute"}
          />
        </div>
      </div>
    </div>
  )
}
