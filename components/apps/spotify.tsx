"use client"

import { ExternalLink } from "lucide-react"
import { useSystem } from "@/components/system-provider"

interface SpotifyProps {
  isDarkMode?: boolean
}

const GREEN = "#1db954"
const PROFILE_URL = "https://open.spotify.com/user/12136823108"

/** Public playlists on the profile — Spotify has no user-profile embed, so the
 * window recreates the profile from its public pieces (playlist embeds work). */
const PLAYLISTS: { id: string; title: string }[] = [
  { id: "7cjvhXs0f84OuIzU5c8wC8", title: "Everyday" },
  { id: "70HEQJVoaQA8kglcK1Oejx", title: "Hype?" },
  { id: "1yUMSDYjvolvDR9U4iYRpJ", title: "❤️" },
  { id: "2AiGJYOMDTvtXVYp1ZSVnS", title: "The Chainsmokers Remixes" },
  { id: "1hhWTngEiebl5YA4RTdMGh", title: "SKRILLEX LIVE @ ULTRA MUSIK FESTIVAL 2015" },
]

export default function Spotify({ isDarkMode: isDarkModeProp }: SpotifyProps) {
  const { isDarkMode: isDarkModeSystem } = useSystem()
  const isDarkMode = isDarkModeProp ?? isDarkModeSystem

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="glass-chrome flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <img src="/spotify.png" alt="" aria-hidden className="h-6 w-6 rounded-control" />
          <h1 className="text-sm font-semibold">Spotify</h1>
        </div>
        <a
          href={PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="lg-focus inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white outline-none transition-opacity hover:opacity-90"
          style={{ background: GREEN }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Spotify
        </a>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Profile hero */}
        <section className="relative px-6 pb-5 pt-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1db954]/25 via-[#1db954]/5 to-transparent"
          />
          <div className="relative flex items-end gap-5">
            <img
              src="/spotify-avatar.jpg"
              alt="Patrick Lowe"
              className="h-28 w-28 shrink-0 rounded-full object-cover shadow-glass-lg"
              draggable={false}
            />
            <div className="min-w-0 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Profile</p>
              <a
                href={PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="lg-focus block truncate text-3xl font-bold outline-none hover:underline"
              >
                Patrick Lowe
              </a>
              <p className="mt-1 text-sm text-muted-foreground">{PLAYLISTS.length} Public Playlists</p>
            </div>
          </div>
        </section>

        {/* Public playlists — official Spotify embeds, playable in place */}
        <section className="flex flex-col gap-3 px-6 pb-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Public Playlists</h2>
          {PLAYLISTS.map((p) => (
            <iframe
              key={p.id}
              src={`https://open.spotify.com/embed/playlist/${p.id}?utm_source=generator&theme=${isDarkMode ? 0 : 1}`}
              title={p.title}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="shrink-0 rounded-tile"
            />
          ))}
        </section>
      </div>
    </div>
  )
}
