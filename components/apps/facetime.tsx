"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ShieldAlert,
  CameraOff,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FaceTimeProps {
  isDarkMode?: boolean
}

type CallStatus = "idle" | "connecting" | "active"

type CallError = {
  kind: "denied" | "no-device" | "insecure" | "unsupported" | "in-use" | "generic"
  message: string
}

const CONTACT_NAME = "Daniel Prior"
const CONTACT_HANDLE = "daniel@prior.design"
const CONTACT_INITIALS = "DP"

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = m.toString().padStart(2, "0")
  const ss = s.toString().padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

export default function FaceTime({ isDarkMode = true }: FaceTimeProps) {
  const [status, setStatus] = useState<CallStatus>("idle")
  const [error, setError] = useState<CallError | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const supportsMedia =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Tear down the camera on unmount — no lingering tracks.
  useEffect(() => stopStream, [stopStream])

  // Call timer.
  useEffect(() => {
    if (status !== "active") return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [status])

  const startCall = useCallback(async () => {
    setError(null)

    if (!supportsMedia) {
      setError({
        kind: "unsupported",
        message:
          "This browser does not support camera access. Try a recent version of Safari, Chrome, or Edge.",
      })
      return
    }

    // getUserMedia is only available in secure contexts (https or localhost).
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setError({
        kind: "insecure",
        message:
          "Camera access requires a secure connection (HTTPS). Open this page over HTTPS to start a video call.",
      })
      return
    }

    setStatus("connecting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      // Reflect any prior toggle preferences onto the fresh tracks.
      stream.getAudioTracks().forEach((t) => (t.enabled = !isMuted))
      stream.getVideoTracks().forEach((t) => (t.enabled = !isCameraOff))
      setSeconds(0)
      setStatus("active")
    } catch (err) {
      setStatus("idle")
      stopStream()
      const name = err instanceof Error ? err.name : ""
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError({
          kind: "denied",
          message:
            "Camera and microphone access was denied. Allow access in your browser settings, then try again.",
        })
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError({
          kind: "no-device",
          message: "No camera was found on this device.",
        })
      } else if (name === "NotReadableError") {
        setError({
          kind: "in-use",
          message:
            "Your camera is already in use by another app. Close it and try again.",
        })
      } else {
        setError({
          kind: "generic",
          message: "Could not start the video call. Please try again.",
        })
      }
    }
  }, [supportsMedia, isMuted, isCameraOff, stopStream])

  const endCall = useCallback(() => {
    stopStream()
    setStatus("idle")
    setSeconds(0)
    setIsMuted(false)
    setIsCameraOff(false)
    setIsExpanded(false)
  }, [stopStream])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next))
      return next
    })
  }, [])

  const toggleCamera = useCallback(() => {
    setIsCameraOff((prev) => {
      const next = !prev
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next))
      return next
    })
  }, [])

  const errorIcon = (() => {
    switch (error?.kind) {
      case "denied":
        return <ShieldAlert className="h-7 w-7" aria-hidden />
      case "no-device":
      case "in-use":
        return <CameraOff className="h-7 w-7" aria-hidden />
      case "insecure":
      case "unsupported":
      case "generic":
      default:
        return <AlertTriangle className="h-7 w-7" aria-hidden />
    }
  })()

  return (
    <div className="relative flex h-full w-full flex-col bg-background text-foreground">
      <div
        className={cn(
          "relative flex flex-1 items-center justify-center overflow-hidden p-4 transition-[padding] duration-300 ease-glass sm:p-6",
          isExpanded && "p-0 sm:p-0",
        )}
      >
        {/* Call stage */}
        <div
          className={cn(
            "glass relative flex w-full flex-col overflow-hidden rounded-window shadow-glass transition-all duration-300 ease-glass",
            isExpanded ? "h-full max-w-none rounded-none" : "aspect-video max-w-3xl",
          )}
        >
          {/* Live video (mounted during connecting/active so it can bind early) */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label={`Live camera preview for your call with ${CONTACT_NAME}`}
            className={cn(
              "absolute inset-0 h-full w-full -scale-x-100 bg-black object-cover transition-opacity duration-300",
              status === "active" && !isCameraOff ? "opacity-100" : "opacity-0",
            )}
          />

          {/* IDLE — gesture-gated start surface */}
          {status === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center">
              <div
                className="lg-flex flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground shadow-glass-sm ring-1 ring-border"
                aria-hidden
              >
                {CONTACT_INITIALS}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight">{CONTACT_NAME}</h2>
                <p className="text-sm text-muted-foreground">{CONTACT_HANDLE}</p>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="glass-thin flex max-w-sm flex-col items-center gap-3 rounded-control px-5 py-4 text-sm"
                >
                  <span className="text-destructive">{errorIcon}</span>
                  <p className="text-muted-foreground">{error.message}</p>
                  {error.kind !== "unsupported" &&
                    error.kind !== "insecure" &&
                    error.kind !== "no-device" && (
                      <button
                        type="button"
                        onClick={startCall}
                        className="lg-focus glass-interactive mt-1 rounded-control bg-[var(--lg-accent)] px-4 py-1.5 text-sm font-medium text-white"
                      >
                        Try again
                      </button>
                    )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startCall}
                  className="lg-focus glass-interactive flex items-center gap-2.5 rounded-full bg-[var(--lg-accent)] px-6 py-3 text-base font-semibold text-white shadow-glass-sm"
                  aria-label={`Start a video call with ${CONTACT_NAME}`}
                >
                  <Video className="h-5 w-5" aria-hidden />
                  Start Video
                </button>
              )}

              {!error && (
                <p className="max-w-xs text-xs text-muted-foreground/80">
                  Your camera and microphone are only requested when you start the call.
                </p>
              )}
            </div>
          )}

          {/* CONNECTING */}
          {status === "connecting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 text-white lg-text-scrim">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-xl font-semibold backdrop-blur-glass"
                aria-hidden
              >
                {CONTACT_INITIALS}
              </div>
              <div className="flex items-center gap-2 text-sm font-medium" aria-live="polite">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Connecting to {CONTACT_NAME}…
              </div>
            </div>
          )}

          {/* ACTIVE — overlays on top of the live video */}
          {status === "active" && (
            <>
              {/* Camera-off placeholder */}
              {isCameraOff && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 text-white">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-xl font-semibold"
                    aria-hidden
                  >
                    {CONTACT_INITIALS}
                  </div>
                  <p className="text-sm font-medium">Camera off</p>
                </div>
              )}

              {/* Top status row */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
                <div className="lg-text-scrim flex flex-col">
                  <span className="text-sm font-semibold">{CONTACT_NAME}</span>
                  <span
                    className="font-mono text-xs tabular-nums opacity-90"
                    aria-live="off"
                    aria-label={`Call duration ${formatDuration(seconds)}`}
                  >
                    {formatDuration(seconds)}
                  </span>
                </div>
                <span className="lg-text-scrim flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium backdrop-blur-thin">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden />
                  Live
                </span>
              </div>

              {/* Self preview (picture-in-picture style label) */}
              {!isCameraOff && (
                <div className="pointer-events-none absolute right-4 top-16 rounded-control bg-black/30 px-2 py-1 backdrop-blur-thin lg-text-scrim">
                  <span className="text-[11px] font-medium">You</span>
                </div>
              )}

              {/* Control bar */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-4 sm:gap-4 sm:p-6">
                <div className="glass-chrome flex items-center gap-2 rounded-full px-3 py-2 shadow-glass-sm sm:gap-3">
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-pressed={isMuted}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    className={cn(
                      "lg-focus glass-interactive flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors",
                      isMuted ? "bg-foreground/90 text-background" : "bg-foreground/10",
                    )}
                  >
                    {isMuted ? (
                      <MicOff className="h-5 w-5" aria-hidden />
                    ) : (
                      <Mic className="h-5 w-5" aria-hidden />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={toggleCamera}
                    aria-pressed={isCameraOff}
                    aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
                    className={cn(
                      "lg-focus glass-interactive flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors",
                      isCameraOff ? "bg-foreground/90 text-background" : "bg-foreground/10",
                    )}
                  >
                    {isCameraOff ? (
                      <VideoOff className="h-5 w-5" aria-hidden />
                    ) : (
                      <Video className="h-5 w-5" aria-hidden />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpanded((v) => !v)}
                    aria-pressed={isExpanded}
                    aria-label={isExpanded ? "Exit full screen" : "Enter full screen"}
                    className="lg-focus glass-interactive flex h-11 w-11 items-center justify-center rounded-full bg-foreground/10 text-foreground"
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-5 w-5" aria-hidden />
                    ) : (
                      <Maximize2 className="h-5 w-5" aria-hidden />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={endCall}
                    aria-label="End call"
                    className="lg-focus glass-interactive flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-glass-sm hover:bg-red-600"
                  >
                    <PhoneOff className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
