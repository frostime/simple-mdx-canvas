import React, { ReactNode } from 'react'

export function Cards({ children }: { children: ReactNode }) {
  return <div className="columns is-multiline">{children}</div>
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="column is-one-third-desktop is-half-tablet">
      <section className="card">
        {title ? (
          <header className="card-header">
            <p className="card-header-title">{title}</p>
          </header>
        ) : null}
        <div className="card-content content">{children}</div>
      </section>
    </div>
  )
}
