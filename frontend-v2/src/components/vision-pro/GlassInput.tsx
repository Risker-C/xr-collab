import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type GlassInputProps = React.ComponentProps<typeof Input>

const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      className={cn(
        'h-11 rounded-2xl border border-white/20 bg-white/10 text-white placeholder:text-white/60',
        'backdrop-blur-xl shadow-2xl focus-visible:ring-white/50',
        className,
      )}
      {...props}
    />
  )
})

GlassInput.displayName = 'GlassInput'

export { GlassInput }
