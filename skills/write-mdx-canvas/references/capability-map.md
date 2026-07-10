# MDX Canvas Capability Map

This file describes what `simple-mdx-canvas` can express. It does not prescribe a document outline. The Agent should choose structure from the user's task, source material, and audience.

## Content Layers

A canvas document may combine these layers:

| Layer | Use for | Notes |
|---|---|---|
| GFM Markdown | ordinary prose, headings, lists, blockquotes, fenced code, simple tables, links, images | Fenced code is syntax-highlighted when a language is provided; text/Markdown-like fences wrap by default. |
| Math | inline or display equations | Use `$...$` and `$$...$$`. |
| Registered components | charts, callouts, tables, grids, cards, tabs, figures, prompts, HTML fragments | Props must match component schemas. |
| Bulma JSX | small one-off visual blocks using Bulma CSS classes | Use `className`; avoid scripts, styles, and event handlers. |

## Available Visual Capabilities

| Expression need | Available capability |
|---|---|
| Emphasized note, risk, definition, summary, or decision | `Callout` |
| Chart.js-supported visualization | `Chart` with Chart.js `config` |
| Structured rows from JSON-like data | `Table` |
| Side-by-side content | `Columns` / `Column` |
| Dense region layout | `Grid` / `Cell` |
| Grouped concepts, options, modules, or cards | `Cards` / `Card` |
| Compact labels, states, categories | `Tags` / `Tag` |
| Alternative views, platforms, modes, versions | `Tabs` / `Tab` |
| Ordered workflow or procedure | `Steps` / `Step` |
| Image with caption/source | `Figure` |
| Copy-oriented prompt, command, or instruction block | `PromptBox` |
| Small HTML fragment using Bulma classes | `HtmlBlock` |
| Small Bulma CSS block written as JSX | Bulma JSX |

## Component Use Is Optional

A valid canvas document can be mostly Markdown. Components are available tools, not mandatory sections.

Use a component when it carries information better than plain Markdown for the current task. Use Markdown when it is clearer, shorter, or less fragile.

## Data Props

For JSON-backed props such as `Chart.config`, `Table.data`, and `Table.columns`, prefer single-quoted JSON strings:

```mdx
config='{ "type": "bar", "data": { "labels": ["A", "B"], "datasets": [{ "label": "Value", "data": [1, 2] }] } }'
```

This keeps data content-like and avoids unnecessary MDX JavaScript expressions.

## HtmlBlock and Bulma JSX Scope

`HtmlBlock` is available when a small HTML fragment is easier than JSX:

````mdx
<HtmlBlock>

```html
<div class="notification is-info is-light">Bulma HTML fragment</div>
```

</HtmlBlock>
````

`HtmlBlock` injects raw HTML. Use it for Bulma snippets, embeds, scripts, and custom visual fragments.

Bulma JSX is also allowed for small fragments:

```mdx
<div className="notification is-info is-light">
  <strong>Note:</strong> This block uses Bulma CSS classes directly.
</div>
```

The renderer owns the full HTML shell. The canvas document should not include `<html>`, `<head>`, or `<body>`.
