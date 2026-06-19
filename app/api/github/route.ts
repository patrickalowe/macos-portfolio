import type { NextRequest } from "next/server"
import { json, withTimeout, rateLimit, clientKey } from "@/lib/api/http"
import { env, hasGithubAuth } from "@/lib/api/env"
import { mockGithub } from "@/lib/api/mock"
import type { GithubRepo, GithubResponse } from "@/lib/api/types"

export const revalidate = 3600

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

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user")?.trim() || env.githubUser

  if (!rateLimit(clientKey(req, "github"), 30, 60_000)) {
    return json(mockGithub(user), "mock")
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "danielprior-macos",
      ...(hasGithubAuth() ? { Authorization: "Bearer " + env.githubToken } : {}),
    }

    const result = await withTimeout(async (signal) => {
      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(user)}`, { headers, signal }),
        fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=updated`, {
          headers,
          signal,
        }),
      ])

      if (!userRes.ok || !reposRes.ok) {
        throw new Error(`github upstream ${userRes.status}/${reposRes.status}`)
      }

      const profilePayload = (await userRes.json()) as GithubUserPayload
      const reposPayload = (await reposRes.json()) as GithubRepoPayload[]
      return { profilePayload, reposPayload }
    }, 5000)

    const { profilePayload, reposPayload } = result
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
      contributions: mockGithub(user).contributions,
      updatedAt: new Date().toISOString(),
    }

    return json(payload, "live")
  } catch {
    return json(mockGithub(user), "mock")
  }
}
