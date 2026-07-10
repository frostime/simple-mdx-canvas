# Validation and Render Repair Loop

## Loop

Run:

```bash
simple-mdx-canvas validate <file>.mdx
simple-mdx-canvas render <file>.mdx -o <file>.html
```

If either command fails, repair the `.mdx` file and rerun both commands.

## Error Fixes

| Error code | Meaning | Fix |
|---|---|---|
| `SMC_MDX_PARSE` | MDX syntax is invalid | Fix JSX tag balance, quotes, fenced code, or malformed math. |
| `SMC_FORBIDDEN_IMPORT` | Document imports code | Remove `import`; use registered components only. |
| `SMC_FORBIDDEN_EXPORT` | Document exports code/data | Move metadata to frontmatter or prose. |
| `SMC_FORBIDDEN_RAW_HTML` | Raw `<script>` or `<style>` exists | Remove it; use components, Bulma classes, or theme files. |
| `SMC_FORBIDDEN_INLINE_JS` | Inline event handler or `javascript:` link exists | Remove behavior from the document. |
| `SMC_UNKNOWN_COMPONENT` | Component is not registered | Replace with a built-in, run `list-components`, or use Markdown/Bulma JSX. |
| `SMC_COMPONENT_SCHEMA` | Props do not match the component schema | Read the relevant component reference and adjust props. |
| `SMC_FORBIDDEN_CHILDREN` | Component does not accept children | Use a self-closing tag or move content outside. |

## Common MDX Repairs

### Use `className`, not `class`

```mdx
<div className="box">Correct for MDX JSX.</div>
```

### Use JSON strings for complex data

```mdx
<Chart config='{ "type": "bar", "data": { "labels": ["A"], "datasets": [{ "label": "Value", "data": [1] }] } }' />
```

### Keep component children in MDX-safe form

Blank lines inside component children are allowed, but every opening tag must have a matching closing tag unless the component is self-closing.

```mdx
<Callout type="tip" title="Valid">
Markdown children are allowed here.
</Callout>
```

### Do not repair by weakening validation

Do not add `--trusted-mdx`, `--no-validate`, or renderer changes to bypass document errors unless the user explicitly requests unsafe/trusted behavior.
