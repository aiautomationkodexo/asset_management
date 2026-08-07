import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Display-only formatting for raw db/enum values: "in_repair" -> "In repair".
// Never use this on a value before it's written back to the database.
export function sentenceCase(value: string): string {
  const withSpaces = value.replace(/_/g, ' ')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

// Local (not UTC) "today" in the yyyy-mm-dd shape a date <input> expects.
export function todayDateInputValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Combines a date-only <input type="date"> value with the current wall-clock
// time, so an untouched field (still "today") produces the same instant as
// now() would, while a backdated field keeps a sensible time-of-day instead
// of collapsing to midnight.
export function dateInputToTimestamp(dateValue: string): string {
  const now = new Date()
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  ).toISOString()
}
