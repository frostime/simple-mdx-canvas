---
title: Architecture
description: Ownership boundaries and design constraints for the single-document renderer.
scope:
  - /src/**
  - /scripts/**
updated: 2026-07-11
---

# Architecture

The dominant design pressure is deterministic agent delivery: one document,
one validation model, and one portable HTML artifact. The architecture favors
deep ownership boundaries over a general plugin or application framework.

## Ownership

```text
src/
  cli.ts          command parsing and process boundaries
  config.ts       configuration discovery and merge
  contracts.ts    shared public types
  document/       source, MDX analysis, frontmatter data, validation, errors
  components/     built-in components and component registry
  extensions/     trusted config, manifest, and component module loading
  render/         MDX evaluation, HTML shell, themes, renderer assets
```

`document/` owns document semantics before HTML exists. `components/` owns what
a registered component means. `extensions/` owns loading executable local
extension source. `render/` owns HTML and renderer assets. `cli.ts` composes
these modules but does not define their behavior.

## Dependency Direction

```text
cli -> config, components, document, render
config -> extensions
components -> extensions
render -> document, components
```

`document/` must not depend on the HTML shell. `components/` must not depend on
CLI parsing. `render/` must not independently interpret document syntax.

## Document Semantics

`src/document/analysis.ts` is the sole owner of MDX structural interpretation
for document semantics. Validation and render preparation use the same
`DocumentAnalysis` instance for a render request.

```text
load document
  -> analyze MDX AST
  -> validate policy, data, and component use
  -> prepare data-backed attributes from that analysis
  -> evaluate MDX and server-render
  -> build HTML shell
```

Do not reintroduce JSX regular-expression parsing or a second MDX AST traversal
for validation, source rewriting, or rendering. Fenced JSX-looking text is
code, not a component. The document module specification records the detailed
invariants and diagnostic rules.

## Trust Boundaries

Document content and local extensions are both trusted local inputs, but they
have different capabilities. Documents use a restricted MDX language; reusable
code is loaded only through the extension boundary. `HtmlBlock` is the explicit
trusted escape hatch for document-level HTML/scripts.

The `$derive` timeout limits accidental non-termination. It is not a sandbox
against malicious input.

## Extension Loading

`src/extensions/load-module.ts` is the only loader for config, manifests, and
user component modules. It normalizes module loading across Node 22 and Node
24, uses file URLs on Windows, and reports the offending module path.

The extension-local `tsconfig.json` is deliberate. `tsx` ignores dot-directories
in its default file glob; the generated config gives TSX files under
`.simple-mdx-canvas/` predictable NodeNext and automatic JSX behavior without
changing an author's root TypeScript configuration.

Extensions currently produce server-rendered static HTML. Browser bundles,
hydration, and interactive component state are outside this design.

## Rendering And Assets

The renderer evaluates validated MDX with the registry, server-renders the
component tree, then injects renderer-owned CSS/scripts into the HTML shell.
Themes are CSS overrides. Document-authored asset URLs remain source text; this
keeps output placement under the author's control and avoids an asset pipeline.

## Deliberate Limits

Do not add routes, site collections, document-level module imports, asset
bundling, blanket browser hydration, or a second component API without a new
accepted product contract. These features create broader lifecycle and delivery
responsibilities than the single-document workflow requires.
