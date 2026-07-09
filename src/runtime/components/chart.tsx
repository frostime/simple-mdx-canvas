import React from 'react'

function parseJsonArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : []
  } catch {
    return []
  }
}

function numeric(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function label(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

export type ChartProps = {
  type: 'bar' | 'line' | 'pie' | 'scatter'
  title?: string
  description?: string
  x?: string
  y?: string
  data: string | Array<Record<string, unknown>>
}

export function Chart(props: ChartProps) {
  const rows = parseJsonArray(props.data)
  const xKey = props.x ?? 'x'
  const yKey = props.y ?? 'y'
  const spec = toChartJsSpec(props.type, rows, xKey, yKey, props.title)

  return (
    <section className="box">
      {props.title ? <h3 className="title is-5">{props.title}</h3> : null}
      {props.description ? <p className="subtitle is-6">{props.description}</p> : null}
      <div className="chart-container">
        <canvas data-canvas-chart={JSON.stringify(spec)} aria-label={props.title ?? 'Chart'} />
      </div>
    </section>
  )
}

type ChartJsSpec = {
  type: 'bar' | 'line' | 'pie' | 'scatter'
  data: Record<string, unknown>
  options: Record<string, unknown>
}

function toChartJsSpec(
  type: ChartProps['type'],
  rows: Array<Record<string, unknown>>,
  xKey: string,
  yKey: string,
  title?: string,
): ChartJsSpec {
  const labels = rows.map((row) => label(row[xKey]))
  const values = rows.map((row) => numeric(row[yKey]))
  const baseDataset = {
    label: title ?? yKey,
    data: values,
  }

  if (type === 'scatter') {
    return {
      type,
      data: {
        datasets: [
          {
            label: title ?? `${xKey} vs ${yKey}`,
            data: rows.map((row) => ({ x: numeric(row[xKey]), y: numeric(row[yKey]) })),
          },
        ],
      },
      options: baseOptions(),
    }
  }

  return {
    type,
    data: {
      labels,
      datasets: [baseDataset],
    },
    options: baseOptions(),
  }
}

function baseOptions(): Record<string, unknown> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  }
}
