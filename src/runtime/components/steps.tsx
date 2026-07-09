import React, { ReactNode } from 'react'

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="smc-steps">{children}</ol>
}

export function Step({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <li className="smc-step">
      {title ? <strong>{title}</strong> : null}
      <div className="content">{children}</div>
    </li>
  )
}
