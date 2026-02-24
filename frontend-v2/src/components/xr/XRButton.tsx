import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface XRButtonProps extends ButtonProps {
  domOverlay?: boolean
}

export function XRButton({ domOverlay = true, className, ...props }: XRButtonProps) {
  return (
    <Button
      data-dom-overlay={domOverlay ? 'true' : undefined}
      className={cn(
        'pointer-events-auto touch-manipulation select-none shadow-vision-1 backdrop-blur-xs',
        'glass-interactive',
        className,
      )}
      {...props}
    />
  )
}
