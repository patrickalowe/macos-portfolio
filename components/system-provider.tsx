"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import { useTheme } from "next-themes"

type ThemeName = "light" | "dark" | "system"

interface SystemContextValue {
  /** true once mounted on the client — gate theme-dependent rendering on this to avoid hydration mismatch */
  mounted: boolean
  /** resolved appearance */
  isDarkMode: boolean
  theme: ThemeName
  setTheme: (t: ThemeName) => void
  toggleDarkMode: () => void
  /** 10–100 */
  brightness: number
  setBrightness: (n: number) => void
  /** 0–100 */
  volume: number
  setVolume: (n: number) => void
  muted: boolean
  toggleMuted: () => void
  wifiEnabled: boolean
  setWifi: (b: boolean) => void
  toggleWifi: () => void
  bluetoothEnabled: boolean
  setBluetooth: (b: boolean) => void
  toggleBluetooth: () => void
}

const SystemContext = createContext<SystemContextValue | null>(null)

const STORAGE = {
  brightness: "sys.brightness",
  volume: "sys.volume",
  muted: "sys.muted",
  wifi: "sys.wifi",
  bluetooth: "sys.bluetooth",
} as const

function readNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  const n = raw === null ? Number.NaN : Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  return raw === null ? fallback : raw === "true"
}

export function SystemProvider({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme, setTheme: setNextTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [brightness, setBrightnessState] = useState(90)
  const [volume, setVolumeState] = useState(70)
  const [muted, setMuted] = useState(false)
  const [wifiEnabled, setWifiState] = useState(true)
  const [bluetoothEnabled, setBluetoothState] = useState(true)

  // hydrate persisted prefs once on mount
  useEffect(() => {
    setBrightnessState(readNumber(STORAGE.brightness, 90))
    setVolumeState(readNumber(STORAGE.volume, 70))
    setMuted(readBool(STORAGE.muted, false))
    setWifiState(readBool(STORAGE.wifi, true))
    setBluetoothState(readBool(STORAGE.bluetooth, true))
    setMounted(true)
  }, [])

  const persist = useCallback((key: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value)
  }, [])

  const setBrightness = useCallback(
    (n: number) => {
      const clamped = Math.max(10, Math.min(100, Math.round(n)))
      setBrightnessState(clamped)
      persist(STORAGE.brightness, String(clamped))
    },
    [persist],
  )

  const setVolume = useCallback(
    (n: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(n)))
      setVolumeState(clamped)
      persist(STORAGE.volume, String(clamped))
      if (clamped > 0 && muted) {
        setMuted(false)
        persist(STORAGE.muted, "false")
      }
    },
    [persist, muted],
  )

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m
      persist(STORAGE.muted, String(next))
      return next
    })
  }, [persist])

  const setWifi = useCallback(
    (b: boolean) => {
      setWifiState(b)
      persist(STORAGE.wifi, String(b))
    },
    [persist],
  )
  const toggleWifi = useCallback(() => setWifi(!wifiEnabled), [setWifi, wifiEnabled])

  const setBluetooth = useCallback(
    (b: boolean) => {
      setBluetoothState(b)
      persist(STORAGE.bluetooth, String(b))
    },
    [persist],
  )
  const toggleBluetooth = useCallback(() => setBluetooth(!bluetoothEnabled), [setBluetooth, bluetoothEnabled])

  const isDarkMode = mounted ? resolvedTheme === "dark" : false

  const setTheme = useCallback((t: ThemeName) => setNextTheme(t), [setNextTheme])
  const toggleDarkMode = useCallback(() => {
    setNextTheme(resolvedTheme === "dark" ? "light" : "dark")
  }, [resolvedTheme, setNextTheme])

  const value = useMemo<SystemContextValue>(
    () => ({
      mounted,
      isDarkMode,
      theme: (theme as ThemeName) ?? "light",
      setTheme,
      toggleDarkMode,
      brightness,
      setBrightness,
      volume,
      setVolume,
      muted,
      toggleMuted,
      wifiEnabled,
      setWifi,
      toggleWifi,
      bluetoothEnabled,
      setBluetooth,
      toggleBluetooth,
    }),
    [
      mounted, isDarkMode, theme, setTheme, toggleDarkMode,
      brightness, setBrightness, volume, setVolume, muted, toggleMuted,
      wifiEnabled, setWifi, toggleWifi, bluetoothEnabled, setBluetooth, toggleBluetooth,
    ],
  )

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>
}

export function useSystem(): SystemContextValue {
  const ctx = useContext(SystemContext)
  if (!ctx) throw new Error("useSystem must be used within a SystemProvider")
  return ctx
}
