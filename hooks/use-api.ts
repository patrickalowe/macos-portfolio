"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { DataSource } from "@/lib/api/types"

export interface UseApiResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  /** true when the server served realistic fallback data instead of a live source */
  isMock: boolean
  refetch: () => void
}

export interface UseApiOptions {
  /** poll interval in ms; omit to fetch once */
  pollMs?: number
  /** when false, the request is deferred (e.g. until a dependency resolves) */
  enabled?: boolean
}

/**
 * Typed client fetcher for the localhost API. Cancels in-flight requests on
 * unmount/refetch/url-change (windows open and close constantly), surfaces the
 * `x-data-source` header, and supports optional polling.
 *
 * Pass `url = null` to defer the request until inputs are ready.
 */
export function useApi<T>(url: string | null, opts: UseApiOptions = {}): UseApiResult<T> {
  const { pollMs, enabled = true } = opts
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(url) && enabled)
  const [isMock, setIsMock] = useState(false)
  const [nonce, setNonce] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!url || !enabled) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } })
        const source = (res.headers.get("x-data-source") as DataSource | null) ?? "live"
        if (!res.ok && source === "error") {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `Request failed (${res.status})`)
        }
        const payload = (await res.json()) as T
        if (cancelled) return
        setData(payload)
        setIsMock(source === "mock")
        setError(null)
      } catch (err) {
        if (cancelled || (err as Error).name === "AbortError") return
        setError((err as Error).message || "Something went wrong")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    let timer: ReturnType<typeof setInterval> | null = null
    if (pollMs && pollMs > 0) {
      timer = setInterval(run, pollMs)
    }

    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearInterval(timer)
    }
  }, [url, enabled, pollMs, nonce])

  return { data, error, loading, isMock, refetch }
}
