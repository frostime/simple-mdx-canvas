# Figure

Use `Figure` for an image with caption and source metadata.

## Props

| Prop | Required | Values |
|---|---:|---|
| `src` | yes | image path or URL |
| `alt` | no | accessible image description |
| `caption` | no | visible caption |
| `source` | no | source note |

Children are not allowed. Use a self-closing tag.

## Example

```mdx
<Figure
  src="./architecture.png"
  alt="System architecture diagram"
  caption="High-level render pipeline."
  source="Project design notes"
/>
```

## Rules

- Document-authored URLs are preserved. A local relative URL resolves from the generated HTML file, so write the output where referenced assets remain available.
- Always provide meaningful `alt` text when the image carries information.
- If the image is decorative, use Markdown prose instead of a figure.
