export function formatPercent(value: string): string {
  return value.endsWith('%') ? value : `${value}%`
}

export function trendLabel(trend: string): string {
  if (trend === 'up') return 'Improving'
  if (trend === 'down') return 'Needs attention'
  return 'Steady'
}
