---
name: simple-mdx-canvas-writer
description: Use when the user wants a more visual, report-ready single-page document than plain Markdown. Write one MDX document for simple-mdx-canvas, validate it, and render it to HTML.
---

# simple-mdx-canvas Writer

## Goal

Create a single `.mdx` document that renders through `simple-mdx-canvas` into a user-friendly HTML canvas.

## Rules

- Use GFM Markdown for normal prose.
- Use components only when they improve structure, visualization, or presentation value.
- Use only registered components.
- Do not import, export, or define components inside the MDX document.
- Do not use raw `<script>` or `<style>` tags.
- Do not start `serve` unless the user explicitly asks for live preview.

## Allowed Built-ins

- `Chart`
- `Columns` / `Column`
- `Grid` / `Cell`
- `Table`
- `Tags` / `Tag`
- `Callout`
- `Cards` / `Card`
- `Tabs` / `Tab`
- `Steps` / `Step`
- `Figure`
- `PromptBox`

## Required Workflow

After writing or editing the document, run:

```bash
simple-mdx-canvas validate <file>.mdx
simple-mdx-canvas render <file>.mdx -o <file>.html
```

If validation or rendering fails, fix the `.mdx` and rerun.

Final response must include both the `.mdx` and `.html` paths.
