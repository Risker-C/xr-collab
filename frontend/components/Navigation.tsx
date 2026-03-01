'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const links = [
    { href: '/vr', label: 'VR协作' },
    { href: '/scan', label: '3D扫描' },
    { href: '/about', label: '关于' }
  ]

  const linkClasses = (href: string) =>
    pathname === href
      ? 'text-white font-semibold'
      : 'text-gray-300 hover:text-white'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-white/10" aria-label="主导航">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-white font-bold text-xl" aria-label="XR Collab 首页">
            XR Collab
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className={linkClasses(link.href)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className={`block py-2 ${linkClasses(link.href)}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
