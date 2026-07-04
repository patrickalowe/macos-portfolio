import { ExternalLink } from "lucide-react"

const PROFILE_URL = "https://www.linkedin.com/in/patrickalowe"
const BLUE = "#0a66c2"

/**
 * LinkedIn-style profile card shown inside the Safari mini browser.
 * LinkedIn blocks iframing of real profile pages and its badge widget is
 * unreliable in embedded contexts, so this page renders the profile
 * content directly.
 */
export default function LinkedInPage() {
  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8 text-foreground">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-background shadow-lg">
        {/* Banner + avatar */}
        <div className="h-28 bg-gradient-to-r from-[#0a66c2] to-[#004182]" />
        <div className="px-6 pb-6">
          <img
            src="/spotify-avatar.jpg"
            alt="Patrick Lowe"
            className="-mt-12 h-24 w-24 rounded-full border-4 border-background object-cover"
            draggable={false}
          />
          <h1 className="mt-3 text-2xl font-bold">Patrick Lowe</h1>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            Customer Success &amp; AI Adoption Leader · 10+ years across sales, onboarding, enablement, and retention
          </p>

          <a
            href={PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: BLUE }}
          >
            <ExternalLink className="h-4 w-4" />
            View full profile on LinkedIn
          </a>
        </div>

        {/* About */}
        <section className="border-t border-border/60 px-6 py-5">
          <h2 className="mb-2 text-lg font-semibold">About</h2>
          <p className="text-sm leading-relaxed text-foreground/85">
            I help teams turn AI-powered tools and CRM platforms into simple, durable workflows they actually use day
            to day — combining customer success, AI workflow design, and executive communication for SaaS/AI companies
            where adoption, retention, and real business outcomes matter more than features.
          </p>
        </section>

        {/* Experience */}
        <section className="border-t border-border/60 px-6 py-5">
          <h2 className="mb-3 text-lg font-semibold">Experience</h2>
          <ul className="flex flex-col gap-4">
            <li>
              <p className="text-sm font-semibold">Westcoast Auto — AI CRM Implementation Lead</p>
              <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">
                Led the rollout of Matador.AI, taking the team from 40% to 95% adoption in 90 days and lifting monthly
                transaction volume ~60% through structured training, workflow design, and performance reviews. Owned
                $300K+ in monthly pipeline forecasting and weekly executive reporting.
              </p>
            </li>
            <li>
              <p className="text-sm font-semibold">QRFlow.co — Account Executive &amp; Customer Success</p>
              <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">
                Hybrid AE/CS partner: closed 45 new logos in the first three months while guiding customers through
                use-case mapping, campaign design, and post-sale activation.
              </p>
            </li>
            <li>
              <p className="text-sm font-semibold">Builder — AI &amp; CRM tooling</p>
              <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">
                Built an AI sales-call prep agent with Claude Code, and a live CRM dashboard on Google Sheets + Apps
                Script that helped an early-stage client grow revenue 4x in six months.
              </p>
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
