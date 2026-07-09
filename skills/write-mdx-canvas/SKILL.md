---
name: write-mdx-canvas
description: Use when the user asks for a visual, report-ready single-page document instead of plain Markdown. Write one restricted MDX document for simple-mdx-canvas, validate it, render it to HTML, and return both paths.
---

# Write MDX Canvas

## Purpose

Create a single-page MDX canvas that helps the user understand, present, or review information more effectively than plain Markdown.

Use this skill for reports, project summaries, technical explanations, research notes, comparisons, experiment summaries, and agent-generated deliverables where visual structure improves comprehension.

## Output Contract

Create or update exactly one primary `.mdx` document, then render it to one `.html` artifact with `simple-mdx-canvas`.

Final response must include:

- the `.mdx` file path;
- the rendered `.html` file path;
- any validation or rendering limitation that remains unresolved.

## Authoring Rules

Use GFM Markdown, `$...$` inline math, and `$$...$$` display math for normal prose:

- headings;
- paragraphs;
- lists;
- tables;
- task lists;
- blockquotes;
- fenced code blocks;
- links and images.

Use MDX components only when they improve structure, visualization, comparison, or presentation value. Do not componentize text that is already clear in Markdown.

## Safe MDX Rules

Default mode is restricted MDX.

Do not write:

- `import` statements;
- `export` statements;
- inline component definitions;
- arbitrary JavaScript expressions;
- raw `<script>` tags;
- raw `<style>` tags;
- unregistered components.

Only use components listed by:

```bash
simple-mdx-canvas list-components
```

If no registered component fits, use plain Markdown.

## Built-in Components

Use these built-ins when appropriate:

- `Chart` for bar, line, pie, and scatter charts; it uses the constrained schema, not raw chart-library configuration;
- `Columns` / `Column` for side-by-side Markdown content; treat it as pure Bulma layout and put `Card`, `Callout`, or `Figure` inside when visual containment is needed;
- `Grid` / `Cell` for denser Bulma fixed-grid layouts;
- `Table` for JSON-backed Bulma tables; use normal GFM tables when the table is simple prose;
- `Tags` / `Tag` for compact labels, states, or categories;
- `Callout` for summary, note, tip, warning, danger, or definition blocks;
- `Cards` / `Card` for grouped concepts, options, or modules;
- `Tabs` / `Tab` for alternate platforms, modes, or variants;
- `Steps` / `Step` for procedures and workflows;
- `Figure` for image plus caption/source/note;
- `PromptBox` for reusable prompts, commands, or agent instructions; use fenced text or the `text` prop for long prompts, and rely on default wrapping.

## Chart Rule

Prefer JSON-string data for `Chart` to reduce MDX expression errors:

```mdx
<Chart
  type="bar"
  title="Cost comparison"
  x="option"
  y="cost"
  data='[
    { "option": "Markdown", "cost": 1 },
    { "option": "MDX Canvas", "cost": 3 }
  ]'
/>
```

Do not expose raw Chart.js configuration unless the component registry explicitly supports it.

## Required Workflow

After writing or editing the `.mdx` file, run:

```bash
simple-mdx-canvas validate <file>.mdx
simple-mdx-canvas render <file>.mdx -o <file>.html
```

If the installed CLI exposes the short alias, this is equivalent:

```bash
smc validate <file>.mdx
smc render <file>.mdx -o <file>.html
```

If validation or rendering fails:

1. read the error code and line information;
2. fix the `.mdx` document, not the renderer;
3. rerun validation and rendering;
4. stop only when both pass or when a real project limitation remains.

Do not call `serve` unless the user explicitly asks for live browser preview.

## Quality Bar

A good MDX canvas is:

- more readable than the equivalent Markdown;
- visually structured but not decorative;
- self-contained enough for the user to open the HTML directly;
- component-light unless visualization improves comprehension;
- valid under the restricted MDX policy.


## Math

Use `$...$` for inline formulas and `$$...$$` for display formulas. Do not use images for ordinary equations.
