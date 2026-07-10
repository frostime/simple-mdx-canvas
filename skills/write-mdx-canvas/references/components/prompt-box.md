# PromptBox

Use `PromptBox` for prompts, agent instructions, commands, or reusable task text that the rendered page should present as copy-oriented content.

## Props

| Prop | Required | Values |
|---|---:|---|
| `title` | no | heading; default `Prompt` |
| `text` | no | plain long text |

Markdown children are allowed. Long text wraps by default.

## Text Prop Example

```mdx
<PromptBox
  title="Agent instruction"
  text="Read the project, summarize the architecture, and return both the MDX and rendered HTML paths."
/>
```

## Children Example

````mdx
<PromptBox title="Agent instruction">

```text
Write a single-page MDX canvas document.
Use only registered simple-mdx-canvas components.
Validate and render before returning final paths.
```

</PromptBox>
````

## Rules

- Use `PromptBox` for copyable instructions, not ordinary prose.
- Use fenced `text` inside children when formatting matters.
- For normal code examples, use fenced code blocks without `PromptBox`.
