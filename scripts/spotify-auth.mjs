// One-time helper to obtain a Spotify refresh token for the Now Playing feature.
//
// Prereqs: create an app at https://developer.spotify.com/dashboard, then add
// this Redirect URI to its settings:  http://127.0.0.1:8888/callback
//
// Run:  SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-auth.mjs
//   (or: node scripts/spotify-auth.mjs <CLIENT_ID> <CLIENT_SECRET>)
//
// Approve in the browser; the refresh token is printed in the terminal.
import http from "node:http"
import { execFile } from "node:child_process"

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || process.argv[2]
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || process.argv[3]
const PORT = 8888
const REDIRECT = `http://127.0.0.1:${PORT}/callback`
const SCOPES = "user-read-currently-playing user-read-recently-played user-read-playback-state"

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Usage: SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-auth.mjs")
  process.exit(1)
}

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({ response_type: "code", client_id: CLIENT_ID, scope: SCOPES, redirect_uri: REDIRECT }).toString()

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT)
  if (!url.pathname.startsWith("/callback")) {
    res.writeHead(404)
    res.end()
    return
  }
  const code = url.searchParams.get("code")
  const err = url.searchParams.get("error")
  if (err || !code) {
    res.writeHead(400)
    res.end("Authorization failed: " + (err || "no code"))
    server.close()
    process.exit(1)
  }
  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
    })
    const data = await tokenRes.json()
    if (!data.refresh_token) {
      res.writeHead(500)
      res.end("No refresh_token returned: " + JSON.stringify(data))
      console.error(data)
      server.close()
      process.exit(1)
    }
    res.writeHead(200, { "Content-Type": "text/html" })
    res.end("<h1>✅ Done — close this tab.</h1><p>Your refresh token is printed in the terminal.</p>")
    console.log("\n=== SPOTIFY_REFRESH_TOKEN ===\n" + data.refresh_token + "\n")
    console.log("Then set the three Worker secrets:")
    console.log("  npx wrangler secret put SPOTIFY_CLIENT_ID")
    console.log("  npx wrangler secret put SPOTIFY_CLIENT_SECRET")
    console.log("  npx wrangler secret put SPOTIFY_REFRESH_TOKEN")
    server.close()
    process.exit(0)
  } catch (e) {
    res.writeHead(500)
    res.end(String(e))
    console.error(e)
    server.close()
    process.exit(1)
  }
})

server.listen(PORT, () => {
  console.log("\n1) Add this Redirect URI to your Spotify app settings:\n   " + REDIRECT)
  console.log("\n2) Approve in the browser (opening now; or paste the URL):\n   " + authUrl + "\n")
  execFile("open", [authUrl], () => {})
})
