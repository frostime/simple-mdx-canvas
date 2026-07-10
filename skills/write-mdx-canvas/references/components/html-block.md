# HtmlBlock

Use `HtmlBlock` for a small HTML fragment that should use Bulma CSS classes directly.

## Props

| Prop | Required | Values |
|---|---:|---|
| `unsafe` | no | boolean; default `false` |
| `html` | no | backward-compatible escaped HTML string; prefer children for new documents |

HTML content should be passed as children, usually in a fenced `html` code block.

## Safe Example

````mdx
<HtmlBlock>

```html
<div class="notification is-info is-light">
  <strong>Note:</strong> This fragment uses Bulma classes.
</div>
```

</HtmlBlock>
````

Safe mode sanitizes the fragment before rendering. It removes unsafe tags and attributes, including scripts, styles, event handlers, and unsafe URLs.

## Unsafe Example

````mdx
<HtmlBlock unsafe>

```html
<div class="notification is-warning is-light">Trusted local demo.</div>
<script>
  console.log('HtmlBlock unsafe script executed')
</script>
```

</HtmlBlock>
````

Unsafe mode injects the HTML fragment as-is. Use it only for trusted local documents when the user explicitly wants raw HTML, scripts, embeds, or custom client-side behavior.

## Children Rule

Use a fenced `html` code block inside `HtmlBlock`. Do not write JSX children such as `<div className="box">...`; that is already Bulma JSX and does not need `HtmlBlock`.

## Rules

- Use semantic components when they fit.
- Use safe `HtmlBlock` for small Bulma snippets copied or adapted from Bulma examples.
- Use `unsafe` only when raw scripts or unsanitized HTML are intentionally required.
- Do not use `HtmlBlock` for full pages with `<html>`, `<head>`, or `<body>`.
