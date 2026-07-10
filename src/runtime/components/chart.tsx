import React from 'react'

export type ChartProps = {
  title?: string
  description?: string
  config: string | Record<string, unknown>
}

export function Chart(props: ChartProps) {
  const config = parseChartConfig(props.config)

  return (
    <section className="box">
      {props.title ? <h3 className="title is-5">{props.title}</h3> : null}
      {props.description ? <p className="subtitle is-6">{props.description}</p> : null}
      <div className="chart-container">
        <canvas data-canvas-chart={JSON.stringify(config)} aria-label={props.title ?? 'Chart'} />
      </div>
    </section>
  )
}

function parseChartConfig(config: ChartProps['config']): Record<string, unknown> {
  if (typeof config !== 'string') return config

  try {
    const parsed = JSON.parse(config) as unknown
    return isObject(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
