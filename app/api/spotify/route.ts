import { json, withTimeout } from "@/lib/api/http"
import { env, hasSpotifyAuth } from "@/lib/api/env"
import type { SpotifyResponse, SpotifyTrack } from "@/lib/api/types"

export const dynamic = "force-dynamic"

const TOKEN_URL = "https://accounts.spotify.com/api/token"
const NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing"
const RECENT_URL = "https://api.spotify.com/v1/me/player/recently-played?limit=8"

interface SpotifyApiTrack {
  name: string
  artists?: { name: string }[]
  album?: { name?: string; images?: { url: string }[] }
  external_urls?: { spotify?: string }
  duration_ms?: number
}

function mapTrack(t: SpotifyApiTrack | undefined | null, extra?: { progressMs?: number; playedAt?: string }): SpotifyTrack | null {
  if (!t || !t.name) return null
  return {
    title: t.name,
    artist: (t.artists ?? []).map((a) => a.name).join(", ") || "Unknown artist",
    album: t.album?.name,
    albumArt: t.album?.images?.[0]?.url,
    url: t.external_urls?.spotify || env.spotifyProfileUrl,
    durationMs: t.duration_ms,
    progressMs: extra?.progressMs,
    playedAt: extra?.playedAt,
  }
}

async function getAccessToken(signal: AbortSignal): Promise<string | null> {
  const basic = btoa(`${env.spotifyClientId}:${env.spotifyClientSecret}`)
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: env.spotifyRefreshToken }),
    signal,
  })
  if (!res.ok) return null
  const body = (await res.json()) as { access_token?: string }
  return body.access_token ?? null
}

export async function GET() {
  const base: SpotifyResponse = {
    configured: hasSpotifyAuth(),
    available: false,
    isPlaying: false,
    track: null,
    recent: [],
    profileUrl: env.spotifyProfileUrl,
    updatedAt: new Date().toISOString(),
  }

  if (!hasSpotifyAuth()) {
    return json(base, "mock")
  }

  try {
    const payload = await withTimeout<SpotifyResponse>(async (signal) => {
      const token = await getAccessToken(signal)
      if (!token) return base
      const auth = { Authorization: `Bearer ${token}` }

      // `available` flips true only when an endpoint authorizes us. A 401/403
      // (e.g. Spotify's "Premium required for the app owner") leaves it false
      // so the UI shows the profile card instead of an empty "Nothing playing".
      let available = false

      // Currently playing (200 = playing, 204 = nothing playing — both authorized)
      const nowRes = await fetch(NOW_PLAYING_URL, { headers: auth, signal })
      let nowTrack: SpotifyTrack | null = null
      let isPlaying = false
      if (nowRes.status === 200 || nowRes.status === 204) {
        available = true
        if (nowRes.status === 200) {
          const nb = (await nowRes.json()) as { is_playing?: boolean; progress_ms?: number; item?: SpotifyApiTrack }
          if (nb.item) {
            nowTrack = mapTrack(nb.item, { progressMs: nb.progress_ms })
            isPlaying = Boolean(nb.is_playing)
          }
        }
      }

      // Recently played (always fetch for the history list + fallback)
      let recent: SpotifyTrack[] = []
      const recentRes = await fetch(RECENT_URL, { headers: auth, signal })
      if (recentRes.ok) {
        available = true
        const rb = (await recentRes.json()) as { items?: { track: SpotifyApiTrack; played_at: string }[] }
        recent = (rb.items ?? [])
          .map((i) => mapTrack(i.track, { playedAt: i.played_at }))
          .filter((t): t is SpotifyTrack => t !== null)
      }

      const track = nowTrack ?? recent[0] ?? null
      return { ...base, available, isPlaying, track, recent, updatedAt: new Date().toISOString() }
    }, 6000)

    return json(payload, "live")
  } catch {
    return json(base, "live")
  }
}
