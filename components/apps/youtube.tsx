"use client"

import { useState } from "react"
import { Play, ExternalLink, Bell, CheckCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface YouTubeProps {
  isDarkMode?: boolean
}

const CHANNEL_URL = "https://www.youtube.com/@apple-techie"

interface Video {
  id: string
  title: string
  meta: string
  duration: string
  gradient: string
}

const VIDEOS: Video[] = [
  {
    id: "dQw4w9WgXcQ",
    title: "Building a macOS Tahoe Portfolio with Next.js & Liquid Glass",
    meta: "12K views · 3 weeks ago",
    duration: "18:42",
    gradient: "from-[#ff6b6b] via-[#ee5253] to-[#b71540]",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Designing Liquid Glass UI — Vibrancy, Blur & Depth in CSS",
    meta: "8.3K views · 1 month ago",
    duration: "24:09",
    gradient: "from-[#4facfe] via-[#3a7bd5] to-[#1e3c72]",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "React 19 + App Router: Patterns I Use on Every Project",
    meta: "21K views · 2 months ago",
    duration: "31:55",
    gradient: "from-[#a18cd1] via-[#8e44ad] to-[#5b2c6f]",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Tailwind Design Systems — Semantic Tokens Done Right",
    meta: "5.7K views · 2 months ago",
    duration: "14:20",
    gradient: "from-[#43e97b] via-[#1abc9c] to-[#0e6655]",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Animating Interfaces with Spring Physics & Reduced Motion",
    meta: "9.9K views · 3 months ago",
    duration: "20:13",
    gradient: "from-[#f6d365] via-[#f39c12] to-[#b9770e]",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "From Figma to Production: My UI/UX Handoff Workflow",
    meta: "16K views · 4 months ago",
    duration: "27:48",
    gradient: "from-[#ff9a9e] via-[#e84393] to-[#9b1b5b]",
  },
]

export default function YouTube({ isDarkMode = true }: YouTubeProps) {
  const [subscribed, setSubscribed] = useState(false)
  const [activeVideo, setActiveVideo] = useState<number | null>(null)

  return (
    <div className="h-full flex flex-col bg-background text-foreground font-sf">
      {/* Channel header */}
      <header className="relative shrink-0">
        {/* Banner */}
        <div className="h-28 w-full bg-gradient-to-r from-[#ff0033] via-[#cc0027] to-[#7a0017] sm:h-32">
          <div className="absolute inset-0 h-28 bg-[radial-gradient(120%_120%_at_15%_-20%,rgba(255,255,255,0.35),transparent_60%)] sm:h-32" />
        </div>

        <div className="flex flex-col gap-4 px-5 pb-4 pt-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="-mt-12 grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff4d4d] to-[#b71540] text-2xl font-bold text-white shadow-glass ring-4 ring-background sm:h-24 sm:w-24">
              DP
            </div>
            <div className="pb-1">
              <h1 className="flex items-center gap-1.5 text-lg font-semibold leading-tight sm:text-xl">
                apple-techie
              </h1>
              <p className="text-sm text-muted-foreground">
                @apple-techie · 42.1K subscribers · 128 videos
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Frontend developer &amp; UI/UX designer. Building delightful, accessible interfaces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:pb-1">
            <button
              type="button"
              onClick={() => setSubscribed((s) => !s)}
              aria-pressed={subscribed}
              className={cn(
                "lg-focus glass-interactive inline-flex items-center gap-1.5 rounded-chrome px-4 py-2 text-sm font-semibold transition-colors",
                subscribed
                  ? "glass text-foreground"
                  : "bg-[#ff0033] text-white hover:bg-[#e60030]",
              )}
            >
              {subscribed ? (
                <>
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  Subscribed
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  Subscribe
                </>
              )}
            </button>

            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lg-focus glass glass-interactive inline-flex items-center gap-1.5 rounded-chrome px-4 py-2 text-sm font-semibold text-foreground"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open channel on YouTube
            </a>
          </div>
        </div>

        <div className="border-b border-border px-5">
          <nav className="flex gap-6 text-sm" aria-label="Channel sections">
            <span className="border-b-2 border-foreground pb-2 font-medium text-foreground">Videos</span>
            <span className="pb-2 text-muted-foreground">Playlists</span>
            <span className="pb-2 text-muted-foreground">About</span>
          </nav>
        </div>
      </header>

      {/* Video grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <ul className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((video, i) => {
            const isActive = activeVideo === i
            return (
              <li key={i} className="lg-flex">
                <article className="flex flex-col gap-2">
                  {/* Thumbnail */}
                  <div className="group relative aspect-video w-full overflow-hidden rounded-tile shadow-glass">
                    {isActive ? (
                      <>
                        <iframe
                          className="h-full w-full"
                          src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
                          title={video.title}
                          loading="lazy"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        <button
                          type="button"
                          onClick={() => setActiveVideo(null)}
                          aria-label="Close video"
                          className="lg-focus glass-chrome absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full text-white"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveVideo(i)}
                        aria-label={`Play ${video.title}`}
                        className={cn(
                          "lg-focus relative block h-full w-full bg-gradient-to-br text-left",
                          video.gradient,
                        )}
                      >
                        <span className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,rgba(255,255,255,0.28),transparent_55%)]" />
                        <span className="lg-text-scrim absolute left-3 top-3 text-xs font-semibold uppercase tracking-wide">
                          apple-techie
                        </span>
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="glass-chrome grid h-12 w-12 place-items-center rounded-full text-white transition-transform duration-200 ease-spring group-hover:scale-110">
                            <Play className="h-5 w-5 translate-x-px fill-current" aria-hidden="true" />
                          </span>
                        </span>
                        <span className="lg-text-scrim absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium tabular-nums">
                          {video.duration}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Title + meta */}
                  <div className="flex flex-col gap-0.5">
                    <a
                      href={CHANNEL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lg-focus line-clamp-2 rounded-control text-sm font-medium leading-snug text-foreground hover:text-muted-foreground"
                    >
                      {video.title}
                    </a>
                    <p className="text-xs text-muted-foreground">{video.meta}</p>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>

        {/* Footer CTA */}
        <div className="mt-8 flex justify-center">
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="lg-focus glass glass-interactive inline-flex items-center gap-2 rounded-chrome px-5 py-2.5 text-sm font-semibold text-foreground"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            See all videos on YouTube
          </a>
        </div>
      </div>
    </div>
  )
}
