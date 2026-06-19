"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import type { AppWindow, DesktopRect } from "@/types"
import { getApp } from "@/lib/apps-registry"
import { useSystem } from "@/components/system-provider"

import Notes from "@/components/apps/notes"
import GitHub from "@/components/apps/github"
import Safari from "@/components/apps/safari"
import VSCode from "@/components/apps/vscode"
import FaceTime from "@/components/apps/facetime"
import Terminal from "@/components/apps/terminal"
import Mail from "@/components/apps/mail"
import YouTube from "@/components/apps/youtube"
import Spotify from "@/components/apps/spotify"
import Music from "@/components/apps/music"
import Snake from "@/components/apps/snake"
import Weather from "@/components/apps/weather"
import Settings from "@/components/apps/settings"

const componentMap: Record<string, React.ComponentType<{ isDarkMode?: boolean }>> = {
  Notes,
  GitHub,
  Safari,
  VSCode,
  FaceTime,
  Terminal,
  Mail,
  YouTube,
  Spotify,
  Music,
  Snake,
  Weather,
  Settings,
}

interface WindowProps {
  appWindow: AppWindow
  isActive: boolean
  isMinimized: boolean
  zIndex: number
  desktopRect: DesktopRect
  onClose: () => void
  onMinimize: () => void
  onFocus: () => void
}

type DragState = { px: number; py: number; ox: number; oy: number }
type ResizeState = { dir: string; px: number; py: number; ow: number; oh: number; ox: number; oy: number }

