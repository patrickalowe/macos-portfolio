"use client"

import type React from "react"
import { useState } from "react"
import { ArrowLeft, ArrowRight, RefreshCw, Sidebar, Plus, Lock, Share, Copy, BookOpen, WifiOff, Instagram } from "lucide-react"
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

const socialLinks: SiteLink[] = [
  { title: "GitHub", url: "https://github.com/apple-techie", icon: "/github.png" },
  { title: "X", url: "https://x.com/apple_techie", icon: "/twitter-icon.png" },
  {
    title: "Instagram",
    url: "https://instagram.com/appletechie",
    Icon: Instagram,
    iconWrap: "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white ring-0",
  },
  { title: "Email", url: "mailto:mail@appletechie.dev", icon: "/mail.png" },
]

const frequentlyVisited: SiteLink[] = [
  { title: "GitHub", url: "https://github.com", icon: "/github.png" },
  { title: "X", url: "https://x.com", icon: "/twitter-icon.png" },
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
      className="glass-interactive lg-focus group flex flex-col items-center gap-2 rounded-tile p-3 text-center outline-none"
      aria-label={`Open ${site.title}`}
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center overflow-hidden rounded-[14px] shadow-glass-sm ring-1 ring-black/5",
          site.iconWrap ?? "bg-white",
        )}
      >
        {site.Icon ? (
          <site.Icon className="h-7 w-7" />
        ) : (
          <img
            src={site.icon || "/placeholder.svg"}
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain"
            draggable={false}
          />
        )}
      </span>
      <span className="text-xs font-medium text-foreground/90">{site.title}</span>
    </a>
  )
}

const toolBtn =
  "lg-focus flex h-7 w-7 items-center justify-center rounded-[7px] text-foreground/75 outline-none transition-colors hover:bg-foreground/10 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"

export default function Safari(_props: SafariProps) {
  const { wifiEnabled } = useSystem()
  const [url, setUrl] = useState("appletechie.dev")
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = () => {
    setIsLoading(true)
    window.setTimeout(() => setIsLoading(false), 900)
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Unified toolbar — flat translucent bar, no rounded dock material */}
      <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-border/60 bg-background/70 px-3 py-2 backdrop-blur-xl">
        <button type="button" aria-label="Show sidebar" className={toolBtn}>
          <Sidebar className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Go back" disabled className={toolBtn}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Go forward" disabled className={toolBtn}>
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Address bar — centered rounded pill */}
        <form
          className="mx-1.5 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[9px] bg-foreground/[0.06] px-3 transition-colors focus-within:bg-foreground/[0.09]"
          onSubmit={(e) => e.preventDefault()}
        >
          <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Address and search bar"
            spellCheck={false}
            autoComplete="off"
            className="w-full min-w-0 bg-transparent text-center text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            aria-label="Reload page"
            onClick={handleRefresh}
            className="lg-focus -mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </button>
        </form>

        <button type="button" aria-label="Share" className={toolBtn}>
          <Share className="h-4 w-4" />
        </button>
        <button type="button" aria-label="New tab" className={toolBtn}>
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Show all tabs" className={toolBtn}>
          <Copy className="h-4 w-4" />
        </button>
      </div>

      {/* Tab strip — thin, flat, lighter than the toolbar */}
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-border/50 bg-background/40 px-2 py-1 backdrop-blur-md">
        <div className="flex h-7 max-w-[240px] items-center gap-2 rounded-[7px] bg-foreground/[0.07] px-3 text-[13px]">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-foreground/60" aria-hidden="true" />
          <span className="truncate text-foreground/90">Start Page</span>
          <span
            role="button"
            aria-label="Close tab"
            tabIndex={0}
            className="lg-focus ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/15 hover:text-foreground"
          >
            <span className="text-[13px] leading-none">×</span>
          </span>
        </div>
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
            <h2 className="mb-5 text-2xl font-bold tracking-tight text-foreground">Favorites</h2>
            <div className="mb-12 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {socialLinks.map((link) => (
                <SiteTile key={link.title} site={link} />
              ))}
            </div>

            <h2 className="mb-5 text-2xl font-bold tracking-tight text-foreground">Frequently Visited</h2>
            <div className="mb-12 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {frequentlyVisited.map((site) => (
                <SiteTile key={site.title} site={site} />
              ))}
            </div>

            <div className="glass rounded-sheet p-6">
              <h3 className="mb-3 text-xl font-semibold text-foreground">apple-techie — Portfolio</h3>
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
                  href="https://appletechie.dev"
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
