const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function formatINR(value: number) {
  return `₹ ${inr.format(value)}`
}

export function formatPoints(value: number, label = 'pts') {
  return `${inr.format(value)} ${label}`
}

export function formatNumber(value: number) {
  return inr.format(value)
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
