"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Music2,
  ListMusic,
  AlertCircle,
  RotateCcw,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import type { Track, TracksResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export type MediaAccent = "spotify" | "apple"

interface AccentConfig {
  /** brand name shown in the chrome */
  name: string
  /** brand logo in /public */
  logo: string
  /** CSS color used for the seek/volume fill + active accents (canvas/inline only) */
  color: string
  /** subtle wash behind the now-playing artwork */
  wash: string
  /** optional link to the owner's profile on the service */
  profileUrl?: string
}

const ACCENTS: Record<MediaAccent, AccentConfig> = {
  spotify: {
    name: "Spotify",
    logo: "/spotify.png",
    color: "#1db954",
    wash: "from-[#1db954]/25 via-[#1db954]/5 to-transparent",
    profileUrl: "https://open.spotify.com/user/12137031642",
  },
  apple: {
    name: "Music",
    logo: "/letter-d.png",
    color: "#fa2d6c",
    wash: "from-[#fa2d6c]/25 via-[#fa57a6]/8 to-transparent",
  },
}

/** Deterministic gradient seed from a track id, for the fallback artwork tile. */
const FALLBACK_GRADIENTS = [
  "from-rose-400 to-indigo-500",
  "from-amber-400 to-pink-500",
  "from-emerald-400 to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-sky-400 to-blue-600",
  "from-orange-400 to-rose-500",
]

function gradientFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length]
}

function formatTime(time: number): string {
  if (!Number.isFinite(time) || time < 0) return "0:00"
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
}

interface ArtworkProps {
  track: Track | undefined
  className?: string
  rounded?: string
}

function Artwork({ track, className, rounded = "rounded-tile" }: ArtworkProps) {
  const [errored, setErrored] = useState(false)
  useEffect(() => setErrored(false), [track?.cover])

  if (track?.cover && !errored) {
    return (
      <img
        src={track.cover || "/placeholder.svg"}
        alt=""
        aria-hidden="true"
        onError={() => setErrored(true)}
        className={cn("h-full w-full object-cover", rounded, className)}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br text-white/80",
        rounded,
        track ? gradientFor(track.id) : "from-muted to-muted",
        className,
      )}
    >
      <Music2 className="h-1/3 w-1/3" strokeWidth={1.5} />
    </div>
  )
}

export interface MediaPlayerProps {
  isDarkMode?: boolean
  accent: MediaAccent
}

