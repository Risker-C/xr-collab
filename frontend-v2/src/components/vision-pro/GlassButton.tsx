import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type GlassButtonVariant = 'primary' | 'secondary' | 'ghost'

const buttonVariantMap: Record<GlassButtonVariant, NonNullable<ButtonProps['variant']>> = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
}

export interface GlassButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: GlassButtonVariant
  glow?: boolean
}

export function GlassButton({ variant = 'primary', glow = true, className, ...props }: GlassButtonProps) {
  return (
    <Button
      variant={buttonVariantMap[variant]}
      className={cn(
        'rounded-2xl border border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur-xl',
        'transition-all duration-200 hover:scale-[1.01] hover:bg-white/20 active:scale-[0.99]',
        variant === 'ghost' && 'bg-transparent hover:bg-white/10',
        variant === 'secondary' && 'bg-white/15',
        glow && 'shadow-[0_12px_36px_rgba(10,132,255,0.28)]',
        className,
      )}
      {...props}
    />
  )
}
