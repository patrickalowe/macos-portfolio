import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: 'apple-techie | macOS Portfolio',
  description: 'An interactive macOS Tahoe desktop, rebuilt in the browser — portfolio of apple-techie.',
  generator: 'Next.js',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sf">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {/* Global refractive-lens filter for .glass-lens (progressive enhancement) */}
          <svg
            aria-hidden="true"
            focusable="false"
            width="0"
            height="0"
            style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
          >
            <filter id="lg-lens" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" seed="7" result="noise" />
              <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="blurred"
                scale="18"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </svg>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
