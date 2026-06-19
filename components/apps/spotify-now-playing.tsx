"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Music2, AlertCircle, RotateCcw, Loader2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import type { SpotifyResponse, SpotifyTrack } from "@/lib/api/types"
import { cn } from "@/lib/utils"

const GREEN = "#1db954"

function relativeTime(iso?: string): string {
  if (!iso) return ""
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Math.max(0, Date.now() - then)
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmt(ms?: number): string {
  if (!ms || ms < 0) return "0:00"
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function Cover({ src, className, big }: { src?: string; className?: string; big?: boolean }) {
  const [err, setErr] = useState(false)
  if (src && !err) {
    return <img src={src} alt="" aria-hidden className={cn("object-cover", className)} onError={() => setErr(true)} />
  }
  return (
    <div className={cn("flex items-center justify-center bg-gradient-to-br from-[#1db954]/40 to-emerald-700/40", className)}>
      <Music2 className={big ? "h-12 w-12 text-white/80" : "h-5 w-5 text-white/70"} strokeWidth={1.5} />
    </div>
  )
}

function Header({ profileUrl, live }: { profileUrl: string; live: boolean }) {
  return (
    <header className="glass-chrome flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <img src="/spotify.png" alt="" aria-hidden className="h-6 w-6 rounded-control" />
        <h1 className="text-sm font-semibold">Spotify</h1>
        {live && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: GREEN }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: GREEN }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: GREEN }} />
            </span>
            Now playing
          </span>
        )}
      </div>
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="lg-focus inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white outline-none transition-opacity hover:opacity-90"
        style={{ background: GREEN }}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open in Spotify
      </a>
    </header>
  )
}

export default function SpotifyNowPlaying() {
  const { data, error, loading, refetch } = useApi<SpotifyResponse>("/api/spotify", { pollMs: 30000 })
  const profileUrl = data?.profileUrl || "https://open.spotify.com/user/12137031642"

  // Smoothly advance the progress bar between polls while playing.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!data?.isPlaying) return
    const id = setInterval(() => setTick((t) => t + 1000), 1000)
    return () => clearInterval(id)
  }, [data?.isPlaying, data?.track?.url])

  if (loading) {
    return (
      <div className="flex h-full flex-col bg-background text-foreground">
        <Header profileUrl={profileUrl} live={false} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="h-48 w-48 animate-pulse rounded-tile bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col bg-background text-foreground">
        <Header profileUrl={profileUrl} live={false} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
          <p className="max-w-xs text-sm text-muted-foreground">{error}</p>
          <button type="button" onClick={refetch} className="glass-interactive lg-focus inline-flex items-center gap-2 rounded-control px-3.5 py-1.5 text-sm font-medium">
            <RotateCcw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    )
  }

  // Not connected — honest empty state (no fake "now playing").
  if (!data?.configured) {
    return (
      <div className="flex h-full flex-col bg-background text-foreground">
        <Header profileUrl={profileUrl} live={false} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${GREEN}22` }}>
            <Music2 className="h-9 w-9" style={{ color: GREEN }} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-base font-semibold">Spotify isn’t connected yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Add Spotify API credentials to show what I’m currently listening to. For now, here’s the profile.
            </p>
          </div>
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="lg-focus inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white outline-none" style={{ background: GREEN }}>
            <ExternalLink className="h-4 w-4" /> Open my Spotify
          </a>
        </div>
      </div>
    )
  }

  const track: SpotifyTrack | null = data.track
  const progress = Math.min(track?.durationMs ?? 0, (track?.progressMs ?? 0) + (data.isPlaying ? tick : 0))
  const pct = track?.durationMs ? Math.min(100, (progress / track.durationMs) * 100) : 0
  const recent = data.recent.filter((r) => !track || r.playedAt) // recent history rows

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <Header profileUrl={profileUrl} live={data.isPlaying} />

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Now playing / last played */}
        <section className="relative flex flex-1 flex-col items-center justify-center gap-5 p-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1db954]/20 via-[#1db954]/5 to-transparent" />
          <a
            href={track?.url || profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="lg-focus relative aspect-square w-48 max-w-[60%] overflow-hidden rounded-tile shadow-glass-lg sm:w-56"
          >
            <Cover src={track?.albumArt} className="h-full w-full rounded-tile" big />
          </a>

          <div className="relative z-10 max-w-full text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: GREEN }}>
              {data.isPlaying ? "Now Playing" : track?.playedAt ? `Last played · ${relativeTime(track.playedAt)}` : "Recently Played"}
            </p>
            <h2 className="mt-1 truncate text-xl font-bold">{track?.title ?? "Nothing playing"}</h2>
            <p className="truncate text-sm text-muted-foreground">{track?.artist}</p>
            {track?.album && <p className="truncate text-xs text-muted-foreground/70">{track.album}</p>}
          </div>

          {track?.durationMs ? (
            <div className="relative z-10 w-full max-w-md">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/15">
                <div className="h-full rounded-full transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%`, background: GREEN }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
                <span>{fmt(progress)}</span>
                <span>{fmt(track.durationMs)}</span>
              </div>
            </div>
          ) : null}
        </section>

        {/* Recently played */}
        <aside className="glass-thin flex w-full shrink-0 flex-col border-t border-border/60 md:w-80 md:border-l md:border-t-0">
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recently Played</div>
          {recent.length === 0 ? (
            <p className="px-4 pb-4 text-xs text-muted-foreground">No recent tracks.</p>
          ) : (
            <ul className="flex-1 overflow-y-auto px-2 pb-3">
              {recent.map((t, i) => (
                <li key={`${t.url}-${i}`}>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lg-focus flex items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-muted/60"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-control">
                      <Cover src={t.albumArt} className="h-full w-full rounded-control" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
                    </div>
                    {t.playedAt && (
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{relativeTime(t.playedAt)}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
