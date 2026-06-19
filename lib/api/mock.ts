import type {
  SystemResponse,
  TracksResponse,
  NotesResponse,
  MailResponse,
  GithubResponse,
  WeatherResponse,
  WeatherCondition,
} from "./types"

/* ------------------------------------------------------------------ utils -- */
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function forecastDays(count = 5): { day: string; date: string }[] {
  const out: { day: string; date: string }[] = []
  const base = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    out.push({ day: i === 0 ? "Today" : DOW[d.getDay()], date: d.toISOString().slice(0, 10) })
  }
  return out
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/* ----------------------------------------------------------------- system -- */
export function mockSystem(): SystemResponse {
  return {
    device: { name: "Daniel's MacBook Pro", chip: "Apple M3 Pro", platform: "darwin", arch: "arm64", cpuCount: 12 },
    memory: { totalGb: 36, freeGb: 12 },
    os: { release: "26.0", nodeVersion: "v22.0.0", nextVersion: "15.2.4" },
    build: { commit: "local", builtAt: new Date().toISOString(), env: "development" },
    serverUptimeSec: 4096,
    loadAvg: [1.42, 1.31, 1.18],
  }
}

/* ----------------------------------------------------------------- tracks -- */
export function mockTracks(): TracksResponse {
  return {
    tracks: [
      { id: "lofi-study", title: "Lofi Study", artist: "FASSounds", src: "/lofi-study-112191.mp3", durationSec: 145 },
    ],
  }
}

/* ------------------------------------------------------------------ notes -- */
export function mockNotes(): NotesResponse {
  return {
    notes: [
      {
        id: "about",
        title: "About Me",
        preview: "Frontend developer & UI/UX designer crafting delightful web experiences.",
        body: "# Daniel Prior\n\nFrontend developer & UI/UX designer. I build beautiful, responsive, accessible web apps with React, Next.js and TypeScript — and I sweat the details.\n\nCurrently exploring Liquid Glass interfaces and design systems.",
        folder: "Personal",
        pinned: true,
        updatedAt: isoDaysAgo(1),
      },
      {
        id: "stack",
        title: "My Stack",
        preview: "React · Next.js · TypeScript · Tailwind · Node · Postgres",
        body: "## Stack\n\n- **Frontend:** React, Next.js, TypeScript, Tailwind CSS\n- **Backend:** Node, Express, Supabase, PostgreSQL\n- **Tooling:** Vite, Docker, GitHub Actions\n- **Design:** Figma, motion, design systems",
        folder: "Work",
        updatedAt: isoDaysAgo(4),
      },
      {
        id: "contact",
        title: "Contact",
        preview: "Let's build something.",
        body: "## Get in touch\n\n- Email: mail@danielprior.dk\n- GitHub: github.com/daprior\n- LinkedIn: /in/daniel-prior\n- Web: danielprior.dev",
        folder: "Personal",
        updatedAt: isoDaysAgo(9),
      },
    ],
  }
}

/* ------------------------------------------------------------------- mail -- */
export function mockMail(): MailResponse {
  const messages = [
    {
      id: "m1",
      from: { name: "Daniel Prior", email: "mail@danielprior.dk" },
      subject: "Welcome to my portfolio 👋",
      preview: "Thanks for stopping by — here's how to reach me and what I'm working on.",
      body: "Hi there,\n\nThanks for exploring this macOS Tahoe portfolio. Every app here is real: live GitHub data, live weather, a working file browser over the actual repo, and more.\n\nWant to work together? Just reply.\n\n— Daniel",
      date: isoDaysAgo(0),
      read: false,
      starred: true,
      mailbox: "Inbox",
    },
    {
      id: "m2",
      from: { name: "GitHub", email: "noreply@github.com" },
      subject: "Your repositories this week",
      preview: "A summary of activity across your repositories.",
      body: "Here's a recap of your recent pushes, stars and pull requests.",
      date: isoDaysAgo(2),
      read: false,
      mailbox: "Inbox",
    },
    {
      id: "m3",
      from: { name: "Vercel", email: "notifications@vercel.com" },
      subject: "Deployment ready",
      preview: "Your latest production deployment is live.",
      body: "Your project was deployed successfully and is now serving production traffic.",
      date: isoDaysAgo(5),
      read: true,
      mailbox: "Inbox",
    },
  ]
  return { messages, unreadCount: messages.filter((m) => !m.read).length }
}

/* ----------------------------------------------------------------- github -- */
function mockContributions() {
  const weeks: number[][] = []
  let total = 0
  for (let w = 0; w < 53; w++) {
    const week: number[] = []
    for (let d = 0; d < 7; d++) {
      const weekendDamp = d === 0 || d === 6 ? 0.45 : 1
      const recencyBoost = w > 40 ? 1.25 : 1
      const r = Math.random() * weekendDamp * recencyBoost
      const level = r > 0.82 ? 4 : r > 0.62 ? 3 : r > 0.4 ? 2 : r > 0.2 ? 1 : 0
      week.push(level)
      total += level
    }
    weeks.push(week)
  }
  return { total: total * 3, weeks }
}

