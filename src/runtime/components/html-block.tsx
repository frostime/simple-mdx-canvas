import React, { ReactNode } from 'react'

export type HtmlBlockProps = {
  children?: ReactNode
}

export function HtmlBlock({ children }: HtmlBlockProps) {
  const fragment = decodeHtmlEntities(extractText(children).trim())
  return <div className="html-block" dangerouslySetInnerHTML={{ __html: fragment }} />
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (React.isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children)
  return ''
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}
