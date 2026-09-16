import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "SYNTRA | AI-Powered Business Automation",
    template: "%s | SYNTRA",
  },
  description:
    "AI-powered websites, workflows, marketing and business automation systems that work while you focus on what matters.",
  keywords: ["AI automation", "business automation", "AI website builder", "marketing automation"],
  openGraph: {
    type: "website",
    siteName: "SYNTRA",
    title: "SYNTRA | AI-Powered Business Automation",
    description: "Build. Automate. Scale.",
    images: [{ url: "/logo-banner.png", width: 1344, height: 768, alt: "SYNTRA | The AI Operating System for Modern Business" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SYNTRA",
    description: "AI-Powered Business Automation",
    images: ["/logo-banner.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-base text-text-primary antialiased">{children}</body>
    </html>
  )
}
