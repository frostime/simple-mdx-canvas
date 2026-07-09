# Technical Route

## Confirmed Route

Use a thin CLI renderer instead of a documentation-site framework.

Core stack:

- TypeScript
- Node-compatible CLI package
- `commander` for CLI parsing
- React server rendering
- `@mdx-js/mdx`
- `remark-gfm`
- Zod-style prop schemas
- Bulma CSS as the default visual substrate
- small canvas-specific CSS files under `src/styles/`

## Rationale

A documentation framework solves multi-page site concerns. The target problem is one-page artifact rendering for agents, so the correct abstraction is a renderer CLI.

The CLI is an installed package, not a Bun script. Users should be able to run it through `smc`, `npx`, `pnpm dlx`, or `npm link` without knowing the implementation runtime.

## Reused Mature Pieces

- MDX compiler: mature parser/compiler for Markdown + JSX.
- remark ecosystem: Markdown AST and GFM support.
- React SSR: stable server-side HTML rendering model.
- Bulma: stable CSS-only UI layer for content, cards, messages, buttons, and responsive layout.
- CSS variables: stable browser-native theme primitive.
- Commander: stable command/subcommand parsing instead of handwritten flag parsing.
- Node CLI packaging: stable install model through npm, npx, pnpm dlx, npm link, or global install.
- Optional Bun compatibility: useful for development, but not part of the user-facing contract.

## Local Assumption Closure

The project does not depend on:

- a long-running dev server for delivery;
- a full React scaffold per document;
- arbitrary MDX imports in agent-written documents;
- a third-party hosted platform;
- Bun availability on the user machine.

It does depend on:

- local Node runtime availability for the packaged CLI;
- trusted local component code;
- constrained MDX authoring rules;
- validation before render.
