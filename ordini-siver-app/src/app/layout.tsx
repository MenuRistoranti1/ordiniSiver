import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

import { ToastProvider } from "@/components/Toast"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "OrdiniSiver",
  description: "Gestione ordini e giacenze",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "OrdiniSiver",
    statusBarStyle: "black-translucent",
  },
icons: {
  icon: [
    { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
},
}

export const viewport: Viewport = {
  themeColor: "#07122A",
  /*
    Con la barra di stato trasparente la pagina occupa tutto lo schermo:
    serve "cover" perché env(safe-area-inset-*) smetta di valere zero e le
    barre fisse possano stare sopra la barra dei gesti dell'iPhone.
  */
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-slate-100 text-slate-950">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}