"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Search,
  MapPin,
  Droplets,
  Wind,
  Sunrise,
  Sunset,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  Sun,
  Thermometer,
  AlertTriangle,
  LocateFixed,
  Loader2,
  RotateCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import { useSystem } from "@/components/system-provider"
import type { WeatherResponse, WeatherCondition } from "@/lib/api/types"

interface WeatherProps {
  isDarkMode?: boolean
}

const POPULAR_CITIES = ["Copenhagen", "London", "New York", "Tokyo", "Sydney", "Paris"]

const CONDITION_ICON: Record<WeatherCondition, typeof Sun> = {
  sunny: Sun,
  "partly-cloudy": Cloud,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  foggy: CloudFog,
  stormy: CloudLightning,
}

function ConditionIcon({ condition, className }: { condition: WeatherCondition; className?: string }) {
  const Icon = CONDITION_ICON[condition] ?? Cloud
  return <Icon className={className} aria-hidden="true" />
}

/* ----------------------------------------------------------------- canvas -- */

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
}

/** Coarse particle family — the canvas only needs a handful of looks. */
type ParticleKind = "rain" | "snow" | "sun" | "cloud"

function kindForCondition(condition: WeatherCondition): ParticleKind {
  switch (condition) {
    case "rainy":
    case "stormy":
      return "rain"
    case "snowy":
      return "snow"
    case "sunny":
      return "sun"
    default:
      return "cloud"
  }
}

function makeParticles(kind: ParticleKind): Particle[] {
  const count = kind === "rain" ? 110 : kind === "snow" ? 80 : kind === "sun" ? 46 : 26
  const out: Particle[] = []
  for (let i = 0; i < count; i++) {
    if (kind === "rain") {
      out.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        speedX: Math.random() * 1 - 0.5,
        speedY: Math.random() * 7 + 10,
        opacity: Math.random() * 0.5 + 0.4,
      })
    } else if (kind === "snow") {
      out.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 2,
        speedX: Math.random() * 1 - 0.5,
        speedY: Math.random() * 1 + 1,
        opacity: Math.random() * 0.3 + 0.6,
      })
    } else if (kind === "sun") {
      out.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.4 + 0.3,
      })
    } else {
      out.push({
        x: Math.random() * 100,
        y: Math.random() * 34,
        size: Math.random() * 30 + 20,
        speedX: Math.random() * 0.2 - 0.1,
        speedY: 0,
        opacity: Math.random() * 0.18 + 0.08,
      })
    }
  }
  return out
}

/* --------------------------------------------------------------- skeleton -- */

function WeatherSkeleton() {
  return (
    <div className="relative z-10 flex h-full flex-col p-5" aria-hidden="true">
      <div className="mb-5 h-10 w-full animate-pulse rounded-control bg-muted/70" />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted/70" />
          <div className="h-16 w-48 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:w-64">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-tile bg-muted/70" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-tile bg-muted/70" />
        ))}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- detail -- */

