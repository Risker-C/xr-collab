import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'XR Collab - WebXR协作平台',
  description: '支持VR协作和3D扫描的现代化WebXR平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Navigation />
        <main className="pt-16 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
          {children}
        </main>
      </body>
    </html>
  )
}