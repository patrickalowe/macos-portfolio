import { defineConfig } from "vite"
import vinext from "vinext"
import { cloudflare } from "@cloudflare/vite-plugin"

// vinext (Vite-based Next.js API surface) targeting Cloudflare Workers.
// vinext auto-registers @vitejs/plugin-rsc when it detects app/, so we don't add it here.
export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
})
