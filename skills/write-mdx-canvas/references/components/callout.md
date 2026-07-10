# Callout

Use `Callout` for conclusions, warnings, notes, definitions, and summaries that should stand out from prose.

## Props

| Prop | Required | Values |
|---|---:|---|
| `type` | no | `note`, `tip`, `warning`, `danger`, `definition`, `summary`; default `note` |
| `title` | no | heading text |

Markdown children are allowed.

## Example

```mdx
<Callout type="summary" title="Decision">
Use `simple-mdx-canvas` for one-page visual reports, not for multi-page documentation sites.
</Callout>
```

## Type Guidance

| Type | Use for |
|---|---|
| `summary` | main conclusion or executive summary |
| `note` | neutral aside |
| `tip` | recommendation or helpful guidance |
| `warning` | risk or limitation |
| `danger` | severe risk or must-not-do |
| `definition` | term definition |

## Rules

- Use one strong summary callout near the top for report-style documents.
- Avoid stacking many callouts; they lose emphasis.
