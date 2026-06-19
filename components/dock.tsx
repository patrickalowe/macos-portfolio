"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import { DOCK_APPS } from "@/lib/apps-registry"
import { cn } from "@/lib/utils"

interface DockProps {
  onAppClick: (id: string) => void
  onLaunchpadClick: () => void
  runningIds: string[]
  minimizedIds: string[]
  activeId: string | null
}

const BASE_ICON = 52 // px
const MAX_SCALE = 1.8
const LIFT = 22 // px lift at full magnification
const SIGMA = 70 // Gaussian falloff width in px (cursor-distance space)

type DockItem = {
  key: string
  title: string
  /** image source for app icons; undefined for the Trash glyph tile */
  icon?: string
  kind: "launchpad" | "app" | "trash"
  appId?: string
}

export default function Dock({
  onAppClick,
  onLaunchpadClick,
  runningIds,
  minimizedIds,
  activeId,
}: DockProps) {
  const [isCompact, setIsCompact] = useState(false)
  const [trashShake, setTrashShake] = useState(false)

  const itemRefs = useRef<Array<HTMLLIElement | null>>([])
  const rafRef = useRef<number | null>(null)
  const pointerXRef = useRef<number | null>(null)
  const trashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Responsive: disable magnification on narrow / touch widths.
  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth < 720)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Build the ordered item list: Launchpad, apps from registry, then Trash.
  const items: DockItem[] = [
    { key: "launchpad", title: "Launchpad", icon: "/launchpad.png", kind: "launchpad" },
    ...DOCK_APPS.map<DockItem>((app) => ({
      key: app.id,
      title: app.title,
      icon: app.icon,
      kind: "app",
      appId: app.id,
    })),
    { key: "trash", title: "Trash", kind: "trash" },
  ]

  // Apply magnification by writing transforms directly to the DOM (no React
  // re-render per frame). Driven from a single rAF-throttled pointer handler.
  const applyMagnification = useCallback(() => {
    rafRef.current = null
    const px = pointerXRef.current
    const els = itemRefs.current
    const engaged = px !== null && !isCompact
    // Instant while tracking the cursor; springy when relaxing to rest.
    const transition = engaged
      ? "none"
      : "transform 320ms cubic-bezier(0.22,1,0.36,1), width 320ms cubic-bezier(0.22,1,0.36,1)"

    for (const el of els) {
      if (!el) continue
      const inner = el.querySelector<HTMLElement>("[data-dock-icon]")
      if (!inner) continue

      el.style.transition = transition
      inner.style.transition = transition

      if (!engaged) {
        el.style.width = `${BASE_ICON}px`
        inner.style.transform = "translateY(0px) scale(1)"
        continue
      }

      const rect = el.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const dist = px! - center
      const falloff = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA))
      const scale = 1 + (MAX_SCALE - 1) * falloff
      const lift = LIFT * falloff

      // Reserve horizontal room so neighbours slide aside (controlled cell width).
      el.style.width = `${BASE_ICON * scale}px`
      inner.style.transform = `translateY(${-lift}px) scale(${scale})`
    }
  }, [isCompact])

  const scheduleMagnify = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(applyMagnification)
  }, [applyMagnification])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isCompact || e.pointerType === "touch") return
      pointerXRef.current = e.clientX
      scheduleMagnify()
    },
    [isCompact, scheduleMagnify],
  )

  const handlePointerLeave = useCallback(() => {
    pointerXRef.current = null
    scheduleMagnify()
  }, [scheduleMagnify])

  // Relax to rest whenever compact mode toggles or on unmount.
  useEffect(() => {
    pointerXRef.current = null
    scheduleMagnify()
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [isCompact, scheduleMagnify])

  useEffect(() => {
    return () => {
      if (trashTimeout.current) clearTimeout(trashTimeout.current)
    }
  }, [])

  const triggerTrashShake = useCallback(() => {
    setTrashShake(true)
    if (trashTimeout.current) clearTimeout(trashTimeout.current)
    trashTimeout.current = setTimeout(() => setTrashShake(false), 420)
  }, [])

  const handleItemActivate = useCallback(
    (item: DockItem) => {
      if (item.kind === "launchpad") {
        onLaunchpadClick()
      } else if (item.kind === "trash") {
        triggerTrashShake()
      } else if (item.appId) {
        onAppClick(item.appId)
      }
    },
    [onAppClick, onLaunchpadClick, triggerTrashShake],
  )

  return (
    <div
      className={cn(
        "fixed bottom-2 left-1/2 z-50 -translate-x-1/2",
        "max-w-[calc(100vw-1rem)]",
      )}
    >
      <ul
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        aria-label="Dock"
        className={cn(
          "glass-chrome relative flex items-end rounded-dock px-2 py-1.5",
          isCompact && "max-w-full overflow-x-auto",
        )}
        style={{ height: BASE_ICON + 16 }}
      >
        {items.map((item, index) => {
          const isApp = item.kind === "app" && item.appId
          const isRunning =
            isApp && (runningIds.includes(item.appId!) || minimizedIds.includes(item.appId!))
          const isActive = isApp && activeId === item.appId

          return (
            <li
              key={item.key}
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              className={cn(
                "group/dock relative flex shrink-0 flex-col items-center justify-end",
                // Separator before Trash.
                item.kind === "trash" && "ml-1.5 pl-1.5 before:absolute before:left-0 before:top-1/2 before:h-7 before:w-px before:-translate-y-1/2 before:bg-white/25 dark:before:bg-white/15",
              )}
              style={{
                width: BASE_ICON,
                transition: "width 320ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              {/* Tooltip capsule */}
              <span
                role="tooltip"
                className={cn(
                  "pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap",
                  "glass-clear rounded-full px-2.5 py-1 text-xs font-medium",
                  "lg-vibrant opacity-0 translate-y-1 transition-all duration-150 ease-glass",
                  "group-hover/dock:opacity-100 group-hover/dock:translate-y-0",
                )}
              >
                {item.title}
              </span>

              <button
                type="button"
                data-dock-icon
                aria-label={item.title}
                onClick={() => handleItemActivate(item)}
                className="lg-focus relative flex items-center justify-center rounded-tile outline-none"
                style={{
                  width: BASE_ICON,
                  height: BASE_ICON,
                  transform: "translateY(0px) scale(1)",
                  transformOrigin: "bottom center",
                  transition: "transform 320ms cubic-bezier(0.22,1,0.36,1)",
                  animation:
                    item.kind === "trash" && trashShake
                      ? "dock-shake 0.4s ease-in-out"
                      : undefined,
                }}
              >
                {item.kind === "trash" ? (
                  <span className="glass-thin flex h-[46px] w-[46px] items-center justify-center rounded-full">
                    <Trash2 className="h-6 w-6 lg-vibrant-secondary" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                ) : (
                  <img
                    src={item.icon || "/placeholder.svg"}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="h-[46px] w-[46px] select-none object-contain drop-shadow-sm"
                  />
                )}
              </button>

              {/* Running / minimized indicator dot */}
              {isRunning && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full transition-colors",
                    isActive
                      ? "bg-foreground/90"
                      : "bg-foreground/55",
                  )}
                />
              )}
            </li>
          )
        })}
      </ul>

      <style jsx global>{`
        @keyframes dock-shake {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          20% {
            transform: translateY(0) rotate(-9deg);
          }
          40% {
            transform: translateY(0) rotate(7deg);
          }
          60% {
            transform: translateY(0) rotate(-5deg);
          }
          80% {
            transform: translateY(0) rotate(3deg);
          }
        }
      `}</style>
    </div>
  )
}