export default function Window({
  appWindow,
  isActive,
  isMinimized,
  zIndex,
  desktopRect,
  onClose,
  onMinimize,
  onFocus,
}: WindowProps) {
  const { isDarkMode } = useSystem()
  const meta = getApp(appWindow.id)
  const minWidth = meta?.minSize?.width ?? 360
  const minHeight = meta?.minSize?.height ?? 240

  const [position, setPosition] = useState(appWindow.position)
  const [size, setSize] = useState(appWindow.size)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  const preMaximize = useRef({ position: appWindow.position, size: appWindow.size })
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)
  // always-current geometry for gesture handlers (avoids re-attaching listeners per frame)
  const geomRef = useRef({ position, size, desktopRect })
  geomRef.current = { position, size, desktopRect }

  const containerRef = useRef<HTMLDivElement>(null)
  const AppComponent = componentMap[appWindow.component]

  // keep maximized windows pinned to the available desktop rect on viewport resize
  useEffect(() => {
    if (isMaximized) {
      setPosition({ x: desktopRect.left, y: desktopRect.top })
      setSize({ width: desktopRect.width, height: desktopRect.height })
    }
  }, [isMaximized, desktopRect])

  const beginDrag = useCallback(
    (e: React.PointerEvent) => {
      if (isMaximized) return
      if ((e.target as HTMLElement).closest("[data-window-control]")) return
      onFocus()
      dragRef.current = { px: e.clientX, py: e.clientY, ox: position.x, oy: position.y }
      setIsDragging(true)
    },
    [isMaximized, onFocus, position.x, position.y],
  )

  const beginResize = useCallback(
    (e: React.PointerEvent, dir: string) => {
      if (isMaximized) return
      e.preventDefault()
      e.stopPropagation()
      onFocus()
      resizeRef.current = {
        dir,
        px: e.clientX,
        py: e.clientY,
        ow: size.width,
        oh: size.height,
        ox: position.x,
        oy: position.y,
      }
      setIsResizing(true)
    },
    [isMaximized, onFocus, position.x, position.y, size.width, size.height],
  )

  // single listener pair per gesture
  useEffect(() => {
    if (!isDragging && !isResizing) return

    const onMove = (e: PointerEvent) => {
      const { desktopRect: rect } = geomRef.current
      if (isDragging && dragRef.current) {
        const { px, py, ox, oy } = dragRef.current
        const w = geomRef.current.size.width
        const minVisible = 96
        let nx = ox + (e.clientX - px)
        let ny = oy + (e.clientY - py)
        nx = Math.min(Math.max(nx, -(w - minVisible)), rect.left + rect.width - minVisible)
        ny = Math.min(Math.max(ny, rect.top), rect.top + rect.height - 36)
        setPosition({ x: nx, y: ny })
      } else if (isResizing && resizeRef.current) {
        const { dir, px, py, ow, oh, ox, oy } = resizeRef.current
        const dx = e.clientX - px
        const dy = e.clientY - py
        let w = ow
        let h = oh
        let x = ox
        let y = oy
        if (dir.includes("e")) w = Math.max(minWidth, ow + dx)
        if (dir.includes("s")) h = Math.max(minHeight, oh + dy)
        if (dir.includes("w")) {
          w = Math.max(minWidth, ow - dx)
          x = ox + (ow - w)
        }
        if (dir.includes("n")) {
          h = Math.max(minHeight, oh - dy)
          y = oy + (oh - h)
        }
        setSize({ width: w, height: h })
        setPosition({ x, y })
      }
    }

    const onUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      dragRef.current = null
      resizeRef.current = null
    }

    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onUp)
    document.addEventListener("pointercancel", onUp)
    return () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointercancel", onUp)
    }
  }, [isDragging, isResizing, minWidth, minHeight])

  const toggleZoom = useCallback(() => {
    if (isMaximized) {
      setPosition(preMaximize.current.position)
      setSize(preMaximize.current.size)
      setIsMaximized(false)
    } else {
      preMaximize.current = { position, size }
      setPosition({ x: desktopRect.left, y: desktopRect.top })
      setSize({ width: desktopRect.width, height: desktopRect.height })
      setIsMaximized(true)
    }
  }, [isMaximized, position, size, desktopRect])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w")) {
      e.preventDefault()
      onClose()
    }
  }

  const RESIZE_HANDLES: Array<{ dir: string; cls: string }> = [
    { dir: "nw", cls: "top-0 left-0 w-3 h-3 cursor-nwse-resize" },
    { dir: "ne", cls: "top-0 right-0 w-3 h-3 cursor-nesw-resize" },
    { dir: "sw", cls: "bottom-0 left-0 w-3 h-3 cursor-nesw-resize" },
    { dir: "se", cls: "bottom-0 right-0 w-3 h-3 cursor-nwse-resize" },
    { dir: "n", cls: "top-0 left-3 right-3 h-1.5 cursor-ns-resize" },
    { dir: "s", cls: "bottom-0 left-3 right-3 h-1.5 cursor-ns-resize" },
    { dir: "w", cls: "left-0 top-3 bottom-3 w-1.5 cursor-ew-resize" },
    { dir: "e", cls: "right-0 top-3 bottom-3 w-1.5 cursor-ew-resize" },
  ]

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label={appWindow.title}
      aria-hidden={isMinimized}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onPointerDown={() => {
        if (!isActive) onFocus()
      }}
      className={`group absolute flex flex-col overflow-hidden rounded-window will-change-transform ${
        isActive ? "shadow-glass-lg" : "shadow-glass"
      } ${isDragging || isResizing ? "" : "transition-[transform,opacity] duration-300 ease-glass"}`}
      style={{
        left: 0,
        top: 0,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transform: isMinimized
          ? `translate(${position.x}px, ${position.y}px) scale(0.18) translateY(62vh)`
          : `translate(${position.x}px, ${position.y}px)`,
        transformOrigin: "bottom center",
        opacity: isMinimized ? 0 : 1,
        pointerEvents: isMinimized ? "none" : "auto",
        zIndex,
        boxShadow:
          "var(--lg-shadow-lg), 0 0 0 0.5px var(--lg-rim), inset 0 0 0 0.5px rgba(255,255,255,0.06)",
      }}
    >
      {/* Title bar */}
      <div
        onPointerDown={beginDrag}
        onDoubleClick={toggleZoom}
        className={`relative flex h-7 flex-shrink-0 items-center px-3 select-none ${
          isActive ? "" : "opacity-90"
        }`}
        style={{
          background: "var(--lg-tint)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderBottom: "0.5px solid var(--lg-rim)",
        }}
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-2" data-window-control>
          <button
            type="button"
            aria-label="Close window"
            onClick={onClose}
            className={`flex h-3 w-3 items-center justify-center rounded-full transition-colors ${
              isActive ? "bg-[#ff5f57]" : "bg-black/20 dark:bg-white/25"
            }`}
            style={isActive ? { boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.18)" } : undefined}
          >
            <svg viewBox="0 0 12 12" className="h-2 w-2 opacity-0 transition-opacity group-hover:opacity-100">
              <path d="M3.2 3.2l5.6 5.6M8.8 3.2l-5.6 5.6" stroke="rgba(0,0,0,0.55)" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Minimize window"
            onClick={onMinimize}
            className={`flex h-3 w-3 items-center justify-center rounded-full transition-colors ${
              isActive ? "bg-[#febc2e]" : "bg-black/20 dark:bg-white/25"
            }`}
            style={isActive ? { boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.18)" } : undefined}
          >
            <svg viewBox="0 0 12 12" className="h-2 w-2 opacity-0 transition-opacity group-hover:opacity-100">
              <path d="M3 6h6" stroke="rgba(0,0,0,0.55)" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={isMaximized ? "Restore window" : "Zoom window"}
            onClick={toggleZoom}
            className={`flex h-3 w-3 items-center justify-center rounded-full transition-colors ${
              isActive ? "bg-[#28c840]" : "bg-black/20 dark:bg-white/25"
            }`}
            style={isActive ? { boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.18)" } : undefined}
          >
            <svg viewBox="0 0 12 12" className="h-2 w-2 opacity-0 transition-opacity group-hover:opacity-100">
              <path d="M4 4.2h3.8V8" stroke="rgba(0,0,0,0.55)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="rotate(45 6 6)" />
            </svg>
          </button>
        </div>

        <div
          className={`pointer-events-none absolute inset-x-0 truncate px-24 text-center text-[13px] font-semibold ${
            isActive ? "lg-vibrant" : "lg-vibrant-tertiary"
          }`}
        >
          {appWindow.title}
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-auto bg-background text-foreground">
        {!isActive && <div className="pointer-events-none absolute inset-0 z-10 bg-background/20" aria-hidden />}
        {AppComponent ? (
          <AppComponent isDarkMode={isDarkMode} />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Content not available</div>
        )}
      </div>

      {/* Resize handles */}
      {!isMaximized && !isMinimized && (
        <>
          {RESIZE_HANDLES.map((h) => (
            <div
              key={h.dir}
              className={`absolute z-20 ${h.cls}`}
              onPointerDown={(e) => beginResize(e, h.dir)}
            />
          ))}
        </>
      )}
    </div>
  )
}
