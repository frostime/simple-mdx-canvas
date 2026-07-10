# Chart

Use `Chart` for numeric visualization: bar, line, pie, or scatter.

## Props

| Prop | Required | Values |
|---|---:|---|
| `type` | yes | `"bar"`, `"line"`, `"pie"`, `"scatter"` |
| `data` | yes | JSON array string or array expression |
| `x` | no | field name for labels/x values; defaults to `x` |
| `y` | no | field name for numeric values; defaults to `y` |
| `title` | no | chart title |
| `description` | no | short supporting text |

Children are not allowed. Use a self-closing tag.

## Example

```mdx
<Chart
  type="bar"
  title="Output path complexity"
  description="Illustrative score: lower is simpler."
  x="path"
  y="complexity"
  data='[
    { "path": "Markdown", "complexity": 1 },
    { "path": "MDX Canvas", "complexity": 3 },
    { "path": "Full app", "complexity": 8 }
  ]'
/>
```

## Scatter Example

```mdx
<Chart
  type="scatter"
  title="Cost vs quality"
  x="cost"
  y="quality"
  data='[
    { "cost": 1.2, "quality": 72 },
    { "cost": 2.5, "quality": 81 }
  ]'
/>
```

## Rules

- Use `Chart` only for numeric data.
- Keep data rows small enough to read inside the MDX file.
- Do not pass raw Chart.js configuration; the component exposes a constrained schema.
- Prefer `Table` when exact values matter more than visual trend.
