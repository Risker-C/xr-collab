import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface GlassCardProps {
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  className?: string
  children?: ReactNode
}

export function GlassCard({ title, description, footer, className, children }: GlassCardProps) {
  return (
    <Card
      className={cn(
        'rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl',
        className,
      )}
    >
      {title || description ? (
        <CardHeader>
          {title ? <CardTitle className="text-white">{title}</CardTitle> : null}
          {description ? <CardDescription className="text-white/70">{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn(title || description ? 'pt-0' : 'pt-6')}>{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  )
}