export function mockGithub(user: string): GithubResponse {
  const repos = [
    { name: "danielprior-macos", description: "macOS Tahoe portfolio rebuilt in the browser", language: "TypeScript", stars: 184, forks: 22 },
    { name: "liquid-glass-ui", description: "A Liquid Glass component library for React", language: "TypeScript", stars: 96, forks: 8 },
    { name: "edge-agents", description: "Serverless AI agent infrastructure", language: "TypeScript", stars: 61, forks: 5 },
    { name: "dotfiles", description: "My terminal & editor setup", language: "Shell", stars: 34, forks: 3 },
    { name: "go-snippets", description: "Small Go experiments", language: "Go", stars: 12, forks: 1 },
  ]
  const topRepos = repos.map((r) => ({
    ...r,
    url: `https://github.com/${user}/${r.name}`,
    updatedAt: isoDaysAgo(Math.floor(Math.random() * 30) + 1),
  }))
  return {
    profile: {
      login: user,
      name: "Daniel Prior",
      avatarUrl: "/letter-d.png",
      bio: "Frontend developer & UI/UX designer",
      followers: 248,
      following: 73,
      publicRepos: 41,
      url: `https://github.com/${user}`,
    },
    topRepos,
    totalStars: topRepos.reduce((s, r) => s + r.stars, 0),
    contributions: mockContributions(),
    updatedAt: new Date().toISOString(),
  }
}

/* ---------------------------------------------------------------- weather -- */
interface CitySeed {
  name: string
  country: string
  lat: number
  lon: number
  temp: number
  condition: WeatherCondition
  humidity: number
  wind: number
}
const CITY_SEEDS: Record<string, CitySeed> = {
  "new york": { name: "New York", country: "US", lat: 40.71, lon: -74.01, temp: 18, condition: "partly-cloudy", humidity: 65, wind: 12 },
  london: { name: "London", country: "GB", lat: 51.51, lon: -0.13, temp: 14, condition: "rainy", humidity: 80, wind: 18 },
  tokyo: { name: "Tokyo", country: "JP", lat: 35.68, lon: 139.69, temp: 24, condition: "sunny", humidity: 50, wind: 8 },
  sydney: { name: "Sydney", country: "AU", lat: -33.87, lon: 151.21, temp: 22, condition: "sunny", humidity: 55, wind: 15 },
  paris: { name: "Paris", country: "FR", lat: 48.85, lon: 2.35, temp: 16, condition: "partly-cloudy", humidity: 60, wind: 10 },
  copenhagen: { name: "Copenhagen", country: "DK", lat: 55.68, lon: 12.57, temp: 12, condition: "cloudy", humidity: 72, wind: 16 },
}

const CONDS: WeatherCondition[] = ["sunny", "partly-cloudy", "cloudy", "rainy"]
const CONDITION_LABEL: Record<WeatherCondition, string> = {
  sunny: "Sunny",
  "partly-cloudy": "Partly Cloudy",
  cloudy: "Cloudy",
  rainy: "Rain",
  snowy: "Snow",
  foggy: "Fog",
  stormy: "Thunderstorms",
}

export function conditionLabel(c: WeatherCondition): string {
  return CONDITION_LABEL[c]
}

export function mockWeather(city: string): WeatherResponse {
  const key = city.trim().toLowerCase()
  const seed =
    CITY_SEEDS[key] ??
    ({ name: city ? city[0].toUpperCase() + city.slice(1) : "Cupertino", country: "", lat: 37.32, lon: -122.03, temp: 21, condition: "partly-cloudy", humidity: 58, wind: 11 } as CitySeed)

  const days = forecastDays(5)
  const forecast = days.map((d, i) => {
    const cond = i === 0 ? seed.condition : CONDS[Math.floor(Math.random() * CONDS.length)]
    const high = seed.temp + Math.round((Math.random() - 0.3) * 5)
    return { day: d.day, date: d.date, high, low: high - (4 + Math.floor(Math.random() * 4)), condition: cond }
  })

  return {
    location: { name: seed.name, country: seed.country, lat: seed.lat, lon: seed.lon },
    current: {
      tempC: seed.temp,
      feelsLikeC: seed.temp - 1,
      condition: seed.condition,
      conditionLabel: CONDITION_LABEL[seed.condition],
      humidity: seed.humidity,
      windKph: seed.wind,
      sunrise: "06:12",
      sunset: "19:48",
      isDay: true,
    },
    forecast,
    updatedAt: new Date().toISOString(),
  }
}
