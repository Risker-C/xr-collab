import type { ReactNode } from 'react'

import { GlassButton, type GlassButtonProps } from '@/components/vision-pro/GlassButton'
import { cn } from '@/lib/utils'

export interface FloatingMenuItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  buttonProps?: Omit<GlassButtonProps, 'children'>
}

export interface FloatingMenuProps {
  items: FloatingMenuItem[]
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function FloatingMenu({ items, orientation = 'horizontal', className }: FloatingMenuProps) {
  return (
    <nav
      aria-label="Floating controls"
      className={cn(
        'inline-flex rounded-2xl border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur-xl',
        orientation === 'horizontal' ? 'flex-row gap-2' : 'flex-col gap-2',
        className,
      )}
    >
      {items.map((item) => (
        <GlassButton
          key={item.key}
          variant="ghost"
          size="sm"
          className="min-w-[96px] justify-center gap-2"
          {...item.buttonProps}
        >
          {item.icon}
          <span>{item.label}</span>
        </GlassButton>
      ))}
    </nav>
  )
}
