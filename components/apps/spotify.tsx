"use client"

import { ExternalLink, Music2 } from "lucide-react"

interface SpotifyProps {
  isDarkMode?: boolean
}

const GREEN = "#1db954"
const PROFILE_URL = "https://open.spotify.com/user/12136823108"

export default function Spotify(_props: SpotifyProps) {
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

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1db954]/20 via-[#1db954]/5 to-transparent"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${GREEN}22` }}>
          <Music2 className="h-9 w-9" style={{ color: GREEN }} strokeWidth={1.5} />
        </div>
        <div className="relative">
          <p className="text-base font-semibold">Find me on Spotify</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Playlists and what I&apos;ve been listening to, over on my profile.
          </p>
        </div>
        <a
          href={PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="lg-focus relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white outline-none transition-opacity hover:opacity-90"
          style={{ background: GREEN }}
        >
          <ExternalLink className="h-4 w-4" />
          Open my Spotify
        </a>
      </div>
    </div>
  )
}
