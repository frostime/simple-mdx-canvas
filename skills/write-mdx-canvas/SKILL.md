---
name: write-mdx-canvas
description: Use this skill when the user wants an agent-created, visual, report-ready single-page document instead of plain Markdown. Produce a valid simple-mdx-canvas `.mdx` file using GFM Markdown, math, Bulma-based JSX/classes, and registered components; validate it; render it to HTML; return both paths. Do not use for ordinary Markdown-only notes or renderer implementation work.
---

# Write MDX Canvas

## Purpose

Create one `simple-mdx-canvas` document: a single `.mdx` file that renders to a directly openable `.html` artifact.

The reader of this skill is an external Agent. The Agent's job is to write compliant MDX content for the renderer, not to modify the renderer.

## Terms

- **Canvas document**: the `.mdx` file written for `simple-mdx-canvas`.
- **Rendered artifact**: the `.html` file produced from the canvas document.
- **Semantic component**: a registered MDX component such as `Chart`, `Callout`, `Table`, or `Grid`.
- **Bulma JSX**: small JSX fragments in MDX that use Bulma CSS classes through React-style attributes, for example `className="box"`.
- **HtmlBlock**: a registered component that renders an HTML fragment from children; safe mode sanitizes it, `unsafe` mode injects it as-is.

## Output Contract

Create or update one primary canvas document and render it beside the source file unless the user specifies another path.

Default path rule:

```text
<source-dir>/<name>.mdx
<source-dir>/<name>.html
```

Final response must include:

- canvas document path;
- rendered artifact path;
- validation/render status;
- any unresolved limitation, if present.

## Required Commands

After writing or editing the canvas document, run:

```bash
simple-mdx-canvas validate <file>.mdx
simple-mdx-canvas render <file>.mdx -o <file>.html
```

The short alias is equivalent when available:

```bash
smc validate <file>.mdx
smc render <file>.mdx -o <file>.html
```

If validation or rendering fails, fix the canvas document and rerun both commands. Do not edit renderer code unless the user explicitly asks to change `simple-mdx-canvas` itself.

Do not run `serve` unless the user asks for live preview.

## Content Capabilities and Hard Rules

A canvas document may use:

- GFM headings, paragraphs, lists, task lists, blockquotes, tables, fenced code, links, and images;
- syntax highlighting for fenced code blocks when a language is provided, for example ```` ```ts ````; `text`, `txt`, `plaintext`, `md`, and `markdown` wrap by default;
- inline math with `$...$`;
- display math with `$$...$$`;
- registered semantic components;
- limited Bulma JSX for simple visual structures;
- `HtmlBlock` for small HTML fragments with Bulma classes.

Components are optional tools. The Agent should choose the document structure from the user's task and source material.

Do not write:

- `import` or `export` statements;
- inline component definitions;
- arbitrary JavaScript expressions beyond simple literal props such as `{2}` or `{true}`;
- raw `<script>` or `<style>` tags outside `HtmlBlock unsafe`;
- event handlers such as `onClick` outside `HtmlBlock unsafe`;
- `javascript:` links;
- unregistered component names.

## Bulma JSX Rule

The rendered page includes Bulma CSS. The Agent may use small JSX fragments with Bulma classes when a semantic component is too restrictive.

Use React/MDX attribute spelling:

```mdx
<div className="box">
  <p className="title is-5">Decision</p>
  <p>Use semantic components for recurring structures; use Bulma JSX for small one-off layout.</p>
</div>
```

Do not paste full HTML pages into MDX. The canvas document owns body content; the renderer owns `<html>`, `<head>`, CSS, scripts, and theme toggle.

## Common Component Usage

Read the component reference before using a component whose props are uncertain.

High-frequency examples:

```mdx
<Callout type="summary" title="Decision">
Use `simple-mdx-canvas` when the user needs a visual single-page report, not a documentation site.
</Callout>

<Columns cols={2}>
<Column title="Option A">
Markdown content for the first option.
</Column>
<Column title="Option B">
Markdown content for the second option.
</Column>
</Columns>

<Chart
  type="bar"
  title="Complexity comparison"
  x="option"
  y="complexity"
  data='[
    { "option": "Markdown", "complexity": 1 },
    { "option": "MDX Canvas", "complexity": 3 }
  ]'
/>

<HtmlBlock>

```html
<div class="notification is-info is-light">Bulma HTML fragment</div>
```

</HtmlBlock>
```

## Reference Map

Read only what is needed:

- `references/capability-map.md` — what the renderer can express; use it to choose capabilities without imposing an outline.
- `references/repair-loop.md` — how to fix validation/render failures.
- `references/components/chart.md` — `Chart`.
- `references/components/columns.md` — `Columns` / `Column`.
- `references/components/grid.md` — `Grid` / `Cell`.
- `references/components/table.md` — `Table`.
- `references/components/tags.md` — `Tags` / `Tag`.
- `references/components/callout.md` — `Callout`.
- `references/components/cards.md` — `Cards` / `Card`.
- `references/components/tabs.md` — `Tabs` / `Tab`.
- `references/components/steps.md` — `Steps` / `Step`.
- `references/components/figure.md` — `Figure`.
- `references/components/prompt-box.md` — `PromptBox`.
- `references/components/html-block.md` — `HtmlBlock`.
- `references/components/bulma-jsx.md` — small Bulma class-based JSX fragments.

If component availability is uncertain, run:

```bash
simple-mdx-canvas list-components
```

## Minimal Syntax Example

```mdx
---
title: "Report Title"
theme: "default"
---

# Report Title

<Callout type="summary" title="Key point">
Markdown content can appear inside components that allow children.
</Callout>
```

This example shows syntax only. It is not a required outline.

## Success Criteria

A valid canvas document:

- passes `simple-mdx-canvas validate`;
- renders with `simple-mdx-canvas render`;
- produces an HTML artifact the user can open directly.
