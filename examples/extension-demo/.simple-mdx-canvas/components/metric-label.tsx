import { formatPercent, trendLabel } from './format.ts'

type MetricLabelProps = {
  label?: string
  value?: string
  trend?: string
}

export default function MetricLabel({
  label = 'Metric',
  value = '0',
  trend = 'steady',
}: MetricLabelProps) {
  const color = trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'info'

  return (
    <section className={`notification is-${color} is-light`}>
      <p className="heading">{label}</p>
      <p className="title is-3">{formatPercent(value)}</p>
      <p>{trendLabel(trend)}</p>
    </section>
  )
}
