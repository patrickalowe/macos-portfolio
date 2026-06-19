import { json } from "@/lib/api/http"
import type { TracksResponse } from "@/lib/api/types"

export const revalidate = 3600

/**
 * Static track manifest. The audio + cover files are served as static assets
 * (works on the Workers runtime, which can't scan the /public dir at request time).
 * Add entries here as audio is added to /public.
 */
const TRACKS: TracksResponse = {
  tracks: [
    {
      id: "lofi-study",
      title: "Lofi Study",
      artist: "FASSounds",
      src: "/lofi-study-112191.mp3",
      durationSec: 145,
      cover: "/cozy-corner-beats.png",
    },
  ],
}

export async function GET() {
  return json(TRACKS, "live")
}
