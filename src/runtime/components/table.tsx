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

function parseColumns(value: unknown, rows: Array<Record<string, unknown>>): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }
  return rows[0] ? Object.keys(rows[0]) : []
}

function formatCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export type TableProps = {
  data: string | Array<Record<string, unknown>>
  columns?: string | string[]
  striped?: boolean
  bordered?: boolean
  narrow?: boolean
  hoverable?: boolean
  fullwidth?: boolean
}

export function Table({ data, columns, striped = true, bordered = false, narrow = false, hoverable = true, fullwidth = true }: TableProps) {
  const rows = parseJsonArray(data)
  const visibleColumns = parseColumns(columns, rows)
  const className = [
    'table',
    striped ? 'is-striped' : '',
    bordered ? 'is-bordered' : '',
    narrow ? 'is-narrow' : '',
    hoverable ? 'is-hoverable' : '',
    fullwidth ? 'is-fullwidth' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="table-container">
      <table className={className}>
        <thead>
          <tr>{visibleColumns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{visibleColumns.map((column) => <td key={column}>{formatCell(row[column])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
