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

// Reducing-balance tax value — annualRate is a fraction (0.2 = 20%/yr),
// configurable per category via asset_categories.default_tax_depr_rate.
export function taxValue(cost: number, annualRate: number, inServiceDate: string, asOf: Date): number {
  if (!annualRate) return cost
  const elapsed = monthsBetween(new Date(inServiceDate), asOf)
  const monthlyRate = annualRate / 12
  return cost * Math.pow(1 - monthlyRate, elapsed)
}

export function periodStart(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
}
