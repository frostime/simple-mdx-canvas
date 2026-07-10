# Bulma JSX

Bulma JSX is not a registered component. It is ordinary MDX JSX that uses Bulma CSS classes already included by the renderer.

Use it for small one-off structures when no semantic component fits.

## Example

```mdx
<div className="box">
  <p className="title is-5">Decision</p>
  <p className="subtitle is-6">Short supporting line.</p>
  <div className="content">
    Markdown-like text inside JSX must still be valid MDX/JSX.
  </div>
</div>
```

## Attribute Rules

Use React attribute names:

| HTML | MDX JSX |
|---|---|
| `class` | `className` |
| `for` | `htmlFor` |
| inline style string | avoid; use classes or theme CSS |

## Safety Rules

Do not use:

- `<script>`;
- `<style>`;
- event handlers such as `onClick`, `onLoad`, `onMouseEnter`;
- `href="javascript:..."`;
- full-page tags such as `<html>`, `<head>`, or `<body>`.

## When to Avoid

Avoid Bulma JSX when a semantic component exists. For example, use `Callout` instead of hand-writing a Bulma message block unless a one-off class combination is truly needed.
