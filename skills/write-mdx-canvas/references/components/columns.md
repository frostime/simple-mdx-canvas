# Columns / Column

Use `Columns` for side-by-side Markdown prose. It maps to Bulma `columns` / `column` layout and should not be treated as a visual card by itself.

## Props

`Columns` has no props. Markdown children are allowed.

`Column`:

| Prop | Required | Values |
|---|---:|---|
| `title` | no | heading text |

Markdown children are allowed.

## Example

```mdx
<Columns>
<Column title="Plain Markdown">

- Portable
- Easy to diff
- Weak visual hierarchy

</Column>
<Column title="MDX Canvas">

- Still text-first
- Adds visual structure
- Renders to single HTML

</Column>
</Columns>
```

## Rules

- Use `Columns` for comparison or parallel explanation.
- Put `Card`, `Callout`, or Bulma JSX inside a column when visual containment is needed.
- Do not use columns for long independent sections; use headings instead.
