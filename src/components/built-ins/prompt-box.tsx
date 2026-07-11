import React, { ReactNode, useId } from 'react'

export function PromptBox({
  title = 'Prompt',
  text,
  children,
}: {
  title?: string
  /** Plain prompt text. Prefer children when Markdown formatting is needed. */
  text?: string
  children?: ReactNode
}) {
  const id = useId().replaceAll(':', '')
  const contentId = `prompt-${id}`

  return (
    <section className="box prompt-box">
      <div className="level is-mobile mb-2">
        <div className="level-left">
          <strong>{title}</strong>
        </div>
        <div className="level-right">
          <button className="button is-small" type="button" data-copy-target={`#${contentId}`}>
            Copy
          </button>
        </div>
      </div>
      <div id={contentId} className="notification is-light content prompt-box-content">
        {text ? <div className="prompt-box-text">{text}</div> : children}
      </div>
    </section>
  )
}
