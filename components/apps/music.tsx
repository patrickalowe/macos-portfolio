"use client"

import MediaPlayer from "./media-player"

interface MusicProps {
  isDarkMode?: boolean
}

export default function Music({ isDarkMode }: MusicProps) {
  return <MediaPlayer accent="apple" isDarkMode={isDarkMode} />
}
