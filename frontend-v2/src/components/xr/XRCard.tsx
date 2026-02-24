import type { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface XRCardProps {
  title: string
  description?: string
  footer?: ReactNode
  children?: ReactNode
  className?: string
}

export function XRCard({ title, description, footer, children, className }: XRCardProps) {
  return (
    <Card className={cn('glass-thin border-white/20 shadow-vision-1 backdrop-blur-md', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  )
}
