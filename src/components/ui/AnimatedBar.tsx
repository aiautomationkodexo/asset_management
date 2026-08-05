import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function AnimatedBar({
  percent,
  color = 'bg-soft-blue',
  delay = 0,
  className,
}: {
  percent: number
  color?: string
  delay?: number
  className?: string
}) {
  return (
    <div className={cn('h-2 flex-1 overflow-hidden rounded-radius-pill bg-bg-alt', className)}>
      <motion.div
        className={cn('h-full rounded-radius-pill', color)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        transition={{ duration: 0.7, ease: 'easeOut', delay }}
      />
    </div>
  )
}
