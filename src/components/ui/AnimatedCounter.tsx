import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { cn } from '@/lib/utils'

export function AnimatedCounter({
  value,
  duration = 0.8,
  className,
}: {
  value: number
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const displayed = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const tween = gsap.to(displayed, {
      current: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = Math.round(displayed.current).toLocaleString()
      },
    })
    return () => {
      tween.kill()
    }
  }, [value, duration])

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      0
    </span>
  )
}
