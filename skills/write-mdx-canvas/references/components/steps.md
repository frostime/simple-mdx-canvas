# Steps / Step

Use `Steps` and `Step` for procedures, workflows, checklists with order, or lifecycle explanations.

## Props

`Steps` has no props. Markdown children are allowed.

`Step`:

| Prop | Required | Values |
|---|---:|---|
| `title` | no | step heading |

Markdown children are allowed.

## Example

```mdx
<Steps>
<Step title="Write">
Create one `.mdx` canvas document with Markdown and registered components.
</Step>
<Step title="Validate">
Run `smc validate report.mdx` and fix errors.
</Step>
<Step title="Render">
Run `smc render report.mdx -o report.html`.
</Step>
</Steps>
```

## Rules

- Use `Steps` only when order matters.
- Use bullets for unordered lists.
- Keep each step action-oriented.
