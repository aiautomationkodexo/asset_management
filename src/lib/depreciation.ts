export function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()))
}

// Straight-line book value — for insurance/resale value.
export function bookValue(cost: number, salvage: number, usefulLifeMonths: number, inServiceDate: string, asOf: Date): number {
  if (!usefulLifeMonths || usefulLifeMonths <= 0) return cost
  const elapsed = Math.min(usefulLifeMonths, monthsBetween(new Date(inServiceDate), asOf))
  const monthlyDep = (cost - salvage) / usefulLifeMonths
  return Math.max(salvage, cost - monthlyDep * elapsed)
}

// Same §7.1 straight-line formula as bookValue(), parameterized by a raw
// months-elapsed count instead of derived from calendar dates — used by the
// planning calculator, which has no in-service date yet.
export function bookValueAtMonths(cost: number, salvage: number, usefulLifeMonths: number, monthsElapsed: number): number {
  if (!usefulLifeMonths || usefulLifeMonths <= 0) return cost
  const elapsed = Math.min(usefulLifeMonths, monthsElapsed)
  const monthlyDep = (cost - salvage) / usefulLifeMonths
  return Math.max(salvage, cost - monthlyDep * elapsed)
}

export interface ReducingBalanceYear {
  year: number
  opening: number
  charge: number
  closing: number
}

// §7.2 tax-basis reducing balance — a separate track from book value, never
// merged with it. taxRatePercent is a whole-number percent (15 for 15%).
export function reducingBalanceSchedule(cost: number, taxRatePercent: number, years: number): ReducingBalanceYear[] {
  const rate = taxRatePercent / 100
  const rows: ReducingBalanceYear[] = []
  let opening = cost
  for (let year = 1; year <= years; year++) {
    const charge = opening * rate
    const closing = opening - charge
    rows.push({ year, opening, charge, closing })
    opening = closing
  }
  return rows
}

