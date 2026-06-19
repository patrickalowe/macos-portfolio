"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Archive,
  ChevronLeft,
  Inbox,
  Mail as MailIcon,
  PenSquare,
  RefreshCw,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import type { MailMessage, MailResponse } from "@/lib/api/types"

interface MailProps {
  isDarkMode?: boolean
}

interface MailboxDef {
  id: string
  label: string
  icon: typeof Inbox
}

const MAILBOXES: MailboxDef[] = [
  { id: "Inbox", label: "Inbox", icon: Inbox },
  { id: "Starred", label: "Starred", icon: Star },
  { id: "Sent", label: "Sent", icon: Send },
  { id: "Archive", label: "Archive", icon: Archive },
  { id: "Trash", label: "Trash", icon: Trash2 },
]

const OWNER_EMAIL = "mail@appletechie.dev"

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const abs = Math.abs(diff)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (abs < minute) return "now"
  if (abs < hour) {
    const m = Math.round(abs / minute)
    return `${m}m`
  }
  if (abs < day) {
    const h = Math.round(abs / hour)
    return `${h}h`
  }
  if (abs < 7 * day) {
    return new Date(then).toLocaleDateString(undefined, { weekday: "short" })
  }
  const sameYear = new Date(then).getFullYear() === new Date().getFullYear()
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

function fullDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function DemoPill() {
  return (
    <span
      className="glass-thin inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
      title="Showing realistic demo data — no live mail source connected"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
      Demo data
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}

/* --------------------------------------------------------------- composer -- */

function Composer({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const send = () => {
    const params = new URLSearchParams()
    if (subject) params.set("subject", subject)
    if (body) params.set("body", body)
    const query = params.toString()
    const target = to.trim() || OWNER_EMAIL
    window.location.href = `mailto:${target}${query ? `?${query}` : ""}`
    onClose()
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="New message"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/30 backdrop-blur-thin"
        aria-label="Close composer"
        onClick={onClose}
      />
      <div className="lg-flex glass-thick relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-sheet shadow-glass-lg">
        <header className="glass-chrome flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold text-foreground">New Message</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="lg-focus glass-interactive flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-px bg-border">
          <label className="flex items-center gap-3 bg-card px-4 py-2.5 text-sm">
            <span className="w-16 shrink-0 text-muted-foreground">To:</span>
            <input
              ref={firstFieldRef}
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={OWNER_EMAIL}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-3 bg-card px-4 py-2.5 text-sm">
            <span className="w-16 shrink-0 text-muted-foreground">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </label>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message…"
          rows={8}
          className="min-h-[160px] resize-none bg-card px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />

        <footer className="glass-chrome flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="lg-focus glass-interactive rounded-control px-3.5 py-1.5 text-sm font-medium text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            className="lg-focus glass-interactive glass-tint-accent inline-flex items-center gap-1.5 rounded-control px-3.5 py-1.5 text-sm font-semibold text-white"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </footer>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- states -- */

function CenteredState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof MailIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50" aria-hidden />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-border" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <li key={i} className="flex gap-3 px-4 py-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* --------------------------------------------------------------- reading -- */

function ReadingPane({
  selectedId,
  fallback,
  isDarkMode,
}: {
  selectedId: string | null
  fallback: MailMessage | undefined
  isDarkMode?: boolean
}) {
  void isDarkMode
  const { data, error, loading, refetch } = useApi<MailMessage>(
    selectedId ? `/api/mail/${selectedId}` : null,
  )

  if (!selectedId) {
    return (
      <CenteredState
        icon={MailIcon}
        title="No message selected"
        description="Choose a message from the list to read it here."
      />
    )
  }

  const message = data ?? fallback

  if (loading && !message) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-2 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (error && !message) {
    return (
      <CenteredState
        icon={AlertTriangle}
        title="Couldn’t load this message"
        description={error}
        action={
          <button
            type="button"
            onClick={refetch}
            className="lg-focus glass-interactive inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        }
      />
    )
  }

  if (!message) {
    return <CenteredState icon={MailIcon} title="Message not found" />
  }

  return (
    <article className="flex h-full flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold leading-snug text-foreground">{message.subject}</h1>
        <div className="mt-3 flex items-center gap-3">
          <Avatar name={message.from.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{message.from.name}</p>
            <p className="truncate text-xs text-muted-foreground">{message.from.email}</p>
          </div>
          <time
            dateTime={message.date}
            className="shrink-0 text-xs text-muted-foreground"
            title={fullDate(message.date)}
          >
            {fullDate(message.date)}
          </time>
        </div>
      </header>
      <div
        className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-foreground"
        aria-live="polite"
      >
        {message.body.split("\n").map((line, i) => (
          <p key={i} className={cn(line.trim() === "" ? "h-4" : "mb-3 last:mb-0")}>
            {line}
          </p>
        ))}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------- main -- */

export default function MailApp({ isDarkMode = true }: MailProps) {
  const { data, error, loading, isMock, refetch } = useApi<MailResponse>("/api/mail")

  const [activeMailbox, setActiveMailbox] = useState("Inbox")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [starred, setStarred] = useState<Record<string, boolean>>({})
  const [readIds, setReadIds] = useState<Record<string, boolean>>({})
  const [composing, setComposing] = useState(false)
  const [mobilePane, setMobilePane] = useState<"list" | "read">("list")

  const messages = useMemo(() => data?.messages ?? [], [data])

  const isStarred = useCallback(
    (m: MailMessage) => starred[m.id] ?? Boolean(m.starred),
    [starred],
  )
  const isRead = useCallback(
    (m: MailMessage) => readIds[m.id] ?? m.read,
    [readIds],
  )

  const visibleMessages = useMemo(() => {
    if (activeMailbox === "Starred") return messages.filter(isStarred)
    if (activeMailbox === "Inbox") return messages
    // Sent / Archive / Trash have no seeded data — render as empty mailboxes.
    return messages.filter((m) => m.mailbox === activeMailbox)
  }, [messages, activeMailbox, isStarred])

  const unreadCount = useMemo(
    () => messages.filter((m) => !isRead(m)).length,
    [messages, isRead],
  )

  // Default-select the first message once data arrives.
  useEffect(() => {
    if (!selectedId && visibleMessages.length > 0) {
      setSelectedId(visibleMessages[0].id)
    }
  }, [visibleMessages, selectedId])

  // Keep selection valid when switching mailboxes.
  useEffect(() => {
    if (selectedId && !visibleMessages.some((m) => m.id === selectedId)) {
      setSelectedId(visibleMessages[0]?.id ?? null)
    }
  }, [activeMailbox, visibleMessages, selectedId])

  const selectMessage = useCallback((id: string) => {
    setSelectedId(id)
    setReadIds((prev) => ({ ...prev, [id]: true }))
    setMobilePane("read")
  }, [])

  const toggleStar = useCallback((id: string) => {
    setStarred((prev) => {
      const current = prev[id]
      const base = messages.find((m) => m.id === id)
      const fallback = base ? Boolean(base.starred) : false
      return { ...prev, [id]: !(current ?? fallback) }
    })
  }, [messages])

  const onListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
      e.preventDefault()
      const idx = visibleMessages.findIndex((m) => m.id === selectedId)
      const nextIdx =
        e.key === "ArrowDown"
          ? Math.min(visibleMessages.length - 1, idx + 1)
          : Math.max(0, idx - 1)
      const next = visibleMessages[nextIdx]
      if (next) selectMessage(next.id)
    },
    [visibleMessages, selectedId, selectMessage],
  )

  const selectedFallback = useMemo(
    () => messages.find((m) => m.id === selectedId),
    [messages, selectedId],
  )

  return (
    <div className="relative flex h-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="glass-chrome hidden w-48 shrink-0 flex-col border-r border-border sm:flex">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="lg-focus glass-interactive glass-tint-accent inline-flex flex-1 items-center justify-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-semibold text-white"
          >
            <PenSquare className="h-3.5 w-3.5" />
            Compose
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3" aria-label="Mailboxes">
          {MAILBOXES.map((box) => {
            const Icon = box.icon
            const active = activeMailbox === box.id
            const badge = box.id === "Inbox" ? unreadCount : 0
            return (
              <button
                key={box.id}
                type="button"
                onClick={() => setActiveMailbox(box.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "lg-focus flex w-full items-center gap-2.5 rounded-control px-2.5 py-1.5 text-sm",
                  active
                    ? "glass-tint-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate text-left">{box.label}</span>
                {badge > 0 ? (
                  <span className="rounded-full bg-[var(--lg-accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
        {isMock ? (
          <div className="px-3 pb-3">
            <DemoPill />
          </div>
        ) : null}
      </aside>

      {/* Message list */}
      <section
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-border sm:w-72 md:w-80",
          mobilePane === "read" ? "hidden sm:flex" : "flex",
        )}
      >
        <header className="glass-chrome flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold text-foreground">{activeMailbox}</h2>
          <div className="flex items-center gap-1">
            {isMock ? <span className="sm:hidden"><DemoPill /></span> : null}
            <button
              type="button"
              onClick={refetch}
              aria-label="Refresh mailbox"
              className="lg-focus glass-interactive flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={() => setComposing(true)}
              aria-label="Compose message"
              className="lg-focus glass-interactive flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground sm:hidden"
            >
              <PenSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading && messages.length === 0 ? (
            <ListSkeleton />
          ) : error && messages.length === 0 ? (
            <CenteredState
              icon={AlertTriangle}
              title="Couldn’t load your inbox"
              description={error}
              action={
                <button
                  type="button"
                  onClick={refetch}
                  className="lg-focus glass-interactive inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              }
            />
          ) : visibleMessages.length === 0 ? (
            <CenteredState
              icon={activeMailbox === "Starred" ? Star : Inbox}
              title={`No messages in ${activeMailbox}`}
              description={
                activeMailbox === "Starred"
                  ? "Star a message to keep it here."
                  : "This mailbox is empty."
              }
            />
          ) : (
            <ul
              role="listbox"
              aria-label={`${activeMailbox} messages`}
              aria-activedescendant={selectedId ? `mail-row-${selectedId}` : undefined}
              tabIndex={0}
              onKeyDown={onListKeyDown}
              className="divide-y divide-border focus:outline-none"
            >
              {visibleMessages.map((m) => {
                const active = m.id === selectedId
                const unread = !isRead(m)
                const star = isStarred(m)
                return (
                  <li
                    key={m.id}
                    id={`mail-row-${m.id}`}
                    role="option"
                    aria-selected={active}
                  >
                    <div
                      className={cn(
                        "group relative flex cursor-pointer gap-3 px-4 py-3 transition-colors",
                        active ? "glass-tint-accent" : "hover:bg-muted",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectMessage(m.id)}
                        className="lg-focus flex min-w-0 flex-1 gap-3 text-left"
                      >
                        <div className="flex w-2 shrink-0 items-start justify-center pt-1.5">
                          {unread ? (
                            <span
                              className="h-2 w-2 rounded-full bg-[var(--lg-accent)]"
                              aria-label="Unread"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-sm",
                                unread ? "font-semibold text-foreground" : "font-medium text-foreground",
                              )}
                            >
                              {m.from.name}
                            </span>
                            <time
                              dateTime={m.date}
                              className="shrink-0 text-[11px] text-muted-foreground"
                              title={fullDate(m.date)}
                            >
                              {relativeDate(m.date)}
                            </time>
                          </div>
                          <p
                            className={cn(
                              "truncate text-[13px]",
                              unread ? "font-medium text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {m.subject}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{m.preview}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStar(m.id)}
                        aria-label={star ? "Unstar message" : "Star message"}
                        aria-pressed={star}
                        className="lg-focus flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full text-muted-foreground hover:text-amber-400"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            star ? "fill-amber-400 text-amber-400" : "",
                          )}
                        />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Reading pane */}
      <section
        className={cn(
          "min-w-0 flex-1 flex-col bg-card",
          mobilePane === "read" ? "flex" : "hidden sm:flex",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-2 py-1.5 sm:hidden">
          <button
            type="button"
            onClick={() => setMobilePane("list")}
            className="lg-focus glass-interactive inline-flex items-center gap-1 rounded-control px-2 py-1 text-sm font-medium text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {activeMailbox}
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <ReadingPane
            selectedId={selectedId}
            fallback={selectedFallback}
            isDarkMode={isDarkMode}
          />
        </div>
      </section>

      {composing ? <Composer onClose={() => setComposing(false)} /> : null}
    </div>
  )
}
