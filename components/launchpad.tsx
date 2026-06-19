"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { LAUNCHPAD_APPS } from "@/lib/apps-registry"
import { cn } from "@/lib/utils"

interface LaunchpadProps {
  onAppClick: (id: string) => void
  onClose: () => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Launchpad({ onAppClick, onClose }: LaunchpadProps) {
  const [query, setQuery] = useState("")
  const [visible, setVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  // Entrance animation: mount hidden, flip to visible on next frame.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Autofocus the search field on open.
  useEffect(() => {
    const t = window.setTimeout(() => searchRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [])

  const close = () => {
    setVisible(false)
    window.setTimeout(onClose, 220)
  }

  const launch = (id: string) => {
    onAppClick(id)
    onClose()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return LAUNCHPAD_APPS
    return LAUNCHPAD_APPS.filter((app) => {
      if (app.title.toLowerCase().includes(q)) return true
      return app.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false
    })
  }, [query])

  // Escape closes; Tab traps focus within the overlay.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      close()
      return
    }
    if (e.key === "Tab") {
      const root = overlayRef.current
      if (!root) return
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  // Pressing Enter with exactly one result launches it.
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filtered.length === 1) {
      e.preventDefault()
      launch(filtered[0].id)
    }
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      className={cn(
        "fixed inset-0 z-40 flex flex-col items-center",
        "bg-black/40 backdrop-blur-2xl",
        "transition-opacity duration-300 ease-glass",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <h2 id={titleId} className="sr-only">
        Launchpad
      </h2>

      {/* Search field */}
      <div
        className={cn(
          "mt-16 w-full max-w-sm px-6 transition-all duration-300 ease-spring",
          visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="glass-thin lg-focus relative flex items-center rounded-full px-4 py-2.5">
          <Search aria-hidden className="lg-text-scrim h-4 w-4 shrink-0 opacity-80" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search"
            aria-label="Search apps"
            className="lg-text-scrim w-full bg-transparent px-3 text-[15px] placeholder:text-white/60 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                searchRef.current?.focus()
              }}
              aria-label="Clear search"
              className="lg-focus -mr-1 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:text-white"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* App grid */}
      <div
        className="w-full flex-1 overflow-y-auto px-8 py-12"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close()
        }}
      >
        {filtered.length > 0 ? (
          <div
            className={cn(
              "mx-auto grid max-w-5xl grid-cols-4 gap-8 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7",
              "transition-all duration-300 ease-spring",
              visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {filtered.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => launch(app.id)}
                aria-label={`Open ${app.title}`}
                className="lg-focus group flex flex-col items-center gap-2 rounded-tile p-2 focus:outline-none"
              >
                <span className="glass-interactive grid h-[72px] w-[72px] place-items-center rounded-[18px] transition-colors group-hover:bg-white/10">
                  <img
                    src={app.icon}
                    alt=""
                    draggable={false}
                    className="h-16 w-16 select-none object-contain drop-shadow-lg"
                  />
                </span>
                <span className="lg-text-scrim max-w-[88px] truncate text-center text-[13px] font-medium">
                  {app.title}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="lg-text-scrim mt-24 text-center text-sm opacity-80">
            No results for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
