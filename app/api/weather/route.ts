import type { NextRequest } from "next/server"
import { json, withTimeout, rateLimit, clientKey } from "@/lib/api/http"
import { env } from "@/lib/api/env"
import { conditionLabel, mockWeather } from "@/lib/api/mock"
import type { WeatherCondition, WeatherResponse, WeatherDay } from "@/lib/api/types"

export const dynamic = "force-dynamic"

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function wmoToCondition(code: number): WeatherCondition {
  if (code === 0) return "sunny"
  if (code === 1 || code === 2) return "partly-cloudy"
  if (code === 3) return "cloudy"
  if (code === 45 || code === 48) return "foggy"
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rainy"
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snowy"
  if (code >= 95 && code <= 99) return "stormy"
  return "partly-cloudy"
}

/** Format an ISO-ish timestamp ("2026-06-18T06:12") to "HH:MM" in local terms. */
function toHHMM(value: string | undefined): string {
  if (!value) return "--:--"
  const m = /T(\d{2}):(\d{2})/.exec(value)
  if (m) return `${m[1]}:${m[2]}`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "--:--"
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/** Map a daily date string ("2026-06-18") to a day label. */
function dayLabel(dateStr: string, index: number): string {
  if (index === 0) return "Today"
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return DOW[d.getDay()]
}

interface GeoResult {
  name: string
  country?: string
  latitude: number
  longitude: number
}

/** Reverse-geocode coordinates to a place name (Open-Meteo is forward-only).
 * Uses Nominatim (OSM) — keyless, works server-side with a User-Agent. Returns {} on failure. */
async function reverseGeocode(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<{ name?: string; country?: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`
    const res = await fetch(url, {
      signal,
      headers: { "User-Agent": "patrickalowe-macos/1.0 (https://patrickalowe.dev)" },
    })
    if (!res.ok) return {}
    const b = (await res.json()) as {
      name?: string
      address?: {
        city?: string
        town?: string
        village?: string
        county?: string
        state?: string
        country?: string
        country_code?: string
      }
    }
    const a = b.address ?? {}
    const name = a.city || a.town || a.village || a.county || b.name || a.state || undefined
    return { name, country: a.country || (a.country_code ? a.country_code.toUpperCase() : undefined) }
  } catch {
    return {}
  }
}

interface ApproxLocation {
  lat: number
  lon: number
  name?: string
  country?: string
}

/** Cloudflare attaches geo data to every request in production (Workers `cf` object). */
function cfLocation(req: NextRequest): ApproxLocation | null {
  const cf = (req as unknown as {
    cf?: { latitude?: string; longitude?: string; city?: string; country?: string }
  }).cf
  if (!cf) return null
  const lat = Number(cf.latitude)
  const lon = Number(cf.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { lat, lon, name: cf.city, country: cf.country }
}

/** Keyless IP geolocation fallback (mainly for local dev, where `cf` is absent). */
async function ipLocation(req: NextRequest, signal: AbortSignal): Promise<ApproxLocation | null> {
  try {
    const fwd =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      ""
    const isPublicIp = fwd !== "" && !/^(10\.|127\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|f[cd]|fe80)/i.test(fwd)
    const res = await fetch(isPublicIp ? `https://ipwho.is/${fwd}` : "https://ipwho.is/", { signal })
    if (!res.ok) return null
    const b = (await res.json()) as {
      success?: boolean
      latitude?: number
      longitude?: number
      city?: string
      country_code?: string
    }
    if (b.success === false || typeof b.latitude !== "number" || typeof b.longitude !== "number") return null
    return { lat: b.latitude, lon: b.longitude, name: b.city, country: b.country_code }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get("city")?.trim() || ""
  const latParam = searchParams.get("lat")
  const lonParam = searchParams.get("lon")

  if (!rateLimit(clientKey(req, "weather"), 60, 60_000)) {
    return json(mockWeather(city || "Cupertino"), "mock")
  }

  try {
    const payload = await withTimeout<WeatherResponse>(async (signal) => {
      let lat: number
      let lon: number
      let name: string
      let country: string | undefined

      if (city) {
        const geoUrl = new URL(env.geocodeBase)
        geoUrl.searchParams.set("name", city)
        geoUrl.searchParams.set("count", "1")
        const geoRes = await fetch(geoUrl, { signal })
        if (!geoRes.ok) throw new Error(`geocode ${geoRes.status}`)
        const geoBody = (await geoRes.json()) as { results?: GeoResult[] }
        const hit = geoBody.results?.[0]
        if (!hit) throw new Error("no geocode result")
        lat = hit.latitude
        lon = hit.longitude
        name = hit.name
        country = hit.country
      } else if (latParam !== null || lonParam !== null) {
        const latNum = Number(latParam)
        const lonNum = Number(lonParam)
        if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
          throw new Error("missing coordinates")
        }
        lat = latNum
        lon = lonNum
        const rev = await reverseGeocode(latNum, lonNum, signal)
        name = rev.name || `${latNum.toFixed(2)}, ${lonNum.toFixed(2)}`
        country = rev.country
      } else {
        // No city, no coords: local weather for the requester.
        const approx = cfLocation(req) ?? (await ipLocation(req, signal))
        if (!approx) throw new Error("could not resolve request location")
        lat = approx.lat
        lon = approx.lon
        if (approx.name) {
          name = approx.name
          country = approx.country
        } else {
          const rev = await reverseGeocode(lat, lon, signal)
          name = rev.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`
          country = rev.country || approx.country
        }
      }

      const wUrl = new URL(env.weatherBase)
      wUrl.searchParams.set("latitude", String(lat))
      wUrl.searchParams.set("longitude", String(lon))
      wUrl.searchParams.set(
        "current",
        "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
      )
      wUrl.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
      )
      wUrl.searchParams.set("timezone", "auto")
      wUrl.searchParams.set("forecast_days", "5")
      wUrl.searchParams.set("temperature_unit", "fahrenheit")
      wUrl.searchParams.set("wind_speed_unit", "mph")

      const wRes = await fetch(wUrl, { signal })
      if (!wRes.ok) throw new Error(`weather ${wRes.status}`)
      const w = (await wRes.json()) as {
        current?: {
          temperature_2m: number
          relative_humidity_2m: number
          apparent_temperature: number
          is_day: number
          weather_code: number
          wind_speed_10m: number
        }
        daily?: {
          time: string[]
          weather_code: number[]
          temperature_2m_max: number[]
          temperature_2m_min: number[]
          sunrise: string[]
          sunset: string[]
        }
      }

      const cur = w.current
      const daily = w.daily
      if (!cur || !daily || !Array.isArray(daily.time) || daily.time.length === 0) {
        throw new Error("malformed weather payload")
      }

      const currentCondition = wmoToCondition(cur.weather_code)

      const forecast: WeatherDay[] = daily.time.slice(0, 5).map((dateStr, i) => ({
        day: dayLabel(dateStr, i),
        date: dateStr,
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        condition: wmoToCondition(daily.weather_code[i]),
      }))

      return {
        location: { name, country, lat, lon },
        current: {
          tempF: Math.round(cur.temperature_2m),
          feelsLikeF: Math.round(cur.apparent_temperature),
          condition: currentCondition,
          conditionLabel: conditionLabel(currentCondition),
          humidity: Math.round(cur.relative_humidity_2m),
          windMph: Math.round(cur.wind_speed_10m),
          sunrise: toHHMM(daily.sunrise[0]),
          sunset: toHHMM(daily.sunset[0]),
          isDay: cur.is_day === 1,
        },
        forecast,
        updatedAt: new Date().toISOString(),
      }
    }, 4500)

    return json(payload, "live")
  } catch {
    return json(mockWeather(city || "Cupertino"), "mock")
  }
}
