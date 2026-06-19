"use client"

import { useSystem } from "@/components/system-provider"

export default function Wallpaper() {
  const { mounted, isDarkMode } = useSystem()

  // Until mounted, default to the day layer to avoid a theme flash on hydration.
  const showNight = mounted && isDarkMode

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-glass"
        style={{
          backgroundImage: "url('/wallpaper-day.jpg')",
          opacity: showNight ? 0 : 1,
        }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-glass"
        style={{
          backgroundImage: "url('/wallpaper-night.jpg')",
          opacity: showNight ? 1 : 0,
        }}
      />
      {/* Subtle vignette + top-down gradient for depth and menubar legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, transparent 55%, rgba(0,0,0,0.18) 100%)," +
            "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.14) 100%)",
        }}
      />
    </div>
  )
}
