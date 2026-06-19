"use client"

import { useMemo, useState } from "react"
import {
  Github,
  Star,
  GitFork,
  Users,
  BookMarked,
  ExternalLink,
  AlertCircle,
  RotateCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import type { GithubResponse, GithubRepo } from "@/lib/api/types"

interface GitHubProps {
  isDarkMode?: boolean
}

/* ------------------------------------------------------------------ helpers */

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  const mon = Math.round(day / 30)
  const yr = Math.round(day / 365)
  if (sec < 60) return "just now"
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 30) return `${day}d ago`
  if (mon < 12) return `${mon}mo ago`
  return `${yr}y ago`
}

function compact(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

// Common GitHub language colors (subset; falls back to accent for unknowns).
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Astro: "#ff5a03",
  Elixir: "#6e4a7e",
  Lua: "#000080",
  "Jupyter Notebook": "#DA5B0B",
  MDX: "#fcb32c",
}

function languageColor(lang: string | null): string {
  if (!lang) return "var(--lg-accent)"
  return LANGUAGE_COLORS[lang] ?? "var(--lg-accent)"
}

// 5-level green scale for the contribution heatmap, per theme.
const GRID_LIGHT = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"]
const GRID_DARK = ["#21262d", "#0e4429", "#006d32", "#26a641", "#39d353"]

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]

/* ------------------------------------------------------------------- atoms */

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Star
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1.5 text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-base font-semibold tabular-nums">{value}</span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function RepoCard({ repo }: { repo: GithubRepo }) {
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "glass glass-interactive lg-focus group flex h-full flex-col gap-3 rounded-tile p-4 text-left",
        "transition-shadow",
      )}
      aria-label={`Open ${repo.name} on GitHub in a new tab`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <BookMarked className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm font-semibold text-foreground">{repo.name}</span>
        </div>
        <ExternalLink
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
        {repo.description ?? "No description provided."}
      </p>

      <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: languageColor(repo.language) }}
              aria-hidden
            />
            <span className="text-foreground/80">{repo.language}</span>
          </span>
        )}
        <span className="flex items-center gap-1 tabular-nums">
          <Star className="h-3.5 w-3.5" aria-hidden />
          {compact(repo.stars)}
        </span>
        <span className="flex items-center gap-1 tabular-nums">
          <GitFork className="h-3.5 w-3.5" aria-hidden />
          {compact(repo.forks)}
        </span>
        {repo.updatedAt && (
          <span className="ml-auto shrink-0">{relativeTime(repo.updatedAt)}</span>
        )}
      </div>
    </a>
  )
}

/* ----------------------------------------------------------- contributions */

