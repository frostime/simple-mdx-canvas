# Research Notes

## Reviewed Solution Families

1. MDX compiler/runtime libraries
   - `@mdx-js/mdx` provides the core compiler/evaluator.
   - This is the right primitive for a custom single-page renderer.

2. Documentation-site frameworks
   - Docusaurus, Nextra, Rspress, and similar tools solve multi-page documentation-site problems.
   - They are too heavy for the target artifact workflow.

3. MDX bundling libraries
   - `mdx-bundler` is close to the desired implementation layer because it bundles MDX and dependencies with esbuild.
   - It is a useful reference, but the project still needs its own CLI behavior contract and component policy.

4. Safer Markdown component approaches
   - `react-markdown` and `remark-directive` show an alternative safer direction: Markdown plus explicit extension syntax.
   - The current product keeps MDX because the target requirement is MDX, but adopts a restricted registry model.

5. Bun / JS bundling
   - Bun is a good local execution target for agent workflows, especially because it can run TypeScript directly.
   - The implementation should remain TypeScript/ESM based and not encode business behavior into Bun-specific APIs prematurely.

## Route Decision

Build a thin CLI renderer:

```text
.mdx input
  -> validate restricted MDX policy
  -> evaluate through MDX compiler
  -> render React tree to static HTML
  -> inject CSS-variable theme
  -> write .html
```

Do not build a documentation site framework.
