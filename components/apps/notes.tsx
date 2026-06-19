"use client"

import type React from "react"
import { useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  FileText,
  Folder,
  Pin,
  Plus,
  RotateCw,
  StickyNote,
} from "lucide-react"

import { useApi } from "@/hooks/use-api"
import type { Note, NotesResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"

interface NotesProps {
  isDarkMode?: boolean
}

const DRAFT_FOLDER = "Drafts"

/* -------------------------------------------------------------- helpers -- */

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const abs = Math.abs(diff)
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour
  if (abs < min) return "Just now"
  if (abs < hour) {
    const n = Math.round(abs / min)
    return `${n} min${n === 1 ? "" : "s"} ago`
  }
  if (abs < day) {
    const d = new Date(then)
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  }
  if (abs < 7 * day) {
    const n = Math.round(abs / day)
    if (n === 1) return "Yesterday"
    return `${n} days ago`
  }
  return new Date(then).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function firstLine(note: Note): string {
  const fromPreview = note.preview?.trim()
  if (fromPreview) return fromPreview
  const line = note.body
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").replace(/[*_`>-]/g, "").trim())
    .find((l) => l.length > 0)
  return line ?? "No additional text"
}

/* ----------------------------------------------- inline markdown render -- */

/** Parse inline tokens (bold, code, links) into safe React nodes. No raw HTML. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Combined matcher: **bold**, `code`, [label](url)
  const pattern = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    if (match[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-foreground">
          {match[2]}
        </strong>,
      )
    } else if (match[4] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {match[4]}
        </code>,
      )
    } else if (match[6] !== undefined && match[7] !== undefined) {
      const href = match[7]
      const safe = /^(https?:|mailto:)/i.test(href) ? href : `https://${href}`
      nodes.push(
        <a
          key={`${keyPrefix}-l-${i}`}
          href={safe}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--lg-accent)] underline-offset-2 hover:underline lg-focus rounded-sm"
        >
          {match[6]}
        </a>,
      )
    }
    lastIndex = pattern.lastIndex
    i += 1
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return nodes
}

/** Block-level markdown → React. Headings, lists, code fences, paragraphs. */
function renderMarkdown(body: string): ReactNode[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code fence
    if (/^```/.test(line.trim())) {
      const buf: string[] = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        buf.push(lines[i])
        i += 1
      }
      i += 1 // closing fence
      blocks.push(
        <pre
          key={`pre-${key++}`}
          className="my-3 overflow-x-auto rounded-control bg-muted p-3 font-mono text-[0.8rem] leading-relaxed text-foreground"
        >
          <code>{buf.join("\n")}</code>
        </pre>,
      )
      continue
    }

    // Blank line
    if (line.trim() === "") {
      i += 1
      continue
    }

    // Heading
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const content = renderInline(heading[2], `h-${key}`)
      const sizes: Record<number, string> = {
        1: "text-2xl font-bold mt-1 mb-2",
        2: "text-xl font-semibold mt-4 mb-1.5",
        3: "text-base font-semibold mt-3 mb-1 text-foreground",
        4: "text-sm font-semibold mt-2 mb-1 text-muted-foreground",
      }
      const cls = cn("text-foreground", sizes[level])
      if (level === 1) blocks.push(<h1 key={`h-${key++}`} className={cls}>{content}</h1>)
      else if (level === 2) blocks.push(<h2 key={`h-${key++}`} className={cls}>{content}</h2>)
      else if (level === 3) blocks.push(<h3 key={`h-${key++}`} className={cls}>{content}</h3>)
      else blocks.push(<h4 key={`h-${key++}`} className={cls}>{content}</h4>)
      i += 1
      continue
    }

    // Unordered / ordered list
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: ReactNode[] = []
      let li = 0
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "")
        items.push(
          <li key={`li-${key}-${li++}`} className="leading-relaxed">
            {renderInline(text, `li-${key}-${li}`)}
          </li>,
        )
        i += 1
      }
      const listCls = cn(
        "my-2 space-y-1 pl-5 text-sm text-muted-foreground",
        ordered ? "list-decimal" : "list-disc",
      )
      if (ordered) blocks.push(<ol key={`l-${key++}`} className={listCls}>{items}</ol>)
      else blocks.push(<ul key={`l-${key++}`} className={listCls}>{items}</ul>)
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""))
        i += 1
      }
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className="my-3 border-l-2 border-[var(--lg-accent)] pl-3 text-sm italic text-muted-foreground"
        >
          {renderInline(buf.join(" "), `q-${key}`)}
        </blockquote>,
      )
      continue
    }

    // Paragraph (gather until blank/structural line)
    const buf: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^```/.test(lines[i].trim())
    ) {
      buf.push(lines[i])
      i += 1
    }
    blocks.push(
      <p key={`p-${key++}`} className="my-2 text-sm leading-relaxed text-muted-foreground">
        {renderInline(buf.join(" "), `p-${key}`)}
      </p>,
    )
  }

  return blocks
}

/* -------------------------------------------------------------- pieces -- */

function Skeleton() {
  return (
    <div className="flex h-full">
      <div className="flex w-64 flex-col gap-2 border-r border-border bg-muted/40 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-tile p-2">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted-foreground/15" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted-foreground/10" />
          </div>
        ))}
      </div>
      <div className="flex-1 space-y-3 p-6">
        <div className="h-6 w-1/3 animate-pulse rounded bg-muted-foreground/15" />
        <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/10" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted-foreground/10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted-foreground/10" />
      </div>
    </div>
  )
}

function MockPill() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300"
      title="Showing realistic demo data — no live source connected"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Demo data
    </span>
  )
}

