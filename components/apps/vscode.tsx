"use client"

import { useCallback, useMemo, useState } from "react"
import {
  AlertCircle,
  ChevronRight,
  FileCode,
  Files,
  Folder,
  FolderOpen,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  X,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import type { FsDirResponse, FsEntry, FsFileResponse, FsResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"

interface VSCodeProps {
  isDarkMode?: boolean
}

const fsUrl = (path: string) => `/api/fs?path=${encodeURIComponent(path)}`

/* ----------------------------------------------------------------- spinner -- */
function PaneSpinner({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-xs" aria-live="polite">
        {label}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------- error -- */
function PaneError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
      <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="lg-focus inline-flex items-center gap-1.5 rounded-control bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Retry
      </button>
    </div>
  )
}

/* --------------------------------------------------------------- tree node -- */
interface TreeNodeProps {
  entry: FsEntry
  depth: number
  expanded: Set<string>
  activePath: string | null
  onToggleDir: (path: string) => void
  onOpenFile: (path: string) => void
}

function TreeNode({ entry, depth, expanded, activePath, onToggleDir, onOpenFile }: TreeNodeProps) {
  const isDir = entry.type === "dir"
  const isOpen = expanded.has(entry.path)
  const isActive = activePath === entry.path

  return (
    <li role="treeitem" aria-expanded={isDir ? isOpen : undefined} aria-selected={isActive}>
      <button
        type="button"
        onClick={() => (isDir ? onToggleDir(entry.path) : onOpenFile(entry.path))}
        title={entry.path}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={cn(
          "lg-focus group flex w-full items-center gap-1.5 rounded-control py-1 pr-2 text-left text-[13px] leading-5 transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-foreground/80 hover:bg-muted",
        )}
      >
        {isDir ? (
          <ChevronRight
            className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
            aria-hidden
          />
        ) : (
          <span className="w-3.5 shrink-0" aria-hidden />
        )}
        {isDir ? (
          isOpen ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" aria-hidden />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" aria-hidden />
          )
        ) : (
          <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="truncate">{entry.name}</span>
      </button>
      {isDir && isOpen && (
        <DirChildren
          path={entry.path}
          depth={depth + 1}
          expanded={expanded}
          activePath={activePath}
          onToggleDir={onToggleDir}
          onOpenFile={onOpenFile}
        />
      )}
    </li>
  )
}

/* ------------------------------------------------------------ dir children -- */
interface DirChildrenProps {
  path: string
  depth: number
  expanded: Set<string>
  activePath: string | null
  onToggleDir: (path: string) => void
  onOpenFile: (path: string) => void
}

function DirChildren({ path, depth, expanded, activePath, onToggleDir, onOpenFile }: DirChildrenProps) {
  const { data, error, loading, refetch } = useApi<FsResponse>(fsUrl(path))
  const dir = data && data.type === "dir" ? (data as FsDirResponse) : null

  if (loading && !dir) {
    return (
      <div
        className="flex items-center gap-2 py-1 text-[11px] text-muted-foreground"
        style={{ paddingLeft: `${depth * 12 + 26}px` }}
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-1" style={{ paddingLeft: `${depth * 12 + 26}px` }}>
        <button
          type="button"
          onClick={refetch}
          className="lg-focus inline-flex items-center gap-1 rounded-control text-[11px] text-destructive hover:underline"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Failed — retry
        </button>
      </div>
    )
  }

  if (!dir) return null

  if (dir.entries.length === 0) {
    return (
      <div
        className="py-1 text-[11px] italic text-muted-foreground"
        style={{ paddingLeft: `${depth * 12 + 26}px` }}
      >
        Empty
      </div>
    )
  }

  return (
    <ul role="group" className="m-0 list-none p-0">
      {dir.entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          depth={depth}
          expanded={expanded}
          activePath={activePath}
          onToggleDir={onToggleDir}
          onOpenFile={onOpenFile}
        />
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ editor -- */
function EditorPane({ path, onClose }: { path: string | null; onClose: () => void }) {
  const { data, error, loading, isMock, refetch } = useApi<FsResponse>(path ? fsUrl(path) : null)
  const file = data && data.type === "file" ? (data as FsFileResponse) : null

  const lines = useMemo(() => (file ? file.content.replace(/\n$/, "").split("\n") : []), [file])

  if (!path) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileCode className="h-10 w-10 opacity-40" aria-hidden />
        <p className="text-sm">Select a file to view its source</p>
        <p className="text-xs opacity-70">Read-only repository browser</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* tab / breadcrumb */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5 rounded-t-control text-[13px]">
          <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate font-medium text-foreground" title={path}>
            {path.split("/").pop()}
          </span>
        </div>
        {file && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {file.language}
          </span>
        )}
        {isMock && (
          <span
            className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"
            title="Realistic demo data — no live source available"
          >
            Demo data
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" title={path}>
          {path}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close file"
          className="lg-focus shrink-0 rounded-control p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {/* body */}
      <div className="relative min-h-0 flex-1 bg-[#1e1e1e] dark:bg-[#1e1e1e]">
        {loading && <PaneSpinner label="Opening file…" />}
        {!loading && error && (
          <PaneError
            message={
              error.includes("404") || error.toLowerCase().includes("not found")
                ? "This file no longer exists."
                : error.includes("403")
                  ? "Access to this path is not allowed."
                  : error
            }
            onRetry={refetch}
          />
        )}
        {!loading && !error && file && (
          <div className="h-full overflow-auto">
            {file.truncated && (
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[11px] text-amber-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                File is large and was truncated for preview.
              </div>
            )}
            <pre className="m-0 flex min-w-full font-mono text-[12.5px] leading-[1.5]">
              <code
                aria-hidden
                className="select-none border-r border-white/10 px-3 py-2 text-right text-white/30"
              >
                {lines.map((_, i) => (
                  <span key={i} className="block tabular-nums">
                    {i + 1}
                  </span>
                ))}
              </code>
              <code className="block flex-1 px-4 py-2 text-[#d4d4d4]">
                {lines.map((line, i) => (
                  <span key={i} className="block whitespace-pre">
                    {line.length ? line : " "}
                  </span>
                ))}
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- activity bar -- */
const ACTIVITY_ITEMS = [
  { icon: Files, label: "Explorer", active: true },
  { icon: Search, label: "Search", active: false },
  { icon: GitBranch, label: "Source Control", active: false },
] as const

/* -------------------------------------------------------------------- root -- */
export default function VSCode({ isDarkMode = true }: VSCodeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [activePath, setActivePath] = useState<string | null>(null)

  const root = useApi<FsResponse>(fsUrl("."))
  const rootDir = root.data && root.data.type === "dir" ? (root.data as FsDirResponse) : null

  const handleToggleDir = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const handleOpenFile = useCallback((path: string) => {
    setActivePath(path)
  }, [])

  const handleCloseFile = useCallback(() => setActivePath(null), [])

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground font-sf">
      {/* activity bar rail */}
      <nav
        aria-label="Activity bar"
        className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-2"
      >
        {ACTIVITY_ITEMS.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-disabled={!active}
            tabIndex={active ? 0 : -1}
            className={cn(
              "lg-focus relative flex h-10 w-10 items-center justify-center rounded-control transition-colors",
              active
                ? "text-foreground after:absolute after:left-0 after:top-1/2 after:h-5 after:-translate-y-1/2 after:rounded-full after:border-l-2 after:border-[var(--lg-accent)]"
                : "text-muted-foreground/50 hover:text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </button>
        ))}
        <div className="mt-auto">
          <button
            type="button"
            aria-label="Settings"
            aria-disabled
            tabIndex={-1}
            className="flex h-10 w-10 items-center justify-center rounded-control text-muted-foreground/50"
          >
            <Settings className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </nav>

      {/* explorer sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card/60">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Explorer
          </h2>
          <button
            type="button"
            onClick={root.refetch}
            aria-label="Refresh file tree"
            className="lg-focus rounded-control p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-1 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
          <ChevronRight className="h-3 w-3 rotate-90" aria-hidden />
          danielprior-macos
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-3">
          {root.loading && !rootDir && <PaneSpinner label="Loading repository…" />}
          {!root.loading && root.error && <PaneError message={root.error} onRetry={root.refetch} />}
          {rootDir && (
            <ul role="tree" aria-label="Repository files" className="m-0 list-none p-0">
              {rootDir.entries.length === 0 ? (
                <li className="px-2 py-1 text-[11px] italic text-muted-foreground">Empty repository</li>
              ) : (
                rootDir.entries.map((entry) => (
                  <TreeNode
                    key={entry.path}
                    entry={entry}
                    depth={0}
                    expanded={expanded}
                    activePath={activePath}
                    onToggleDir={handleToggleDir}
                    onOpenFile={handleOpenFile}
                  />
                ))
              )}
            </ul>
          )}
        </div>
        {root.isMock && (
          <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
            Demo data
          </div>
        )}
      </aside>

      {/* editor */}
      <main className="min-w-0 flex-1">
        <EditorPane path={activePath} onClose={handleCloseFile} />
      </main>
    </div>
  )
}
