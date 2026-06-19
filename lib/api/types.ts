/**
 * Single source of truth for every localhost API response shape.
 * Imported by BOTH the route handlers (app/api/**) and the client apps
 * (components/apps/**) so the contract can never drift.
 */

/** value of the `x-data-source` response header */
export type DataSource = "live" | "mock" | "error"

export interface ApiError {
  error: string
}

/* ---------------------------------------------------------------- system -- */
export interface SystemResponse {
  device: {
    name: string
    chip: string
    platform: string
    arch: string
    cpuCount: number
  }
  memory: {
    totalGb: number
    freeGb: number
  }
  os: {
    release: string
    nodeVersion: string
    nextVersion: string
  }
  build: {
    commit: string
    builtAt: string
    env: string
  }
  serverUptimeSec: number
  loadAvg: number[]
}

/* ---------------------------------------------------------------- tracks -- */
export interface Track {
  id: string
  title: string
  artist: string
  src: string
  durationSec?: number
  cover?: string
}
export interface TracksResponse {
  tracks: Track[]
}

/* ----------------------------------------------------------------- notes -- */
export interface Note {
  id: string
  title: string
  preview: string
  body: string
  folder: string
  pinned?: boolean
  updatedAt: string
}
export interface NotesResponse {
  notes: Note[]
}

/* ------------------------------------------------------------------ mail -- */
export interface MailMessage {
  id: string
  from: { name: string; email: string }
  subject: string
  preview: string
  body: string
  date: string
  read: boolean
  starred?: boolean
  mailbox: string
}
export interface MailResponse {
  messages: MailMessage[]
  unreadCount: number
}

/* ---------------------------------------------------------------- github -- */
export interface GithubRepo {
  name: string
  description: string | null
  url: string
  language: string | null
  stars: number
  forks: number
  updatedAt: string
}
export interface GithubProfile {
  login: string
  name: string | null
  avatarUrl: string
  bio: string | null
  followers: number
  following: number
  publicRepos: number
  url: string
}
export interface GithubContributions {
  total: number
  /** 53 weeks x 7 days, each 0–4 intensity level */
  weeks: number[][]
}
export interface GithubResponse {
  profile: GithubProfile
  topRepos: GithubRepo[]
  totalStars: number
  contributions: GithubContributions
  updatedAt: string
}

/* --------------------------------------------------------------- weather -- */
export type WeatherCondition = "sunny" | "partly-cloudy" | "cloudy" | "rainy" | "snowy" | "foggy" | "stormy"

export interface WeatherDay {
  day: string
  date: string
  high: number
  low: number
  condition: WeatherCondition
}
export interface WeatherResponse {
  location: { name: string; country?: string; lat: number; lon: number }
  current: {
    tempC: number
    feelsLikeC: number
    condition: WeatherCondition
    conditionLabel: string
    humidity: number
    windKph: number
    sunrise: string
    sunset: string
    isDay: boolean
  }
  forecast: WeatherDay[]
  updatedAt: string
}

/* -------------------------------------------------------------------- fs -- */
export interface FsEntry {
  name: string
  type: "dir" | "file"
  path: string
  size?: number
}
export interface FsDirResponse {
  type: "dir"
  path: string
  entries: FsEntry[]
}
export interface FsFileResponse {
  type: "file"
  path: string
  size: number
  language: string
  content: string
  truncated: boolean
}
export type FsResponse = FsDirResponse | FsFileResponse

/* --------------------------------------------------------------- spotify -- */
export interface SpotifyTrack {
  title: string
  artist: string
  album?: string
  albumArt?: string
  url: string
  durationMs?: number
  progressMs?: number
  playedAt?: string
}
export interface SpotifyResponse {
  /** false when no Spotify credentials are configured on the server */
  configured: boolean
  isPlaying: boolean
  /** the now-playing track, or the most recently played when nothing is live */
  track: SpotifyTrack | null
  recent: SpotifyTrack[]
  profileUrl: string
  updatedAt: string
}
