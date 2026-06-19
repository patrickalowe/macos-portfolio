import os from "node:os"
import { json } from "@/lib/api/http"
import { mockSystem } from "@/lib/api/mock"
import type { SystemResponse } from "@/lib/api/types"

export const dynamic = "force-dynamic"

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function deriveChip(model: string | undefined, arch: string): string {
  const trimmed = model?.trim()
  if (trimmed) {
    if (/^apple\b/i.test(trimmed)) return trimmed
    if (arch === "arm64" && !/intel|amd|xeon|core\b/i.test(trimmed)) return "Apple Silicon"
    return trimmed
  }
  return arch === "arm64" ? "Apple Silicon" : "Unknown CPU"
}

export async function GET() {
  try {
    const cpus = os.cpus?.() ?? []
    const totalmem = os.totalmem?.() ?? 0

    // On the Cloudflare Workers runtime node:os is stubbed/empty — serve
    // representative data instead of zeros so the About panel still looks real.
    if (!cpus.length || !totalmem) {
      return json(mockSystem(), "mock")
    }

    const arch = os.arch()
    const payload: SystemResponse = {
      device: {
        name: os.hostname(),
        chip: deriveChip(cpus[0]?.model, arch),
        platform: os.platform(),
        arch,
        cpuCount: cpus.length,
      },
      memory: {
        totalGb: round1(totalmem / 1e9),
        freeGb: round1(os.freemem() / 1e9),
      },
      os: {
        release: os.release(),
        nodeVersion: process.version,
        nextVersion: "15.2.4",
      },
      build: {
        commit: process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
        builtAt: new Date().toISOString(),
        env: process.env.NODE_ENV ?? "production",
      },
      serverUptimeSec: Math.round(typeof process.uptime === "function" ? process.uptime() : 0),
      loadAvg: (os.loadavg?.() ?? [0, 0, 0]).map((n) => +n.toFixed(2)),
    }

    return json(payload, "live")
  } catch {
    return json(mockSystem(), "mock")
  }
}
