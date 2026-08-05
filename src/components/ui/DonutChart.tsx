import { motion } from 'framer-motion'

export interface DonutSegment {
  label: string
  value: number
  color: string // a CSS color value, e.g. 'var(--soft-blue)'
}

export function DonutChart({
  segments,
  size = 176,
  strokeWidth = 20,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string
}) {
  const radius = (size - strokeWidth) / 2
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1

  let cumulativeFraction = 0
  const arcs = segments.map((segment) => {
    const fraction = segment.value / total
    const rotationDeg = cumulativeFraction * 360
    cumulativeFraction += fraction
    return { ...segment, fraction, rotationDeg }
  })

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        {arcs.map((arc, i) => (
          <motion.circle
            key={arc.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ rotate: arc.rotationDeg, transformOrigin: '50% 50%' }}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: arc.fraction }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: i * 0.1 }}
          />
        ))}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="text-h5 leading-none">{centerValue}</span>}
          {centerLabel && <span className="text-body-xs text-text-secondary">{centerLabel}</span>}
        </div>
      )}
    </div>
  )
}
