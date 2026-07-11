# HtmlBlock

Use `HtmlBlock` for raw HTML fragments that should render directly inside the canvas.

## Props

`HtmlBlock` has no props. Pass HTML as children, usually in a fenced `html` code block.

## Example

````mdx
<HtmlBlock>

```html
<div class="notification is-info is-light">
  <strong>Note:</strong> This fragment uses Bulma classes.
</div>
```

</HtmlBlock>
````

## Script Example

````mdx
<HtmlBlock>

```html
<div id="demo" class="box">Waiting...</div>
<script>
  document.getElementById('demo').textContent = 'Script executed'
</script>
```

</HtmlBlock>
````

## Children Rule

Use a fenced `html` code block inside `HtmlBlock`. Do not write JSX children such as `<div className="box">...`; that is already Bulma JSX and does not need `HtmlBlock`.

## Rules

- `HtmlBlock` injects children as raw HTML.
- Use it for Bulma HTML snippets, embeds, small scripts, and custom visual fragments.
- A small document-local script may use native DOM listeners such as `addEventListener`. Scope selectors to the fragment and keep state local.
- This is not React hydration or a reusable component contract. Use a registered static extension component when behavior needs reusable props or validation.
- Do not include full-page wrappers such as `<html>`, `<head>`, or `<body>`.
