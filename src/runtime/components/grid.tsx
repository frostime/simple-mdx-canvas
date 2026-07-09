import React, { ReactNode } from 'react'

export function Grid({ columns = 3, children }: { columns?: number; children: ReactNode }) {
  const safeColumns = Math.min(Math.max(Number(columns) || 3, 1), 12)
  return (
    <div className={`fixed-grid has-${safeColumns}-cols`}>
      <div className="grid">{children}</div>
    </div>
  )
}

export function Cell({ span, children }: { span?: number; children: ReactNode }) {
  const safeSpan = span ? Math.min(Math.max(Number(span), 1), 12) : undefined
  return <div className={safeSpan ? `cell is-col-span-${safeSpan}` : 'cell'}>{children}</div>
}
