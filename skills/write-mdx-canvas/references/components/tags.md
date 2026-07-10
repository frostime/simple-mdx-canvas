# Tags / Tag

Use `Tags` and `Tag` for compact labels, states, categories, or metadata.

## Props

`Tags` has no props. Markdown children are allowed.

`Tag`:

| Prop | Required | Values |
|---|---:|---|
| `color` | no | `black`, `dark`, `light`, `white`, `primary`, `link`, `info`, `success`, `warning`, `danger` |
| `size` | no | `normal`, `medium`, `large` |
| `rounded` | no | boolean |
| `light` | no | boolean |

Markdown children are allowed.

## Example

```mdx
<Tags>
<Tag color="primary" light>MDX</Tag>
<Tag color="success" light>Bulma</Tag>
<Tag color="info" light>Single HTML</Tag>
</Tags>
```

## Rules

- Use tags for short labels only.
- Do not put long sentences in `Tag`.
- Use `Callout` for a status explanation or warning.
