import type { ImgHTMLAttributes } from 'react'
import { getStoredTheme } from '@/lib/theme'
import type { Theme } from '@/lib/theme'

// logo-light.png = dark wordmark, for light backgrounds.
// logo-dark.png  = white wordmark, for dark backgrounds.
export function Logo({
  theme,
  className,
  ...props
}: { theme?: Theme } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>) {
  const resolved = theme ?? getStoredTheme()
  const src = resolved === 'dark' ? '/logo-dark.png' : '/logo-light.png'
  return <img src={src} alt="Kodexo Labs" className={className} {...props} />
}
