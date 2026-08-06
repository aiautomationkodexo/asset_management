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

