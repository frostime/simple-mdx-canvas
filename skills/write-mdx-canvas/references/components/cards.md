# Cards / Card

Use `Cards` and `Card` for grouped concepts, options, modules, or short summaries.

## Props

`Cards` has no props. Markdown children are allowed.

`Card`:

| Prop | Required | Values |
|---|---:|---|
| `title` | no | card heading |

Markdown children are allowed.

## Example

```mdx
<Cards>
<Card title="Renderer">
Compiles controlled MDX and renders React output into a static HTML shell.
</Card>
<Card title="Registry">
Defines which components an agent may use and how their props are validated.
</Card>
<Card title="Theme">
Uses Bulma CSS variables plus small canvas-specific CSS.
</Card>
</Cards>
```

## Rules

- Keep each card short.
- Use `Cards` for peer items; use headings for sequential narrative.
- Use Markdown ordered lists for ordered processes instead of cards.
