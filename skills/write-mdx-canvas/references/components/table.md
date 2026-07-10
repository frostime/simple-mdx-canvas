# Table

Use `Table` for JSON-backed structured rows rendered as a Bulma table.

## Props

| Prop | Required | Values |
|---|---:|---|
| `data` | yes | JSON array string or array expression |
| `columns` | no | JSON string array, string array, or comma-separated string |
| `striped` | no | boolean; default `true` |
| `bordered` | no | boolean; default `false` |
| `narrow` | no | boolean; default `false` |
| `hoverable` | no | boolean; default `true` |
| `fullwidth` | no | boolean; default `true` |

Children are not allowed. Use a self-closing tag.

## Example

```mdx
<Table
  columns='["component", "purpose", "basis"]'
  data='[
    { "component": "Chart", "purpose": "Visualize numeric data", "basis": "Chart.js" },
    { "component": "Table", "purpose": "Show structured rows", "basis": "Bulma table" }
  ]'
/>
```

## Compact Example

```mdx
<Table columns="name,status" data='[{"name":"Build","status":"pass"}]' />
```

## Rules

- Use `Table` when rows come from structured data or exact values matter.
- Use normal GFM tables for small prose comparisons.
- Keep object keys stable across rows.
