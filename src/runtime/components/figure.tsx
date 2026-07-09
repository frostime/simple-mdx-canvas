import React from 'react'

export function Figure({ src, alt = '', caption, source }: { src: string; alt?: string; caption?: string; source?: string }) {
  return (
    <figure className="box">
      <img className="image" src={src} alt={alt} />
      {caption || source ? (
        <figcaption className="help mt-2">
          {caption ? <span>{caption}</span> : null}
          {source ? <small className="is-block">Source: {source}</small> : null}
        </figcaption>
      ) : null}
    </figure>
  )
}
