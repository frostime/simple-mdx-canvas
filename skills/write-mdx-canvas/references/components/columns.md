# Columns / Column

Use `Columns` for side-by-side Markdown prose. It maps to Bulma `columns` / `column` layout and should not be treated as a visual card by itself.

## Props

`Columns`:

| Prop | Required | Values |
|---|---:|---|
| `cols` | no | integer `2` to `4`; layout hint |

`Column`:

| Prop | Required | Values |
|---|---:|---|
| `title` | no | heading text |
| `text` | no | plain text; Markdown children are preferred for formatted content |

Markdown children are allowed.

## Example

```mdx
<Columns cols={2}>
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
