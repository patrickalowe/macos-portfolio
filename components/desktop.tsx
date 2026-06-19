"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Dock from "@/components/dock"
import Menubar from "@/components/menubar"
import Wallpaper from "@/components/wallpaper"
import Window from "@/components/window"
import Launchpad from "@/components/launchpad"
import ControlCenter from "@/components/control-center"
import Spotlight from "@/components/spotlight"
import type { AppWindow, DesktopRect } from "@/types"
import { makeWindow } from "@/lib/apps-registry"

const MENUBAR_H = 26
const DOCK_RESERVED = 96
const WIN_Z_BASE = 20

interface DesktopProps {
  onLogout: () => void
  onSleep: () => void
  onShutdown: () => void
  onRestart: () => void
}

export default function Desktop({ onLogout, onSleep, onShutdown, onRestart }: DesktopProps) {
  const [openWindows, setOpenWindows] = useState<AppWindow[]>([])
  const [zOrder, setZOrder] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showLaunchpad, setShowLaunchpad] = useState(false)
  const [showControlCenter, setShowControlCenter] = useState(false)
  const [showSpotlight, setShowSpotlight] = useState(false)
  const [desktopRect, setDesktopRect] = useState<DesktopRect>({ top: MENUBAR_H, left: 0, width: 1280, height: 720 })
  const desktopRef = useRef<HTMLDivElement>(null)
  const spawnCount = useRef(0)
  // current-value mirrors so imperative handlers don't nest setState calls
  const winsRef = useRef(openWindows)
  winsRef.current = openWindows
  const zRef = useRef(zOrder)
  zRef.current = zOrder

  const topMostActive = (zList: string[], wins: AppWindow[], excludeId?: string): string | null => {
    const candidates = zList.filter(
      (wid) => wid !== excludeId && wins.some((w) => w.id === wid && !w.minimized),
    )
    return candidates.length ? candidates[candidates.length - 1] : null
  }

  // available desktop rect (below menubar, above dock)
  useEffect(() => {
    const recompute = () => {
      setDesktopRect({
        top: MENUBAR_H,
        left: 0,
        width: window.innerWidth,
        height: Math.max(320, window.innerHeight - MENUBAR_H - DOCK_RESERVED),
      })
    }
    recompute()
    window.addEventListener("resize", recompute)
    return () => window.removeEventListener("resize", recompute)
  }, [])

  const focusWindow = useCallback((id: string) => {
    setZOrder((prev) => [...prev.filter((w) => w !== id), id])
    setActiveId(id)
    setOpenWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: false } : w)))
  }, [])

  const openApp = useCallback(
    (id: string) => {
      setShowLaunchpad(false)
      setShowSpotlight(false)
      const exists = winsRef.current.some((w) => w.id === id)
      if (exists) {
        setOpenWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: false } : w)))
      } else {
        const n = spawnCount.current++
        const offset = (n % 6) * 28
        const pos = {
          x: Math.round(desktopRect.left + 80 + offset),
          y: Math.round(desktopRect.top + 32 + offset),
        }
        const win = makeWindow(id, pos)
        if (win) setOpenWindows((prev) => [...prev, win])
      }
      setZOrder((prev) => [...prev.filter((w) => w !== id), id])
      setActiveId(id)
    },
    [desktopRect.left, desktopRect.top],
  )

  const closeWindow = useCallback((id: string) => {
    const nextZ = zRef.current.filter((w) => w !== id)
    const nextWins = winsRef.current.filter((w) => w.id !== id)
    setOpenWindows(nextWins)
    setZOrder(nextZ)
    setActiveId(topMostActive(nextZ, nextWins))
  }, [])

  const minimizeWindow = useCallback((id: string) => {
    const nextWins = winsRef.current.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    setOpenWindows(nextWins)
    setActiveId(topMostActive(zRef.current, nextWins, id))
  }, [])

  const toggleLaunchpad = useCallback(() => {
    setShowLaunchpad((v) => !v)
    setShowControlCenter(false)
    setShowSpotlight(false)
  }, [])

  const toggleControlCenter = useCallback(() => {
    setShowControlCenter((v) => !v)
    setShowSpotlight(false)
  }, [])

  const toggleSpotlight = useCallback(() => {
    setShowSpotlight((v) => !v)
    setShowControlCenter(false)
    setShowLaunchpad(false)
  }, [])

  // single global keyboard model
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.code === "Space") {
        e.preventDefault()
        toggleSpotlight()
        return
      }
      if (e.key === "Escape") {
        if (showSpotlight) return setShowSpotlight(false)
        if (showControlCenter) return setShowControlCenter(false)
        if (showLaunchpad) return setShowLaunchpad(false)
        return
      }
      if (meta && e.key.toLowerCase() === "w" && activeId) {
        e.preventDefault()
        closeWindow(activeId)
        return
      }
      if (meta && e.key.toLowerCase() === "m" && activeId) {
        e.preventDefault()
        minimizeWindow(activeId)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showSpotlight, showControlCenter, showLaunchpad, activeId, toggleSpotlight, closeWindow, minimizeWindow])

  const handleDesktopClick = (e: React.MouseEvent) => {
    if (e.target === desktopRef.current) {
      setActiveId(null)
      setShowControlCenter(false)
      setShowSpotlight(false)
    }
  }

  const runningIds = useMemo(() => openWindows.map((w) => w.id), [openWindows])
  const minimizedIds = useMemo(() => openWindows.filter((w) => w.minimized).map((w) => w.id), [openWindows])
  const activeApp = useMemo(() => {
    const w = openWindows.find((win) => win.id === activeId && !win.minimized)
    return w ? { id: w.id, title: w.title } : null
  }, [openWindows, activeId])

  return (
    <div
      ref={desktopRef}
      className="relative h-screen w-screen overflow-hidden"
      onMouseDown={handleDesktopClick}
    >
      <Wallpaper />

      <Menubar
        activeApp={activeApp}
        controlCenterOpen={showControlCenter}
        onToggleSpotlight={toggleSpotlight}
        onToggleControlCenter={toggleControlCenter}
        onOpenApp={openApp}
        onLogout={onLogout}
        onSleep={onSleep}
        onShutdown={onShutdown}
        onRestart={onRestart}
      />

      {/* Windows */}
      <div className="absolute inset-0" style={{ paddingTop: MENUBAR_H }}>
        {openWindows.map((win) => (
          <Window
            key={win.id}
            appWindow={win}
            isActive={activeId === win.id && !win.minimized}
            isMinimized={!!win.minimized}
            zIndex={WIN_Z_BASE + Math.max(0, zOrder.indexOf(win.id))}
            desktopRect={desktopRect}
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onFocus={() => focusWindow(win.id)}
          />
        ))}
      </div>

      {showLaunchpad && <Launchpad onAppClick={openApp} onClose={() => setShowLaunchpad(false)} />}

      {showControlCenter && <ControlCenter onClose={() => setShowControlCenter(false)} />}

      {showSpotlight && <Spotlight onClose={() => setShowSpotlight(false)} onAppClick={openApp} />}

      <Dock
        onAppClick={openApp}
        onLaunchpadClick={toggleLaunchpad}
        runningIds={runningIds}
        minimizedIds={minimizedIds}
        activeId={activeId}
      />
    </div>
  )
}