function DetailTile({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tint: string
}) {
  return (
    <div className="glass-thin flex items-center gap-3 rounded-tile p-3">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tint)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- component - */

export default function Weather({ isDarkMode: isDarkModeProp }: WeatherProps) {
  const { isDarkMode: isDarkModeSystem } = useSystem()
  const isDarkMode = isDarkModeProp ?? isDarkModeSystem

  const [city, setCity] = useState("Copenhagen")
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Build the request URL: coords take priority once we have them.
  const url = useMemo(() => {
    if (coords) return `/api/weather?lat=${coords.lat}&lon=${coords.lon}`
    return `/api/weather?city=${encodeURIComponent(city)}`
  }, [coords, city])

  const { data, error, loading, isMock, refetch } = useApi<WeatherResponse>(url, { pollMs: 600_000 })

  // Attempt geolocation once on mount — non-blocking, feature-detected.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        })
      },
      () => {
        /* denied / unavailable — keep the default city */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim()
    if (!q) return
    setCoords(null)
    setCity(q)
    setSearchQuery("")
  }, [searchQuery])

  const selectCity = useCallback((name: string) => {
    setCoords(null)
    setCity(name)
  }, [])

  /* ------------------------------------------------------------- canvas -- */
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)
  const kindRef = useRef<ParticleKind>("cloud")
  const darkRef = useRef(isDarkMode)

  const condition: WeatherCondition = data?.current.condition ?? "partly-cloudy"
  const kind = kindForCondition(condition)
  darkRef.current = isDarkMode

  useEffect(() => {
    kindRef.current = kind
    particlesRef.current = makeParticles(kind)
  }, [kind])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1
    let cssW = 0
    let cssH = 0

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      cssW = parent.clientWidth
      cssH = parent.clientHeight
      canvas.width = Math.max(1, Math.floor(cssW * dpr))
      canvas.height = Math.max(1, Math.floor(cssH * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    if (particlesRef.current.length === 0) {
      particlesRef.current = makeParticles(kindRef.current)
    }

    const draw = () => {
      const k = kindRef.current
      const dark = darkRef.current
      ctx.clearRect(0, 0, cssW, cssH)

      for (const p of particlesRef.current) {
        const x = (p.x / 100) * cssW
        const y = (p.y / 100) * cssH

        if (k === "rain") {
          ctx.strokeStyle = dark
            ? `rgba(150, 185, 255, ${p.opacity})`
            : `rgba(40, 110, 200, ${p.opacity * 0.85})`
          ctx.lineWidth = p.size / 2
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + p.speedX, y + p.size * 2.5)
          ctx.stroke()
        } else if (k === "snow") {
          ctx.fillStyle = dark
            ? `rgba(255, 255, 255, ${p.opacity})`
            : `rgba(225, 235, 250, ${p.opacity})`
          ctx.beginPath()
          ctx.arc(x, y, p.size, 0, Math.PI * 2)
          ctx.fill()
        } else if (k === "sun") {
          ctx.fillStyle = dark
            ? `rgba(255, 214, 90, ${p.opacity})`
            : `rgba(255, 196, 40, ${p.opacity})`
          ctx.beginPath()
          ctx.arc(x, y, p.size, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = dark
            ? `rgba(200, 206, 224, ${p.opacity})`
            : `rgba(255, 255, 255, ${p.opacity + 0.25})`
          ctx.beginPath()
          ctx.arc(x, y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }

        p.x += p.speedX * 0.1
        p.y += p.speedY * 0.1

        if (k === "rain" || k === "snow") {
          if (p.y > 100) {
            p.y = 0
            p.x = Math.random() * 100
          }
          if (p.x < 0 || p.x > 100) p.x = Math.random() * 100
        } else if (k === "sun") {
          if (p.x < 0) p.x = 100
          if (p.x > 100) p.x = 0
          if (p.y < 0) p.y = 100
          if (p.y > 100) p.y = 0
        } else {
          if (p.x < -30) p.x = 130
          if (p.x > 130) p.x = -30
        }
      }
    }

    const loop = () => {
      draw()
      animationRef.current = requestAnimationFrame(loop)
    }

    const start = () => {
      if (animationRef.current == null) {
        animationRef.current = requestAnimationFrame(loop)
      }
    }
    const stop = () => {
      if (animationRef.current != null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    if (!document.hidden) start()
    window.addEventListener("resize", resize)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      stop()
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  /* --------------------------------------------------------------- view -- */

  const usingLocation = Boolean(coords)
  const locationName = data
    ? `${data.location.name}${data.location.country ? `, ${data.location.country}` : ""}`
    : usingLocation
      ? "Your location"
      : city

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background text-foreground">
      {/* Animated condition background */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      {/* Soft gradient wash to seat the glass over the canvas, theme-aware */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0",
          isDarkMode
            ? "bg-gradient-to-b from-sky-950/40 via-background/30 to-background/70"
            : "bg-gradient-to-b from-sky-200/40 via-background/20 to-background/60",
        )}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col overflow-y-auto">
        {/* Search */}
        <div className="flex items-center gap-2 p-4">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Search any city…"
              aria-label="Search for a city"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch()
              }}
              className="glass-thin border-border/60 bg-card/60 pl-9 lg-focus"
            />
          </div>
          <Button onClick={handleSearch} className="glass-interactive lg-focus" aria-label="Search">
            Search
          </Button>
        </div>

        {loading && !data ? (
          <WeatherSkeleton />
        ) : error && !data ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-foreground">Couldn&apos;t load the forecast</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={refetch} className="glass-interactive lg-focus gap-2">
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : data ? (
          <div className="flex flex-col gap-5 px-5 pb-6">
            {/* Current conditions */}
            <section className="glass rounded-sheet p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    {usingLocation ? (
                      <LocateFixed className="h-5 w-5 text-[var(--lg-accent)]" aria-hidden="true" />
                    ) : (
                      <MapPin className="h-5 w-5 text-[var(--lg-accent)]" aria-hidden="true" />
                    )}
                    <h2 className="text-2xl font-semibold leading-tight">{locationName}</h2>
                    {isMock && (
                      <span
                        className="ml-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        title="Showing realistic demo data — no live source available"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                        Demo data
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.current.isDay ? "Day" : "Night"} · Updated{" "}
                    {new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="text-6xl font-extralight tabular-nums">{data.current.tempC}°</div>
                    <div className="flex items-center gap-3">
                      <ConditionIcon
                        condition={data.current.condition}
                        className="h-10 w-10 text-foreground/80"
                      />
                      <div>
                        <p className="text-lg leading-tight">{data.current.conditionLabel}</p>
                        <p className="text-sm text-muted-foreground">
                          Feels like {data.current.feelsLikeC}°
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 gap-3 md:w-72">
                  <DetailTile
                    icon={<Droplets className="h-4 w-4 text-sky-500" />}
                    label="Humidity"
                    value={`${data.current.humidity}%`}
                    tint="bg-sky-500/15"
                  />
                  <DetailTile
                    icon={<Wind className="h-4 w-4 text-teal-500" />}
                    label="Wind"
                    value={`${data.current.windKph} km/h`}
                    tint="bg-teal-500/15"
                  />
                  <DetailTile
                    icon={<Thermometer className="h-4 w-4 text-rose-500" />}
                    label="Feels like"
                    value={`${data.current.feelsLikeC}°`}
                    tint="bg-rose-500/15"
                  />
                  <DetailTile
                    icon={<Sunrise className="h-4 w-4 text-amber-500" />}
                    label="Sunrise"
                    value={data.current.sunrise}
                    tint="bg-amber-500/15"
                  />
                  <DetailTile
                    icon={<Sunset className="h-4 w-4 text-orange-500" />}
                    label="Sunset"
                    value={data.current.sunset}
                    tint="bg-orange-500/15"
                  />
                  <DetailTile
                    icon={<MapPin className="h-4 w-4 text-violet-500" />}
                    label="Coordinates"
                    value={`${data.location.lat.toFixed(1)}, ${data.location.lon.toFixed(1)}`}
                    tint="bg-violet-500/15"
                  />
                </div>
              </div>
            </section>

            {/* Forecast */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">5-Day Forecast</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {data.forecast.map((d) => (
                  <div
                    key={d.date}
                    className="glass-thin glass-interactive flex flex-col items-center gap-2 rounded-tile p-3"
                  >
                    <p className="text-sm font-medium">{d.day}</p>
                    <ConditionIcon condition={d.condition} className="h-7 w-7 text-foreground/80" />
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold tabular-nums">{d.high}°</span>
                      <span className="text-sm text-muted-foreground tabular-nums">{d.low}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Popular cities */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Popular Cities</h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.map((name) => {
                  const active = !usingLocation && city.toLowerCase() === name.toLowerCase()
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => selectCity(name)}
                      aria-pressed={active}
                      className={cn(
                        "glass-thin glass-interactive lg-focus rounded-control px-3.5 py-1.5 text-sm transition-colors",
                        active && "glass-tint-accent text-foreground",
                      )}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </section>

            {loading && (
              <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Refreshing…
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
