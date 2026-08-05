import type { ButtonHTMLAttributes } from 'react'
import type { ButtonVariant } from './buttonStyles'
import { buttonClass } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={buttonClass(variant, className)} {...props} />
}