/* --------------------------------------------------------------- shell -- */

export default function Notes({ isDarkMode = true }: NotesProps) {
  void isDarkMode
  const { data, error, loading, isMock, refetch } = useApi<NotesResponse>("/api/notes")

  const [drafts, setDrafts] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftBody, setDraftBody] = useState("")

  const notes = useMemo<Note[]>(() => {
    const live = data?.notes ?? []
    return [...drafts, ...live]
  }, [data, drafts])

  // Folder grouping: pinned first within each folder, folders alpha (Drafts on top).
  const groups = useMemo(() => {
    const byFolder = new Map<string, Note[]>()
    for (const n of notes) {
      const f = n.folder?.trim() || "Notes"
      if (!byFolder.has(f)) byFolder.set(f, [])
      byFolder.get(f)!.push(n)
    }
    const sortNotes = (a: Note, b: Note) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }
    const order = Array.from(byFolder.keys()).sort((a, b) => {
      if (a === DRAFT_FOLDER) return -1
      if (b === DRAFT_FOLDER) return 1
      return a.localeCompare(b)
    })
    return order.map((folder) => ({
      folder,
      items: byFolder.get(folder)!.slice().sort(sortNotes),
    }))
  }, [notes])

  // Default selection: pinned first, else most recent.
  const effectiveId = useMemo(() => {
    if (selectedId && notes.some((n) => n.id === selectedId)) return selectedId
    const flat = groups.flatMap((g) => g.items)
    return flat[0]?.id ?? null
  }, [selectedId, notes, groups])

  const selected = notes.find((n) => n.id === effectiveId) ?? null
  const isDraft = selected?.folder === DRAFT_FOLDER

  const addDraft = () => {
    const now = new Date().toISOString()
    const id = `draft-${now}-${Math.random().toString(36).slice(2, 7)}`
    const note: Note = {
      id,
      title: "New Note",
      preview: "",
      body: "",
      folder: DRAFT_FOLDER,
      updatedAt: now,
    }
    setDrafts((d) => [note, ...d])
    setSelectedId(id)
    setDraftTitle(note.title)
    setDraftBody("")
  }

  const updateDraft = (patch: Partial<Pick<Note, "title" | "body">>) => {
    if (!selected) return
    setDrafts((d) =>
      d.map((n) =>
        n.id === selected.id
          ? {
              ...n,
              ...patch,
              preview: (patch.body ?? n.body).split("\n").find((l) => l.trim()) ?? "",
              updatedAt: new Date().toISOString(),
            }
          : n,
      ),
    )
  }

  /* ---- loading / error gates ---- */
  if (loading && !data) return <Skeleton />

  if (error && !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <div>
          <p className="font-medium text-foreground">Couldn&apos;t load your notes</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="glass-interactive lg-focus inline-flex items-center gap-2 rounded-control px-4 py-2 text-sm font-medium text-foreground"
        >
          <RotateCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background text-foreground font-sf">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border glass-thin">
        <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Notes</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {isMock && <MockPill />}
            <button
              type="button"
              onClick={addDraft}
              aria-label="New note"
              className="glass-interactive lg-focus flex h-7 w-7 items-center justify-center rounded-full text-amber-600 dark:text-amber-300"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {groups.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <FileText className="h-8 w-8 opacity-50" />
              <p className="text-sm">No notes yet</p>
              <button
                type="button"
                onClick={addDraft}
                className="lg-focus rounded-control text-xs text-[var(--lg-accent)] hover:underline"
              >
                Create your first note
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.folder} className="mb-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Folder className="h-3 w-3" />
                  {group.folder}
                </div>
                <ul role="list">
                  {group.items.map((note) => {
                    const active = note.id === effectiveId
                    return (
                      <li key={note.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(note.id)
                            if (note.folder === DRAFT_FOLDER) {
                              setDraftTitle(note.title)
                              setDraftBody(note.body)
                            }
                          }}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "lg-focus group flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors",
                            active
                              ? "glass-tint-accent"
                              : "hover:bg-muted/60",
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            {note.pinned && (
                              <Pin
                                className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500"
                                aria-label="Pinned"
                              />
                            )}
                            <span className="truncate text-sm font-medium text-foreground">
                              {note.title || "New Note"}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="shrink-0">{relativeTime(note.updatedAt)}</span>
                            <span className="truncate opacity-80">{firstLine(note)}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </aside>

      {/* Detail */}
      <section className="flex min-w-0 flex-1 flex-col bg-card">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileText className="h-12 w-12 opacity-40" />
            <p className="text-sm">Select a note</p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-foreground">
                  {selected.title || "New Note"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isDraft ? "Local draft · not saved" : `Edited ${relativeTime(selected.updatedAt)}`}
                  {" · "}
                  {selected.folder || "Notes"}
                </p>
              </div>
              {isDraft && (
                <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                  Draft
                </span>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isDraft ? (
                <div className="flex h-full flex-col gap-3 p-6">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => {
                      setDraftTitle(e.target.value)
                      updateDraft({ title: e.target.value })
                    }}
                    placeholder="Title"
                    aria-label="Note title"
                    className="lg-focus w-full rounded-control bg-transparent text-xl font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                  <textarea
                    value={draftBody}
                    onChange={(e) => {
                      setDraftBody(e.target.value)
                      updateDraft({ body: e.target.value })
                    }}
                    placeholder="Start writing… Markdown is supported."
                    aria-label="Note body"
                    className="lg-focus min-h-0 flex-1 resize-none rounded-control bg-transparent font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                </div>
              ) : (
                <article className="px-6 py-5">{renderMarkdown(selected.body)}</article>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
