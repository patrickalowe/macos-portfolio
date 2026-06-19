"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Moon, Sun, ArrowRight } from "lucide-react"

interface LoginScreenProps {
  onLogin: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
}

export default function LoginScreen({ onLogin, isDarkMode, onToggleDarkMode }: LoginScreenProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Demo lock screen: any non-empty password unlocks; empty triggers the error path.
    if (password.trim().length > 0) {
      onLogin()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 450)
    }
  }

  const wallpaper = isDarkMode ? "/wallpaper-night.jpg" : "/wallpaper-day.jpg"

  const formattedTime =
    time?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) ?? ""
  const formattedDate =
    time?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) ?? ""

  return (
    <div
      className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url('${wallpaper}')` }}
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden />

      <div className="relative z-10 mb-10 flex flex-col items-center" suppressHydrationWarning>
        <div className="text-7xl font-semibold tracking-tight lg-text-scrim">{formattedTime}</div>
        <div className="mt-1 text-xl font-medium lg-text-scrim">{formattedDate}</div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full glass-thick text-5xl font-semibold lg-vibrant">
          D
        </div>
        <h2 className="mb-6 text-2xl font-medium lg-text-scrim">Daniel</h2>

        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <div className={`relative ${shake ? "lg-shake" : ""}`}>
            <input
              type="password"
              autoFocus
              aria-label="Password"
              aria-invalid={error}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              className={`glass-thin lg-focus w-64 rounded-full px-4 py-2.5 pr-10 text-center text-sm text-white placeholder:text-white/60 ${
                error ? "ring-2 ring-red-400/80" : ""
              }`}
            />
            <button
              type="submit"
              aria-label="Unlock"
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/40 lg-focus"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 h-4 text-xs lg-text-scrim">
            {error ? "Please enter a password to continue" : "Hint: any password unlocks the demo"}
          </p>
        </form>
      </div>

      <button
        className="absolute bottom-8 z-10 rounded-full p-2.5 text-white/85 transition hover:bg-white/15 hover:text-white lg-focus"
        onClick={onToggleDarkMode}
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
      </button>
    </div>
  )
}
