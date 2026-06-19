"use client"

import type React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  ArrowLeft, ArrowRight, RefreshCw, Plus, Lock, Share, Copy, ExternalLink, House, Globe, Instagram, WifiOff,
} from "lucide-react"
import { useSystem } from "@/components/system-provider"
import { cn } from "@/lib/utils"

interface SafariProps {
  isDarkMode?: boolean
}

interface SiteLink {
  title: string
  url: string
  icon?: string
  Icon?: React.ComponentType<{ className?: string }>
  iconWrap?: string
}

/** Personal links — external profiles that block embedding, so they open in a new tab. */
const socialLinks: SiteLink[] = [
  { title: "GitHub", url: "https://github.com/apple-techie", icon: "/github.png" },
  { title: "X", url: "https://x.com/apple_techie", icon: "/twitter-icon.png" },
  {
    title: "Instagram",
    url: "https://instagram.com/appletechie",
    Icon: Instagram,
    iconWrap: "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white ring-0",
  },
  { title: "Spotify", url: "https://open.spotify.com/user/12137031642", icon: "/spotify.png" },
  { title: "Email", url: "mailto:mail@appletechie.dev", icon: "/mail.png" },
]

/** Sites that allow embedding — these load inside the browser frame. */
const quickLinks: { title: string; url: string }[] = [
  { title: "appletechie.dev", url: "https://appletechie.dev" },
  { title: "Wikipedia", url: "https://en.wikipedia.org/wiki/MacOS" },
  { title: "MDN", url: "https://developer.mozilla.org" },
  { title: "Hacker News", url: "https://news.ycombinator.com" },
  { title: "Example", url: "https://example.com" },
  { title: "Open-Meteo", url: "https://open-meteo.com" },
]

/** Resolve address-bar input to a URL to load, or a search query to open externally. */
function resolveInput(input: string): { url: string | null; search: string | null } {
  const t = input.trim()
  if (!t) return { url: null, search: null }
  if (/^https?:\/\//i.test(t)) return { url: t, search: null }
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t)) return { url: `https://${t}`, search: null }
  return { url: null, search: t }
}

function SiteTile({ site, onClick }: { site: SiteLink; onClick?: (url: string) => void }) {
  const inner = (
    <>
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center overflow-hidden rounded-[14px] shadow-glass-sm ring-1 ring-black/5",
          site.iconWrap ?? "bg-white",
        )}
      >
        {site.Icon ? (
          <site.Icon className="h-7 w-7" />
        ) : (
          <img src={site.icon || "/placeholder.svg"} alt="" aria-hidden className="h-8 w-8 object-contain" draggable={false} />
        )}
      </span>
      <span className="text-xs font-medium text-foreground/90">{site.title}</span>
    </>
  )
  const cls = "glass-interactive lg-focus group flex flex-col items-center gap-2 rounded-tile p-3 text-center outline-none"
  if (onClick) {
    return (
      <button type="button" className={cls} aria-label={`Open ${site.title}`} onClick={() => onClick(site.url)}>
        {inner}
      </button>
    )
  }
  return (
    <a href={site.url} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`Open ${site.title}`}>
      {inner}
    </a>
  )
}

const toolBtn =
  "lg-focus flex h-7 w-7 items-center justify-center rounded-[7px] text-foreground/75 outline-none transition-colors hover:bg-foreground/10 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"