export default function MediaPlayer({ accent }: MediaPlayerProps) {
  const cfg = ACCENTS[accent]
  const { data, error, loading, isMock, refetch } = useApi<TracksResponse>("/api/tracks")
  const tracks = useMemo<Track[]>(() => data?.tracks ?? [], [data])

  const audioRef = useRef<HTMLAudioElement>(null)
  /** set true ONLY when the user explicitly wants playback to begin on the
   *  newly-loaded track (next/prev/select). Consumed inside canplaythrough. */
  const shouldAutoPlayRef = useRef(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.75)
  const [isMuted, setIsMuted] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [isSeeking, setIsSeeking] = useState(false)

  const currentTrack = tracks[currentIndex]

  // Clamp the index if the playlist shrinks between fetches.
  useEffect(() => {
    if (tracks.length > 0 && currentIndex >= tracks.length) {
      setCurrentIndex(0)
    }
  }, [tracks.length, currentIndex])

  const goToTrack = useCallback(
    (index: number, autoPlay: boolean) => {
      if (tracks.length === 0) return
      const next = ((index % tracks.length) + tracks.length) % tracks.length
      shouldAutoPlayRef.current = autoPlay
      setAudioError(null)
      if (next === currentIndex) {
        // Re-selecting the active track toggles playback rather than reloading.
        const audio = audioRef.current
        if (!audio) return
        if (audio.paused) {
          audio.play().catch(() => setIsPlaying(false))
        } else {
          audio.pause()
        }
        return
      }
      setCurrentTime(0)
      setDuration(0)
      setCurrentIndex(next)
    },
    [tracks.length, currentIndex],
  )

  const handleNext = useCallback(() => goToTrack(currentIndex + 1, true), [goToTrack, currentIndex])
  const handlePrev = useCallback(() => {
    // If we're more than 3s into a track, restart it instead of skipping back.
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    goToTrack(currentIndex - 1, true)
  }, [goToTrack, currentIndex])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    setAudioError(null)
    if (audio.paused) {
      shouldAutoPlayRef.current = true
      const p = audio.play()
      if (p) p.catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [currentTrack])

  // Wire the single <audio> element. Re-runs when the source track changes.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const onTime = () => {
      if (!isSeeking) setCurrentTime(audio.currentTime)
    }
    const onLoadedMeta = () => setDuration(audio.duration || currentTrack.durationSec || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      if (tracks.length > 1) goToTrack(currentIndex + 1, true)
      else setIsPlaying(false)
    }
    const onCanPlayThrough = () => {
      // Trigger autoplay HERE — never via a setTimeout reading stale state.
      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false
        const p = audio.play()
        if (p) p.catch(() => setIsPlaying(false))
      }
    }
    const onError = () => {
      setAudioError("Couldn’t load this track.")
      setIsPlaying(false)
      shouldAutoPlayRef.current = false
    }

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onLoadedMeta)
    audio.addEventListener("durationchange", onLoadedMeta)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("canplaythrough", onCanPlayThrough)
    audio.addEventListener("error", onError)

    audio.load()

    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onLoadedMeta)
      audio.removeEventListener("durationchange", onLoadedMeta)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("canplaythrough", onCanPlayThrough)
      audio.removeEventListener("error", onError)
    }
  }, [currentTrack?.src, currentTrack?.id, currentIndex, tracks.length, goToTrack, isSeeking, currentTrack])

  // Keep element volume in sync.
  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  // Pause + release audio on unmount.
  useEffect(() => {
    const audio = audioRef.current
    return () => {
      if (audio) {
        audio.pause()
        audio.removeAttribute("src")
        audio.load()
      }
    }
  }, [])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value)
    setCurrentTime(value)
  }
  const commitSeek = () => {
    const audio = audioRef.current
    if (audio && Number.isFinite(currentTime)) {
      try {
        audio.currentTime = currentTime
      } catch {
        /* ignore out-of-range seeks */
      }
    }
    setIsSeeking(false)
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number.parseFloat(e.target.value)
    setVolume(v)
    setIsMuted(v === 0)
  }

  const seekPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const volPct = (isMuted ? 0 : volume) * 100
  const fillStyle = (pct: number): React.CSSProperties => ({
    background: `linear-gradient(to right, ${cfg.color} 0%, ${cfg.color} ${pct}%, color-mix(in srgb, currentColor 18%, transparent) ${pct}%, color-mix(in srgb, currentColor 18%, transparent) 100%)`,
  })

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  /* --------------------------------------------------------- chrome header -- */
  const header = (
    <header className="glass-chrome flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <img src={cfg.logo || "/placeholder.svg"} alt="" aria-hidden="true" className="h-6 w-6 rounded-control" />
        <h1 className="text-sm font-semibold text-foreground">{cfg.name}</h1>
      </div>
      <div className="flex items-center gap-2">
        {isMock && (
          <span
            className="glass-thin inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            title="Served from realistic fallback data"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} aria-hidden="true" />
            Demo data
          </span>
        )}
        {cfg.profileUrl && (
          <a
            href={cfg.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="lg-focus inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white outline-none transition-opacity hover:opacity-90"
            style={{ background: cfg.color }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in {cfg.name}
          </a>
        )}
      </div>
    </header>
  )

  /* ---------------------------------------------------------------- states -- */
  if (loading) {
    return (
      <div className="flex h-full flex-col bg-background text-foreground">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="h-44 w-44 animate-pulse rounded-tile bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <Loader2 className="mt-2 h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Loading library…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col bg-background text-foreground">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="max-w-xs text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="glass-interactive lg-focus inline-flex items-center gap-2 rounded-control px-3.5 py-1.5 text-sm font-medium text-foreground"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="flex h-full flex-col bg-background text-foreground">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <ListMusic className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Your library is empty</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Drop an audio file into <span className="font-mono">/public</span> to start listening.
          </p>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------- main view -- */
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {header}

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Now playing */}
        <section className="relative flex flex-1 flex-col items-center justify-center gap-5 p-6">
          <div
            aria-hidden="true"
            className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b", cfg.wash)}
          />
          <div className="relative aspect-square w-44 max-w-[60%] overflow-hidden rounded-tile shadow-glass-lg sm:w-52">
            <Artwork track={currentTrack} />
          </div>

          <div className="relative z-10 max-w-full text-center">
            <h2 className="truncate text-lg font-semibold text-foreground">{currentTrack?.title}</h2>
            <p className="truncate text-sm text-muted-foreground">{currentTrack?.artist}</p>
            {audioError && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {audioError}
              </p>
            )}
          </div>

          {/* Seek */}
          <div className="relative z-10 w-full max-w-md">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              onPointerDown={() => setIsSeeking(true)}
              onPointerUp={commitSeek}
              onKeyUp={commitSeek}
              onBlur={() => isSeeking && commitSeek()}
              disabled={!currentTrack}
              aria-label="Seek"
              className="lg-focus h-1.5 w-full cursor-pointer appearance-none rounded-full text-muted-foreground/40 accent-transparent disabled:opacity-50"
              style={fillStyle(seekPct)}
            />
            <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport */}
          <div className="relative z-10 flex items-center gap-6">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous track"
              className="lg-focus rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <SkipBack className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="lg-focus glass-interactive flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glass"
              style={{ background: cfg.color }}
            >
              {isPlaying ? (
                <Pause className="h-7 w-7" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-7 w-7" fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next track"
              className="lg-focus rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <SkipForward className="h-6 w-6" />
            </button>
          </div>

          {/* Volume */}
          <div className="relative z-10 flex w-full max-w-[14rem] items-center gap-2 text-muted-foreground">
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="lg-focus rounded-full p-1.5 transition-colors hover:text-foreground"
            >
              <VolumeIcon className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolume}
              aria-label="Volume"
              className="lg-focus h-1.5 w-full cursor-pointer appearance-none rounded-full accent-transparent"
              style={fillStyle(volPct)}
            />
          </div>
        </section>

        {/* Playlist */}
        <aside className="glass-thin flex w-full shrink-0 flex-col border-t border-border/60 md:w-72 md:border-l md:border-t-0">
          <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ListMusic className="h-3.5 w-3.5" aria-hidden="true" />
            Up Next
            <span className="ml-auto font-normal normal-case tabular-nums">{tracks.length}</span>
          </div>
          <ul className="flex-1 overflow-y-auto px-2 pb-3" role="listbox" aria-label="Playlist">
            {tracks.map((track, index) => {
              const active = index === currentIndex
              return (
                <li key={track.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-current={active ? "true" : undefined}
                    onClick={() => goToTrack(index, true)}
                    className={cn(
                      "lg-focus group flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors",
                      active ? "glass-tint-accent" : "hover:bg-muted/60",
                    )}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-control">
                      <Artwork track={track} rounded="rounded-control" />
                      {active && isPlaying && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                          <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
                            <span className="w-[2px] animate-pulse bg-white" style={{ height: "60%" }} />
                            <span className="w-[2px] animate-pulse bg-white [animation-delay:120ms]" style={{ height: "100%" }} />
                            <span className="w-[2px] animate-pulse bg-white [animation-delay:240ms]" style={{ height: "45%" }} />
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          active ? "text-foreground" : "text-foreground/90",
                        )}
                        style={active ? { color: cfg.color } : undefined}
                      >
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                    </div>
                    {track.durationSec ? (
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {formatTime(track.durationSec)}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>
      </div>

      <audio ref={audioRef} src={currentTrack?.src} preload="auto" aria-hidden="true" />
    </div>
  )
}
