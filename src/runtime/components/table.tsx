import React from 'react'

type TableColumn = {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

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

function parseColumns(value: unknown, rows: Array<Record<string, unknown>>): TableColumn[] {
  if (Array.isArray(value)) return value.map(toColumn).filter(isTableColumn)
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.map(toColumn).filter(isTableColumn)
    } catch {
      return value.split(',').map((item) => toColumn(item.trim())).filter(isTableColumn)
    }
  }
  return rows[0] ? Object.keys(rows[0]).map((key) => ({ key, label: key })) : []
}

function isTableColumn(value: TableColumn | undefined): value is TableColumn {
  return Boolean(value)
}

function toColumn(value: unknown): TableColumn | undefined {
  if (typeof value === 'string' && value) return { key: value, label: value }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const raw = value as Record<string, unknown>
  if (typeof raw.key !== 'string' || !raw.key) return undefined

  return {
    key: raw.key,
    label: typeof raw.label === 'string' && raw.label ? raw.label : raw.key,
    align: raw.align === 'center' || raw.align === 'right' || raw.align === 'left' ? raw.align : undefined,
  }
}

function formatCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function alignClass(align: TableColumn['align']): string | undefined {
  if (align === 'center') return 'has-text-centered'
  if (align === 'right') return 'has-text-right'
  return undefined
}

export type TableProps = {
  data: string | Array<Record<string, unknown>>
  columns?: string | Array<string | TableColumn>
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
          <tr>{visibleColumns.map((column) => <th key={column.key} className={alignClass(column.align)}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{visibleColumns.map((column) => <td key={column.key} className={alignClass(column.align)}>{formatCell(row[column.key])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
