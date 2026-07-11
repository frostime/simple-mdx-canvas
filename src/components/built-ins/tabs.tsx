import React, { ReactElement, ReactNode } from 'react'

export function Tabs({ children }: { children: ReactNode }) {
  const tabs = React.Children.toArray(children).filter(React.isValidElement) as ReactElement<{ title?: string; children?: ReactNode }>[]

  return (
    <section className="box" data-canvas-tabs>
      <div className="tabs is-boxed">
        <ul>
          {tabs.map((tab, index) => {
            const title = tab.props.title ?? `Tab ${index + 1}`
            return (
              <li key={index} className={index === 0 ? 'is-active' : undefined} data-canvas-tab-nav={index}>
                <a>{title}</a>
              </li>
            )
          })}
        </ul>
      </div>
      {tabs.map((tab, index) => (
        <div key={index} className={index === 0 ? 'content' : 'content is-hidden'} data-canvas-tab-panel={index}>
          {tab.props.children}
        </div>
      ))}
    </section>
  )
}

export function Tab({ children }: { title: string; children: ReactNode }) {
  return <>{children}</>
}
