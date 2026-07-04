"use client"

import { useState } from "react"
import Script from "next/script"

const PROFILE_URL = "https://www.linkedin.com/in/patrickalowe"

/**
 * Standalone page shown inside the Safari mini browser. LinkedIn profile
 * pages refuse to be iframed (X-Frame-Options), so this renders LinkedIn's
 * official embeddable profile badge instead — real photo, headline, and
 * link, served by platform.linkedin.com for exactly this purpose.
 */
export default function LinkedInPage() {
  const [dark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <div
        className="badge-base LI-profile-badge"
        data-locale="en_US"
        data-size="large"
        data-theme={dark ? "dark" : "light"}
        data-type="HORIZONTAL"
        data-vanity="patrickalowe"
        data-version="v1"
      >
        <a className="badge-base__link LI-simple-link" href={PROFILE_URL} target="_blank" rel="noopener noreferrer">
          Patrick Lowe
        </a>
      </div>

      <a
        href={PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="lg-focus inline-flex items-center rounded-full bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white outline-none transition-opacity hover:opacity-90"
      >
        View full profile on LinkedIn
      </a>

      <Script src="https://platform.linkedin.com/badges/js/profile.js" strategy="afterInteractive" />
    </main>
  )
}
