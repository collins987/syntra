import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "SYNTRA Admin", template: "%s | SYNTRA Admin" },
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-base text-text-primary antialiased">{children}</body>
    </html>
  )
}
