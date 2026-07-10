import React, { ReactNode } from 'react'

const allowedTags = new Set([
  'a',
  'article',
  'blockquote',
  'br',
  'caption',
  'code',
  'div',
  'em',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
])

const dropWithContent = /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|textarea|select|option|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi
const dropVoid = /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|textarea|select|option|svg|math)\b[^>]*\/?>/gi

export type HtmlBlockProps = {
  /** Render children as raw HTML without sanitization. Use only for trusted local documents. */
  unsafe?: boolean
  /** Backward-compatible string input. Prefer fenced html children for new documents. */
  html?: string
  children?: ReactNode
}

export function HtmlBlock({ unsafe = false, html, children }: HtmlBlockProps) {
  const fragment = html ?? extractText(children).trim()
  const renderedHtml = unsafe ? decodeHtmlEntities(fragment) : sanitizeHtmlFragment(decodeHtmlEntities(fragment))

  return <div className="html-block" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (React.isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children)
  return ''
}

function sanitizeHtmlFragment(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(dropWithContent, '')
    .replace(dropVoid, '')
    .replace(/<\/?([A-Za-z][A-Za-z0-9:-]*)(\s[^<>]*)?>/g, (tag, rawName: string, rawAttrs = '') => {
      const name = rawName.toLowerCase()
      if (!allowedTags.has(name)) return ''
      if (tag.startsWith('</')) return `</${name}>`
      return `<${name}${sanitizeAttributes(name, rawAttrs)}>`
    })
}

function sanitizeAttributes(tagName: string, rawAttrs: string): string {
  const attrs: string[] = []
  const attrRegex = /([A-Za-z_:][A-Za-z0-9_:.:-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g

  for (const match of rawAttrs.matchAll(attrRegex)) {
    const name = match[1].toLowerCase()
    if (name.startsWith('on') || name === 'style') continue
    if (!isAllowedAttribute(tagName, name)) continue

    const rawValue = match[2]
    const value = rawValue ? unquote(rawValue) : ''
    if ((name === 'href' || name === 'src') && !isSafeUrl(value, name === 'src' && tagName === 'img')) continue

    if (name === 'target') {
      attrs.push(`${name}="${escapeAttribute(value)}"`)
      attrs.push('rel="noopener noreferrer"')
      continue
    }

    attrs.push(rawValue == null ? name : `${name}="${escapeAttribute(value)}"`)
  }

  return attrs.length ? ` ${attrs.join(' ')}` : ''
}

function isAllowedAttribute(tagName: string, name: string): boolean {
  if (name === 'class' || name === 'id' || name === 'title' || name === 'role') return true
  if (name.startsWith('aria-')) return true
  if (name.startsWith('data-')) return true

  if (tagName === 'a') return name === 'href' || name === 'target' || name === 'rel'
  if (tagName === 'img') return name === 'src' || name === 'alt' || name === 'width' || name === 'height' || name === 'loading'
  if (tagName === 'td' || tagName === 'th') return name === 'colspan' || name === 'rowspan'

  return false
}

function isSafeUrl(value: string, allowImageData: boolean): boolean {
  const url = decodeHtmlEntities(value).trim().replace(/[\u0000-\u001F\u007F\s]+/g, '')
  if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(url)) return true
  if (allowImageData && /^data:image\/(png|gif|jpeg|jpg|webp|svg\+xml);base64,/i.test(url)) return true
  return !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(url)
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
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

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
