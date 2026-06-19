import { NextResponse } from "next/server"
import type { DataSource } from "./types"

/** Run a signal-aware async task with a hard timeout. Aborts the signal on expiry. */
export async function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, ms = 5000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await task(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

/** Typed JSON success response that always advertises its data source. */
export function json<T>(data: T, source: DataSource = "live", init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "x-data-source": source,
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  })
}

/** Typed JSON error response. */
export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: { "x-data-source": "error", "cache-control": "no-store" } },
  )
}

/* ----------------------------------------------------- in-memory rate limit -- */
const buckets = new Map<string, { count: number; resetAt: number }>()

/** Returns true if the request is ALLOWED, false if it should be throttled. */
export function rateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

/** Best-effort client identifier for rate limiting. */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = fwd || req.headers.get("x-real-ip") || "local"
  return `${scope}:${ip}`
}
