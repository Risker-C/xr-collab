import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type GlassPanelIntensity = 'thin' | 'regular' | 'thick'

const panelIntensityClass: Record<GlassPanelIntensity, string> = {
  thin: 'bg-white/10 backdrop-blur-md',
  regular: 'bg-white/10 backdrop-blur-xl',
  thick: 'bg-white/15 backdrop-blur-glass',
}

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: GlassPanelIntensity
}

export function GlassPanel({ intensity = 'regular', className, ...props }: GlassPanelProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/20 shadow-2xl',
        panelIntensityClass[intensity],
        className,
      )}
      {...props}
    />
  )
}
