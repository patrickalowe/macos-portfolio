"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, RefreshCw, Home, Star, Plus, Lock, Share, BookOpen, WifiOff } from "lucide-react"
import { useSystem } from "@/components/system-provider"
import { cn } from "@/lib/utils"

interface SafariProps {
  isDarkMode?: boolean
}

interface SiteLink {
  title: string
  url: string
  icon: string
}

const socialLinks: SiteLink[] = [
  { title: "LinkedIn", url: "https://www.linkedin.com/in/daniel-prior-53a679195/", icon: "/linkedin.png" },
  { title: "GitHub", url: "https://github.com/daprior", icon: "/github.png" },
  { title: "YouTube", url: "https://www.youtube.com/@DanielPrior0", icon: "/youtube.png" },
  { title: "Email", url: "mailto:mail@danielprior.dk", icon: "/mail.png" },
]

const frequentlyVisited: SiteLink[] = [
  { title: "GitHub", url: "https://github.com", icon: "/github.png" },
  { title: "LinkedIn", url: "https://linkedin.com", icon: "/linkedin.png" },
  { title: "YouTube", url: "https://youtube.com", icon: "/youtube.png" },
  { title: "Reddit", url: "https://reddit.com", icon: "/reddit.png" },
  { title: "ChatGPT", url: "https://chatgpt.com", icon: "/chatgpt.png" },
  { title: "Stack Overflow", url: "https://stackoverflow.com", icon: "/stackoverflow.png" },
]

function SiteTile({ site }: { site: SiteLink }) {
  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-interactive lg-focus group flex flex-col items-center gap-2 rounded-tile p-4 text-center outline-none"
      aria-label={`Open ${site.title}`}
    >
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-tile bg-white shadow-glass-sm ring-1 ring-black/5">
        <img
          src={site.icon || "/placeholder.svg"}
          alt=""
          aria-hidden="true"
          className="h-8 w-8 object-contain"
          draggable={false}
        />
      </span>
      <span className="text-xs font-medium text-foreground/90">{site.title}</span>
    </a>
  )
}

export default function Safari(_props: SafariProps) {
  const { wifiEnabled } = useSystem()
  const [url, setUrl] = useState("danielprior.dev")
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = () => {
    setIsLoading(true)
    window.setTimeout(() => setIsLoading(false), 900)
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Toolbar */}
      <div className="glass-chrome z-10 flex items-center gap-1.5 border-b border-border/60 px-3 py-2">
        <button
          type="button"
          aria-label="Go back"
          disabled
          className="glass-interactive lg-focus flex h-8 w-8 items-center justify-center rounded-control text-muted-foreground/50 outline-none disabled:cursor-default disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Go forward"
          disabled
          className="glass-interactive lg-focus flex h-8 w-8 items-center justify-center rounded-control text-muted-foreground/50 outline-none disabled:cursor-default disabled:opacity-40"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Reload page"
          onClick={handleRefresh}
          className="glass-interactive lg-focus flex h-8 w-8 items-center justify-center rounded-control text-foreground/80 outline-none"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </button>
        <button
          type="button"
          aria-label="Home"
          className="glass-interactive lg-focus flex h-8 w-8 items-center justify-center rounded-control text-foreground/80 outline-none"
        >
          <Home className="h-4 w-4" />
        </button>

        {/* Address bar */}
        <form
          className="glass-thin mx-1 flex h-8 flex-1 items-center gap-2 rounded-control px-3"
          onSubmit={(e) => e.preventDefault()}
        >
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Address and search bar"
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </form>

        <button
          type="button"
          aria-label="Share"
          className="glass-interactive lg-focus flex h-8 w-8 items-center justify-center rounded-control text-foreground/80 outline-none"
        >
          <Share className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Add bookmark"
          className="glass-interactive lg-focus flex h-8 w-8 items-center justify-center rounded-control text-foreground/80 outline-none"
        >
          <Star className="h-4 w-4" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="glass-chrome flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
        <div className="glass-tint-accent flex max-w-[220px] items-center gap-2 rounded-control px-3 py-1.5 text-sm">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-foreground/70" aria-hidden="true" />
          <span className="truncate text-foreground/90">Start Page</span>
          <button
            type="button"
            aria-label="Close tab"
            className="lg-focus flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <span className="text-[13px] leading-none">×</span>
          </button>
        </div>
        <button
          type="button"
          aria-label="New tab"
          className="glass-interactive lg-focus flex h-7 w-7 items-center justify-center rounded-control text-foreground/70 outline-none"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!wifiEnabled ? (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <div className="glass-thick mb-6 flex h-24 w-24 items-center justify-center rounded-full">
              <WifiOff className="h-11 w-11 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">You Are Not Connected to the Internet</h2>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
              This page can&apos;t be displayed because your computer is currently offline. Turn on Wi-Fi from Control
              Center to reconnect.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="glass-interactive glass-tint-accent lg-focus rounded-control px-5 py-2 text-sm font-medium text-foreground outline-none"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-8 py-10">
            <h2 className="lg-vibrant mb-5 text-2xl font-bold tracking-tight">SNS Links</h2>
            <div className="mb-12 grid grid-cols-4 gap-4 sm:grid-cols-7">
              {socialLinks.map((link) => (
                <SiteTile key={link.title} site={link} />
              ))}
            </div>

            <h2 className="lg-vibrant mb-5 text-2xl font-bold tracking-tight">Frequently Visited</h2>
            <div className="mb-12 grid grid-cols-3 gap-4 sm:grid-cols-6">
              {frequentlyVisited.map((site) => (
                <SiteTile key={site.title} site={site} />
              ))}
            </div>

            <div className="glass rounded-sheet p-6 shadow-glass-sm">
              <h3 className="mb-3 text-xl font-semibold text-foreground">Daniel Prior — Portfolio</h3>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                Welcome to my portfolio. I&apos;m a frontend developer specializing in beautiful, responsive, and
                user-friendly web applications.
              </p>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                With expertise in React, Next.js, TypeScript, and modern CSS frameworks, I build performant web
                experiences that users love.
              </p>
              <div className="flex justify-end">
                <a
                  href="https://danielprior.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-interactive glass-tint-accent lg-focus inline-flex rounded-control px-4 py-2 text-sm font-medium text-foreground outline-none"
                >
                  View Projects
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
