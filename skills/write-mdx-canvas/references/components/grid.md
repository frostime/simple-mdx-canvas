# Grid / Cell

Use `Grid` for denser region layouts. It maps to Bulma fixed-grid classes.

## Props

`Grid`:

| Prop | Required | Values |
|---|---:|---|
| `columns` | no | integer `1` to `12`; default `3` |

`Cell`:

| Prop | Required | Values |
|---|---:|---|
| `span` | no | integer `1` to `12` |

Markdown children are allowed.

## Example

```mdx
<Grid columns={3}>
<Cell>
<Callout type="tip" title="Layout">
Use layout components for structure, not decoration.
</Callout>
</Cell>
<Cell>
<Callout type="definition" title="Data">
Use `Table` for structured rows.
</Callout>
</Cell>
<Cell>
<Callout type="warning" title="Limit">
Prefer Markdown when it is clearer.
</Callout>
</Cell>
</Grid>
```

## Rules

- Use `Grid` for compact summaries, dashboards, or repeated blocks.
- Keep each `Cell` short.
- Avoid deeply nesting `Grid` inside `Grid`.