export default function Safari(_props: SafariProps) {
  const { wifiEnabled } = useSystem()
  const [address, setAddress] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [index, setIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = index >= 0 ? history[index] : null
  const canBack = index > 0
  const canForward = index >= 0 && index < history.length - 1

  const loadUrl = useCallback(
    (url: string) => {
      setHistory((prev) => {
        const trimmed = prev.slice(0, index + 1)
        trimmed.push(url)
        setIndex(trimmed.length - 1)
        return trimmed
      })
      setAddress(url)
      setLoading(true)
    },
    [index],
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const { url, search } = resolveInput(address)
    if (url) loadUrl(url)
    else if (search) window.open(`https://www.google.com/search?q=${encodeURIComponent(search)}`, "_blank", "noopener")
    inputRef.current?.blur()
  }

  const goBack = () => {
    if (!canBack) return
    const i = index - 1
    setIndex(i)
    setAddress(history[i])
    setLoading(true)
  }
  const goForward = () => {
    if (!canForward) return
    const i = index + 1
    setIndex(i)
    setAddress(history[i])
    setLoading(true)
  }
  const reload = () => {
    if (current) {
      setLoading(true)
      setReloadKey((k) => k + 1)
    }
  }
  const goHome = () => {
    setIndex(-1)
    setAddress("")
  }
  const openExternal = () => {
    if (current) window.open(current, "_blank", "noopener")
  }

  const iframeKey = useMemo(() => `${current}#${reloadKey}`, [current, reloadKey])

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Toolbar */}
      <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-border/60 bg-background/70 px-3 py-2 backdrop-blur-xl">
        <button type="button" aria-label="Back" className={toolBtn} disabled={!canBack} onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Forward" className={toolBtn} disabled={!canForward} onClick={goForward}>
          <ArrowRight className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Home" className={toolBtn} onClick={goHome}>
          <House className="h-4 w-4" />
        </button>

        <form
          className="mx-1.5 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[9px] bg-foreground/[0.06] px-3 transition-colors focus-within:bg-foreground/[0.09]"
          onSubmit={submit}
        >
          <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Search or enter website name"
            aria-label="Address and search bar"
            spellCheck={false}
            autoComplete="off"
            className="w-full min-w-0 bg-transparent text-center text-[13px] text-foreground placeholder:text-muted-foreground focus:text-left focus:outline-none"
          />
          <button
            type="button"
            aria-label="Reload"
            onClick={reload}
            disabled={!current}
            className="lg-focus -mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground disabled:opacity-30"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </form>

        <button type="button" aria-label="Open in new tab" className={toolBtn} disabled={!current} onClick={openExternal}>
          <ExternalLink className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Share" className={toolBtn}>
          <Share className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Show all tabs" className={toolBtn}>
          <Copy className="h-4 w-4" />
        </button>
      </div>

      {/* Tab strip */}
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-border/50 bg-background/40 px-2 py-1 backdrop-blur-md">
        <div className="flex h-7 max-w-[260px] items-center gap-2 rounded-[7px] bg-foreground/[0.07] px-3 text-[13px]">
          <Globe className="h-3.5 w-3.5 shrink-0 text-foreground/60" aria-hidden />
          <span className="truncate text-foreground/90">{current ? new URL(current).hostname : "Start Page"}</span>
        </div>
        <button type="button" aria-label="New tab" className={cn(toolBtn, "h-7 w-7")} onClick={goHome}>
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {!wifiEnabled ? (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <div className="glass-thick mb-6 flex h-24 w-24 items-center justify-center rounded-full">
              <WifiOff className="h-11 w-11 text-muted-foreground" aria-hidden />
            </div>
            <h2 className="mb-2 text-xl font-semibold">You Are Not Connected to the Internet</h2>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
              Turn on Wi-Fi from Control Center to reconnect.
            </p>
          </div>
        ) : current ? (
          <>
            <iframe
              key={iframeKey}
              src={current}
              title="Browser"
              className="h-full w-full border-0 bg-white"
              referrerPolicy="no-referrer"
              onLoad={() => setLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
            {/* Embedding hint — many large sites block being framed (X-Frame-Options). */}
            <button
              type="button"
              onClick={openExternal}
              className="glass-thin lg-focus absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 shadow-glass-sm outline-none transition hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Blank page? Open in new tab
            </button>
          </>
        ) : (
          <div className="h-full overflow-auto">
            <div className="mx-auto max-w-3xl px-8 py-10">
              <h2 className="mb-5 text-2xl font-bold tracking-tight">Favorites</h2>
              <div className="mb-12 grid grid-cols-4 gap-3 sm:grid-cols-6">
                {socialLinks.map((link) => (
                  <SiteTile key={link.title} site={link} />
                ))}
              </div>

              <h2 className="mb-5 text-2xl font-bold tracking-tight">Quick Links</h2>
              <div className="mb-12 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {quickLinks.map((site) => (
                  <SiteTile
                    key={site.title}
                    site={{ title: site.title, url: site.url, Icon: Globe, iconWrap: "bg-muted text-foreground/70" }}
                    onClick={loadUrl}
                  />
                ))}
              </div>

              <div className="glass rounded-sheet p-6">
                <h3 className="mb-3 text-xl font-semibold">apple-techie — Portfolio</h3>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  Type a URL above and press Enter to browse — pages load right here. Some large sites (Google, YouTube,
                  X) block embedding; use the ↗ button to open those in a new tab.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => loadUrl("https://appletechie.dev")}
                    className="glass-interactive glass-tint-accent lg-focus inline-flex rounded-control px-4 py-2 text-sm font-medium text-foreground outline-none"
                  >
                    Open appletechie.dev
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
