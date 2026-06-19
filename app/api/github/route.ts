import type { NextRequest } from "next/server"
import { json, withTimeout, rateLimit, clientKey } from "@/lib/api/http"
import { env, hasGithubAuth } from "@/lib/api/env"
import { mockGithub } from "@/lib/api/mock"
import type { GithubContributions, GithubRepo, GithubResponse } from "@/lib/api/types"

export const dynamic = "force-dynamic"

interface GithubUserPayload {
  login: string
  name: string | null
  avatar_url: string
  bio: string | null
  followers: number
  following: number
  public_repos: number
  html_url: string
}

interface GithubRepoPayload {
  name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
}

const CONTRIBUTION_LEVEL: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

/**
 * Real contribution calendar via the GitHub GraphQL API (REST has no such
 * endpoint). Requires a token. Returns null on any failure so the caller can
 * fall back to a synthesized grid.
 */
async function fetchContributions(user: string, signal: AbortSignal): Promise<GithubContributions | null> {
  if (!hasGithubAuth()) return null
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionLevel weekday}}}}}}`
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.githubToken,
        "Content-Type": "application/json",
        "User-Agent": "apple-techie-macos",
      },
      body: JSON.stringify({ query, variables: { login: user } }),
      signal,
    })
    if (!res.ok) return null
    const body = (await res.json()) as {
      data?: { user?: { contributionsCollection?: { contributionCalendar?: { totalContributions: number; weeks: { contributionDays: { contributionLevel: string; weekday: number }[] }[] } } } }
    }
    const cal = body?.data?.user?.contributionsCollection?.contributionCalendar
    if (!cal?.weeks?.length) return null
    const weeks = cal.weeks.map((w) => {
      const days = [0, 0, 0, 0, 0, 0, 0]
      for (const d of w.contributionDays) days[d.weekday] = CONTRIBUTION_LEVEL[d.contributionLevel] ?? 0
      return days
    })
    return { total: cal.totalContributions, weeks }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user")?.trim() || env.githubUser

  if (!rateLimit(clientKey(req, "github"), 30, 60_000)) {
    return json(mockGithub(user), "mock")
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "apple-techie-macos",
      ...(hasGithubAuth() ? { Authorization: "Bearer " + env.githubToken } : {}),
    }

    const result = await withTimeout(async (signal) => {
      const [userRes, reposRes, contributions] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(user)}`, { headers, signal }),
        fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=updated`, {
          headers,
          signal,
        }),
        fetchContributions(user, signal),
      ])

      if (!userRes.ok || !reposRes.ok) {
        throw new Error(`github upstream ${userRes.status}/${reposRes.status}`)
      }

      const profilePayload = (await userRes.json()) as GithubUserPayload
      const reposPayload = (await reposRes.json()) as GithubRepoPayload[]
      return { profilePayload, reposPayload, contributions }
    }, 6000)

    const { profilePayload, reposPayload, contributions } = result
    const repos = Array.isArray(reposPayload) ? reposPayload : []

    const topRepos: GithubRepo[] = [...repos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        updatedAt: r.updated_at,
      }))

    const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)

    const payload: GithubResponse = {
      profile: {
        login: profilePayload.login,
        name: profilePayload.name,
        avatarUrl: profilePayload.avatar_url,
        bio: profilePayload.bio,
        followers: profilePayload.followers,
        following: profilePayload.following,
        publicRepos: profilePayload.public_repos,
        url: profilePayload.html_url,
      },
      topRepos,
      totalStars,
      // Real calendar when the GraphQL call succeeds; synthesized grid otherwise.
      contributions: contributions ?? mockGithub(user).contributions,
      updatedAt: new Date().toISOString(),
    }

    return json(payload, "live")
  } catch {
    return json(mockGithub(user), "mock")
  }
}
