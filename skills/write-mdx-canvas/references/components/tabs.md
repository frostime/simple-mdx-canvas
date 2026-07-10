# Tabs / Tab

Use `Tabs` and `Tab` for alternate modes, platforms, versions, or views where only one panel should be shown at a time.

## Props

`Tabs` has no props. Markdown children are allowed.

`Tab`:

| Prop | Required | Values |
|---|---:|---|
| `title` | yes | tab label |

Markdown children are allowed.

## Example

````mdx
<Tabs>
<Tab title="Render">

```bash
smc render report.mdx -o report.html
```

</Tab>
<Tab title="Validate">

```bash
smc validate report.mdx
```

</Tab>
</Tabs>
````

## Rules

- Use tabs for alternatives, not for hiding essential sequential content.
- Keep tab labels short.
- If all panels must be read in order, use headings or a Markdown ordered list instead.
