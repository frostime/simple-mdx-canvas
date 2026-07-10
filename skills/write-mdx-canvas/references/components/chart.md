# Chart

Use `Chart` to render a Chart.js chart. The component passes the `config` prop to Chart.js after JSON parsing.

## Props

| Prop | Required | Values |
|---|---:|---|
| `config` | one of `config`/`from` | Chart.js configuration object as JSON string or object expression |
| `from` | one of `config`/`from` | name of a frontmatter `data:` declaration holding a whole Chart.js config; see `references/data-sources.md` |
| `title` | no | chart title displayed above the chart |
| `description` | no | short supporting text displayed above the chart |

Children are not allowed. Use a self-closing tag.

## Bar Example

```mdx
<Chart
  title="Output path complexity"
  description="Illustrative score: lower is simpler."
  config='{
    "type": "bar",
    "data": {
      "labels": ["Markdown", "MDX Canvas", "Full app"],
      "datasets": [
        { "label": "Complexity", "data": [1, 3, 8] }
      ]
    },
    "options": {
      "scales": {
        "y": { "beginAtZero": true }
      }
    }
  }'
/>
```

## Multi-Series Example

```mdx
<Chart
  title="Quarterly revenue"
  config='{
    "type": "line",
    "data": {
      "labels": ["Q1", "Q2", "Q3", "Q4"],
      "datasets": [
        { "label": "Product A", "data": [12, 19, 15, 22], "tension": 0.25 },
        { "label": "Product B", "data": [8, 11, 18, 20], "tension": 0.25 }
      ]
    }
  }'
/>
```

## Rules

- Write valid Chart.js configuration JSON in `config`.
- Prefer single-quoted MDX attributes around the JSON string.
- Use Chart.js `data.datasets`, `options.scales`, `options.plugins`, and other Chart.js fields directly.
- The renderer may fill missing theme defaults such as text color and responsiveness; it should not override explicit config values.
- Keep inline chart data small enough to read inside the MDX file.
- Prefer `Table` when exact values matter more than visual trend.
