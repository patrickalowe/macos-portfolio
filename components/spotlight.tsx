"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"

import { LAUNCHPAD_APPS } from "@/lib/apps-registry"
import { cn } from "@/lib/utils"

interface SpotlightProps {
  onClose: () => void
  onAppClick: (id: string) => void
}

const LISTBOX_ID = "spotlight-results"
const optionId = (id: string) => `spotlight-option-${id}`

export default function Spotlight({ onClose, onAppClick }: SpotlightProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return LAUNCHPAD_APPS
    return LAUNCHPAD_APPS.filter((app) => {
      if (app.title.toLowerCase().includes(q)) return true
      return app.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false
    })
  }, [query])

  // Keep the selection in range as the result set changes.
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (filteredApps.length === 0) return 0
      return prev > filteredApps.length - 1 ? 0 : prev
    })
  }, [filteredApps])

  // Mount: autofocus the field. Split from the keydown handler so typing does
  // not re-run focus logic.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const open = useCallback(
    (id: string) => {
      onAppClick(id)
      onClose()
    },
    [onAppClick, onClose],
  )

  // Refs let the global keydown handler read the latest selection/results
  // without re-binding on every keystroke.
  const selectedIndexRef = useRef(selectedIndex)
  selectedIndexRef.current = selectedIndex
  const filteredAppsRef = useRef(filteredApps)
  filteredAppsRef.current = filteredApps

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const apps = filteredAppsRef.current
      switch (e.key) {
        case "Escape":
          e.preventDefault()
          onClose()
          break
        case "ArrowDown":
          if (apps.length === 0) return
          e.preventDefault()
          setSelectedIndex((prev) => (prev < apps.length - 1 ? prev + 1 : 0))
          break
        case "ArrowUp":
          if (apps.length === 0) return
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : apps.length - 1))
          break
        case "Enter": {
          const app = apps[selectedIndexRef.current]
          if (app) {
            e.preventDefault()
            open(app.id)
          }
          break
        }
        case "Tab": {
          // Manual focus trap: the field is the only tab stop, keep it focused.
          e.preventDefault()
          inputRef.current?.focus()
          break
        }
        default:
          break
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose, open])

  // Keep the selected row scrolled into view.
  useEffect(() => {
    const app = filteredApps[selectedIndex]
    if (!app || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`#${CSS.escape(optionId(app.id))}`)
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex, filteredApps])

  const activeApp = filteredApps[selectedIndex]
  const hasResults = filteredApps.length > 0

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center bg-black/[0.18] pt-[18vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Spotlight Search"
        className="glass-thick lg-flex h-fit w-full max-w-[700px] overflow-hidden rounded-tile shadow-glass-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4">
            <Search className="h-[22px] w-[22px] shrink-0 lg-vibrant-secondary" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={hasResults}
              aria-controls={LISTBOX_ID}
              aria-activedescendant={activeApp ? optionId(activeApp.id) : undefined}
              aria-autocomplete="list"
              aria-label="Spotlight Search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Spotlight Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="lg-focus w-full bg-transparent text-[22px] leading-tight text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          {hasResults ? (
            <>
              <div className="mx-3 border-t border-border/60" />
              <div className="px-3 pb-3 pt-2">
                <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide lg-vibrant-tertiary">
                  Applications
                </div>
                <div
                  ref={listRef}
                  id={LISTBOX_ID}
                  role="listbox"
                  aria-label="Applications"
                  className="max-h-[46vh] overflow-y-auto"
                >
                  {filteredApps.map((app, index) => {
                    const selected = index === selectedIndex
                    return (
                      <button
                        key={app.id}
                        id={optionId(app.id)}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => open(app.id)}
                        onMouseMove={() => setSelectedIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors",
                          selected ? "glass-tint-accent" : "hover:bg-muted/40",
                        )}
                      >
                        <img
                          src={app.icon}
                          alt=""
                          aria-hidden="true"
                          className="h-7 w-7 shrink-0 object-contain"
                        />
                        <span className={cn("text-[15px]", selected ? "lg-vibrant" : "text-foreground")}>
                          {app.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mx-3 border-t border-border/60" />
              <div className="px-5 py-6 text-center text-[15px] text-muted-foreground">
                No results for &ldquo;{query.trim()}&rdquo;
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