function ContributionGrid({
  weeks,
  total,
  isDarkMode,
}: {
  weeks: number[][]
  total: number
  isDarkMode: boolean
}) {
  const palette = isDarkMode ? GRID_DARK : GRID_LIGHT

  // Month labels positioned above week columns.
  const monthLabels = useMemo(() => {
    const out: { col: number; label: string }[] = []
    let lastMonth = -1
    const now = new Date()
    // Approximate the start date: weeks back from today, week 0 = oldest.
    const start = new Date(now)
    start.setDate(start.getDate() - (weeks.length - 1) * 7)
    weeks.forEach((_, col) => {
      const d = new Date(start)
      d.setDate(d.getDate() + col * 7)
      const m = d.getMonth()
      if (m !== lastMonth) {
        lastMonth = m
        out.push({ col, label: d.toLocaleString("en-US", { month: "short" }) })
      }
    })
    return out
  }, [weeks])

  return (
    <div className="glass rounded-tile p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Contributions</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {compact(total)} in the last year
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* weekday labels */}
        <div
          className="mt-[18px] grid shrink-0 gap-[3px]"
          style={{ gridTemplateRows: "repeat(7, 11px)" }}
          aria-hidden
        >
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={i}
              className="h-[11px] text-[9px] leading-[11px] text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="min-w-0">
          {/* month labels */}
          <div className="relative mb-1 h-3" aria-hidden>
            {monthLabels.map(({ col, label }) => (
              <span
                key={`${col}-${label}`}
                className="absolute text-[9px] leading-3 text-muted-foreground"
                style={{ left: col * 14 }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* grid: columns = weeks, rows = days */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid gap-[3px]" style={{ gridTemplateRows: "repeat(7, 11px)" }}>
                {Array.from({ length: 7 }).map((_, di) => {
                  const level = Math.max(0, Math.min(4, week[di] ?? 0))
                  return (
                    <span
                      key={di}
                      className="h-[11px] w-[11px] rounded-[2px]"
                      style={{ backgroundColor: palette[level] }}
                      title={`${level} contribution${level === 1 ? "" : "s"}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {palette.map((c, i) => (
          <span
            key={i}
            className="h-[11px] w-[11px] rounded-[2px]"
            style={{ backgroundColor: c }}
            aria-hidden
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ states */

function LoadingState() {
  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      <div className="mx-auto max-w-3xl animate-pulse space-y-6">
        <div className="glass flex items-center gap-4 rounded-tile p-5">
          <div className="h-16 w-16 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-3 w-64 rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-20 rounded-tile" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-28 rounded-tile" />
          ))}
        </div>
        <div className="glass h-40 rounded-tile" />
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full items-center justify-center bg-background p-6">
      <div className="glass flex max-w-sm flex-col items-center gap-3 rounded-tile p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
        <h2 className="text-base font-semibold text-foreground">Couldn&apos;t load GitHub</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="lg-focus glass-interactive mt-1 inline-flex items-center gap-2 rounded-control bg-muted px-4 py-2 text-sm font-medium text-foreground"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
          Retry
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- shell */

export default function GitHub({ isDarkMode = true }: GitHubProps) {
  const { data, error, loading, isMock, refetch } = useApi<GithubResponse>(
    "/api/github?user=daprior",
  )
  const [avatarFailed, setAvatarFailed] = useState(false)

  if (loading && !data) return <LoadingState />
  if (error && !data) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return <LoadingState />

  const { profile, topRepos, totalStars, contributions } = data
  const avatarSrc = avatarFailed || !profile.avatarUrl ? "/github.png" : profile.avatarUrl

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* profile header */}
        <header className="glass relative flex flex-col items-start gap-4 rounded-tile p-5 sm:flex-row sm:items-center">
          {isMock && (
            <span
              className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              title="Showing realistic demo data"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              Demo data
            </span>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt={`${profile.name ?? profile.login} avatar`}
            width={72}
            height={72}
            onError={() => setAvatarFailed(true)}
            className="shrink-0 rounded-full border border-border object-cover"
            style={{ height: 72, width: 72 }}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-lg font-semibold text-foreground">
                {profile.name ?? profile.login}
              </h1>
              <a
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lg-focus inline-flex items-center gap-1 rounded-control text-sm text-muted-foreground hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" aria-hidden />@{profile.login}
              </a>
            </div>
            {profile.bio && (
              <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{profile.bio}</p>
            )}
          </div>
        </header>

        {/* stats */}
        <section className="glass grid grid-cols-2 gap-4 rounded-tile p-5 sm:grid-cols-4">
          <Stat icon={Users} value={compact(profile.followers)} label="Followers" />
          <Stat icon={Users} value={compact(profile.following)} label="Following" />
          <Stat icon={BookMarked} value={compact(profile.publicRepos)} label="Repositories" />
          <Stat icon={Star} value={compact(totalStars)} label="Total Stars" />
        </section>

        {/* top repositories */}
        {topRepos.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Top Repositories</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {topRepos.map((repo) => (
                <RepoCard key={repo.name} repo={repo} />
              ))}
            </div>
          </section>
        )}

        {/* contribution heatmap */}
        {contributions?.weeks?.length > 0 && (
          <ContributionGrid
            weeks={contributions.weeks}
            total={contributions.total}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  )
}
