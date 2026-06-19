/**
 * Typed, centralized environment access. No secret is ever required — every
 * upstream-backed route falls back to realistic mock data when a key is absent,
 * so the portfolio always renders fully even on a clean clone.
 */

export const env = {
  /** Optional. Raises GitHub REST limits from 60 to 5000 req/hr. Never commit. */
  githubToken: process.env.GITHUB_TOKEN?.trim() || "",
  /** GitHub username the portfolio showcases. */
  githubUser: process.env.NEXT_PUBLIC_GITHUB_USER?.trim() || "daprior",
  /** Open-Meteo base URLs (no API key needed). */
  weatherBase: process.env.WEATHER_API_BASE?.trim() || "https://api.open-meteo.com/v1/forecast",
  geocodeBase: process.env.GEOCODE_API_BASE?.trim() || "https://geocoding-api.open-meteo.com/v1/search",
}

export function hasGithubAuth(): boolean {
  return env.githubToken.length > 0
}
