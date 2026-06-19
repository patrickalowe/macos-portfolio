"use client"

import MediaPlayer from "./media-player"

interface SpotifyProps {
  isDarkMode?: boolean
}

export default function Spotify({ isDarkMode }: SpotifyProps) {
  return <MediaPlayer accent="spotify" isDarkMode={isDarkMode} />
}
