import React, { ReactNode, useId } from 'react'

export function PromptBox({ title = 'Prompt', children }: { title?: string; children: ReactNode }) {
  const id = useId().replaceAll(':', '')
  const contentId = `prompt-${id}`

  return (
    <section className="box">
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
      <div id={contentId} className="notification is-light">
        {children}
      </div>
    </section>
  )
}
