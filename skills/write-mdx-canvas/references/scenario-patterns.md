# Scenario Patterns

Choose the smallest structure that makes the task easy to scan. These patterns
are optional; do not impose one when the source material calls for another
shape.

## Narrative Brief

Use headings and prose for the narrative. Add `Tags` for status, `Columns` for
parallel audiences or scope, `Cards` for peer readiness areas, `Grid` for small
summaries, and `PromptBox` for a reusable message or instruction.

Use `Figure` only when an image communicates a real decision, state, or object.
Keep document-authored asset paths relative to the rendered HTML location.

## Data Dashboard

Put reusable JSON-like values in frontmatter `data:`. Use `$src` for local JSON
and `$derive` only for a small trusted transformation that keeps component
inputs clear. Feed `Table` and `Chart` with `from`; use a table for exact values
and a chart for trends or comparison.

## Decision Record

State the decision early in a `Callout`, then use ordinary Markdown headings for
context and consequences. Use `Tabs` for mutually exclusive alternatives and a
`Table` only when comparison criteria benefit from scanning by row and column.

## Document-Local DOM Fragment

Use `HtmlBlock` for a small trusted HTML fragment, embed, or native DOM script
that belongs to one document. Keep selectors scoped to the fragment and use
native listeners such as `addEventListener`; document JSX event handlers remain
unsupported.

This is not a reusable component model. When behavior needs stable props,
validation, or reuse across documents, request a registered static extension
component instead.

## Extension Project

A static extension component is an authoring-project concern, not a normal
canvas-document requirement. Use one only when a reusable visual unit cannot be
expressed through built-ins, Markdown, Bulma JSX, or a small `HtmlBlock`.

The authoring project owns the trusted manifest, local TSX source, and React
runtime dependency. The canvas document uses the resulting registered tag but
does not import component source.
