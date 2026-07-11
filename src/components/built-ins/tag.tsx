import React, { ReactNode } from 'react'

const colors = new Set(['black', 'dark', 'light', 'white', 'primary', 'link', 'info', 'success', 'warning', 'danger'])
const sizes = new Set(['normal', 'medium', 'large'])

export function Tags({ children }: { children: ReactNode }) {
  return <div className="tags">{children}</div>
}

export function Tag({ color, size, rounded = false, light = false, children }: { color?: string; size?: string; rounded?: boolean; light?: boolean; children: ReactNode }) {
  const className = [
    'tag',
    color && colors.has(color) ? `is-${color}` : '',
    size && sizes.has(size) ? `is-${size}` : '',
    rounded ? 'is-rounded' : '',
    light ? 'is-light' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return <span className={className}>{children}</span>
}
