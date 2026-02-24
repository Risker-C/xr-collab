import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type XRPanelIntensity = 'thin' | 'regular' | 'thick'

const panelIntensityClass: Record<XRPanelIntensity, string> = {
  thin: 'glass-thin',
  regular: 'glass-regular',
  thick: 'glass-thick',
}

export interface XRPanelProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: XRPanelIntensity
}

export function XRPanel({ intensity = 'regular', className, ...props }: XRPanelProps) {
  return (
    <section
      className={cn(
        panelIntensityClass[intensity],
        'rounded-[var(--radius-lg)] border border-white/20 p-5 shadow-vision-2',
        className,
      )}
      {...props}
    />
  )
}
