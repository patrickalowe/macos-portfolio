"use client"

import { useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"

interface PineAppleTVProps {
  isDarkMode?: boolean
}

const SITE_URL = "https://famelack.com/"

export default function PineAppleTV(_props: PineAppleTVProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="glass-chrome flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <img src="/pineapple-tv.svg" alt="" aria-hidden className="h-6 w-6 rounded-control" />
          <h1 className="text-sm font-semibold">PineApple TV</h1>
        </div>
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-interactive lg-focus inline-flex items-center gap-1.5 rounded-control px-3 py-1 text-xs font-medium outline-none"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open site
        </a>
      </header>

      <div className="relative flex-1">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={SITE_URL}
          title="PineApple TV"
          className="absolute inset-0 h-full w-full border-0"
          onLoad={() => setLoaded(true)}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  )
}
