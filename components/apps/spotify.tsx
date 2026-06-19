"use client"

import SpotifyNowPlaying from "./spotify-now-playing"

interface SpotifyProps {
  isDarkMode?: boolean
}

export default function Spotify(_props: SpotifyProps) {
  return <SpotifyNowPlaying />
}
