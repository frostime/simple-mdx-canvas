import React, { ReactNode } from 'react'

export function Columns({ children }: { children: ReactNode }) {
  return <div className="columns">{children}</div>
}

export function Column({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="column">
      {title ? <h3 className="title is-5">{title}</h3> : null}
      {children}
    </section>
  )
}
