# Examples

Build the CLI once before trying any example:

```bash
npm run build
```

## Standalone Documents

| File | What it exercises |
| --- | --- |
| `report.mdx` | Broad component tour, frontmatter data, math, code, and tabs. |
| `product-brief.mdx` | Narrative product brief using columns, cards, tags, grid, figure, and prompt box. |
| `operations-dashboard.mdx` | External JSON, `$derive`, `from`, projections, table, and chart. |
| `decision-record.mdx` | Decision record using prose, callouts, comparison tabs, and a compact table. |
| `html-block-demo.mdx` | Trusted `HtmlBlock` markup with small native DOM behavior. |

Validate and render any standalone example from the repository root:

```bash
node dist/cli.js validate examples/product-brief.mdx
node dist/cli.js render examples/product-brief.mdx -o examples/product-brief.html
```

## Local Theme Project

`theme-demo/` is a self-contained authoring project. Its local config selects
`themes/signal.css` through frontmatter.

```bash
cd examples/theme-demo
node ../../dist/cli.js validate status.mdx
node ../../dist/cli.js render status.mdx -o status.html
```

## Static TSX Extension Project

`extension-demo/` registers `MetricLabel` from trusted TSX source and imports a
local TypeScript helper. It uses the same extension layout created by `smc init`.

```bash
cd examples/extension-demo
node ../../dist/cli.js list-components
node ../../dist/cli.js validate profile.mdx
node ../../dist/cli.js render profile.mdx -o profile.html
```

When copied to a separate authoring project, install the package and React
before using a TSX extension:

```bash
npm install simple-mdx-canvas react
```

Rendered `.html` files are ignored by Git and can be opened directly in a
browser.
