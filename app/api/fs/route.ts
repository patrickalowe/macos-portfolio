import fs from "node:fs/promises"
import path from "node:path"
import type { NextRequest } from "next/server"
import { json, jsonError } from "@/lib/api/http"
import { resolveSafe, languageForFile } from "@/lib/api/safe-path"
import type { FsDirResponse, FsEntry, FsFileResponse } from "@/lib/api/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_FILE_BYTES = 256 * 1024

export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("path") ?? "."
  const safe = resolveSafe(requested)
  if (!safe.ok) {
    return jsonError(403, safe.reason ?? "Forbidden")
  }

  try {
    const stats = await fs.stat(safe.abs)

    if (stats.isDirectory()) {
      const dirents = await fs.readdir(safe.abs, { withFileTypes: true })
      const entries: FsEntry[] = []

      for (const dirent of dirents) {
        const childRel = path.join(safe.rel === "." ? "" : safe.rel, dirent.name)
        const childSafe = resolveSafe(childRel)
        if (!childSafe.ok) continue

        const isDir = dirent.isDirectory()
        const entry: FsEntry = {
          name: dirent.name,
          type: isDir ? "dir" : "file",
          path: childSafe.rel,
        }

        if (!isDir) {
          try {
            const childStats = await fs.stat(childSafe.abs)
            entry.size = childStats.size
          } catch {
            continue
          }
        }

        entries.push(entry)
      }

      entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      })

      const payload: FsDirResponse = {
        type: "dir",
        path: safe.rel,
        entries,
      }
      return json(payload, "live")
    }

    const size = stats.size
    let content: string
    let truncated = false

    if (size > MAX_FILE_BYTES) {
      const handle = await fs.open(safe.abs, "r")
      try {
        const buffer = Buffer.alloc(MAX_FILE_BYTES)
        const { bytesRead } = await handle.read(buffer, 0, MAX_FILE_BYTES, 0)
        content = buffer.subarray(0, bytesRead).toString("utf8")
        truncated = true
      } finally {
        await handle.close()
      }
    } else {
      content = await fs.readFile(safe.abs, "utf8")
    }

    const payload: FsFileResponse = {
      type: "file",
      path: safe.rel,
      size,
      language: languageForFile(path.basename(safe.abs)),
      content,
      truncated,
    }
    return json(payload, "live")
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return jsonError(404, "Not found")
    }
    return jsonError(500, "Unable to read path")
  }
}
