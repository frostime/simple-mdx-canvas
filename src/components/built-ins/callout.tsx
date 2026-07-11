import React, { ReactNode } from 'react'

export function Callout({ type = 'note', title, children }: { type?: string; title?: string; children: ReactNode }) {
  return (
    <article className={`message ${calloutColor(type)}`}>
      {title ? (
        <div className="message-header">
          <p>{title}</p>
        </div>
      ) : null}
      <div className="message-body">{children}</div>
    </article>
  )
}

function calloutColor(type: string): string {
  switch (type) {
    case 'tip':
      return 'is-success'
    case 'warning':
      return 'is-warning'
    case 'danger':
      return 'is-danger'
    case 'definition':
      return 'is-info'
    case 'summary':
      return 'is-link'
    default:
      return 'is-info'
  }
}
