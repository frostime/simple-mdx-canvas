---
title: Product Contract
description: Public behavior supported by simple-mdx-canvas.
scope:
  - /src/**
  - /package.json
  - /README.md
  - /skills/write-mdx-canvas/**
updated: 2026-07-11
---

# Product Contract

`simple-mdx-canvas` converts one agent-authored `.mdx` document plus registered
components into a directly openable HTML artifact.

```text
.mdx + registered components -> validate -> render or serve -> HTML
```

It is a single-document renderer. It is not a site generator, CMS, routing
framework, full React application scaffold, visual editor, or untrusted code
sandbox.

## Runtime And Package

- Node 22 or newer is required.
- The installed package exports `defineConfig` from `simple-mdx-canvas` and
  provides the `simple-mdx-canvas` and `smc` commands.
- `smc init` creates missing local configuration and extension files without
  overwriting existing ones.

## Commands

| Command | Contract |
| --- | --- |
| `smc validate <input.mdx>` | Validates document policy, data, and registered component use. It never writes HTML. |
| `smc render <input.mdx> -o <output.html>` | Validates, then writes one HTML artifact. Validation errors prevent output creation. |
| `smc serve <input.mdx> [--port 4321] [--open]` | Serves the same rendered document semantics for local preview. |
| `smc init` | Creates `simple-mdx-canvas.config.ts` and `.simple-mdx-canvas/` extension files when absent. |
| `smc list-components` | Lists built-in and registered user components with their first example when available. |

## Document Language

Canvas documents support GFM Markdown, math, fenced-code highlighting,
registered component tags, small Bulma JSX fragments, frontmatter data, and
`HtmlBlock`. Capitalized component names must be registered; ordinary MDX/HTML
elements remain document syntax.

Canvas documents are trusted local inputs. JSX expressions, frontmatter
`$derive`, and `HtmlBlock` fenced HTML/scripts can execute during rendering.
This trust model is not an adversarial security boundary.

The document language excludes:

- document-level ESM `import` and `export`;
- inline component definitions;
- direct `<script>` or `<style>` tags;
- direct event handlers and `javascript:` links.

Use a registered component for reusable behavior and `HtmlBlock` for a trusted
HTML/script fragment. These restrictions apply to document content, not trusted
local extension modules.

## Frontmatter Data

Frontmatter may declare reusable `data:` values. Each declaration has exactly
one base source, `$inline` or `$src`; `$src` is JSON relative to the document
and confined to the project root. `$derive` synchronously transforms its
resolved base value with a 200 ms timeout.

`Table` and `Chart`, and any component declaring `dataProp`, may consume a
frontmatter value through `from`. Supported projections are `X`, `X.f.g`,
`X[i]`, and `X[].f.g`. Resolved data is embedded into HTML; the artifact does
not fetch the data at runtime.

## Components And Extensions

Built-ins include `Chart`, `Table`, `Columns` / `Column`, `Grid` / `Cell`,
`Callout`, `Cards` / `Card`, `Tabs` / `Tab`, `Figure`, `Tags` / `Tag`,
`PromptBox`, and `HtmlBlock`.

Built-in and user component names share one registry. Duplicates are errors.
`Chart` accepts a Chart.js configuration without replacing explicit settings.

`smc init` creates this trusted local extension layout:

```text
.simple-mdx-canvas/
  components/
  themes/
  components.manifest.ts
  tsconfig.json
```

The manifest default-exports an array. Each entry needs a capitalized name,
non-empty description, and a static React component. Local `.ts` and `.tsx`
relative imports are supported. TSX extension projects must directly depend on
`react` so the automatic JSX runtime resolves from component source.

User components render statically on the server. They may receive Markdown
children only when `allowMarkdownChildren` is true. Browser hydration is not
part of the current contract.

## Themes And Assets

Themes are local CSS overrides selected by document frontmatter or the render
command. Renderer-owned CSS and runtime assets are embedded where implemented.
Document-authored URLs, including Markdown image and `Figure` URLs, are
preserved exactly and resolve relative to the output HTML file. The renderer
does not copy, rewrite, validate, or bundle those document-authored assets.

## Errors

Validation errors are structured for a validate-repair-render loop. Error codes
are stable public diagnostics; preserve their meaning and locations when
changing validation. Current categories cover MDX parsing, document policy,
component lookup/schema/children, data source/projection/transform failures,
and missing assets. See `CanvasValidationError` in `src/contracts.ts` and the
contract fixtures in `test/contract.test.ts`.
