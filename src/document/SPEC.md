# Document Module Specification

## Purpose and Ownership

`src/document/` owns the semantics of one canvas document before it becomes
HTML. It loads document source and frontmatter, analyzes MDX structure,
resolves frontmatter data, validates document policy and component use, and
formats document-validation errors.

It does not own component registration or implementation (`src/components/`),
HTML generation or renderer assets (`src/render/`), command parsing, or config
file discovery.

## Required Flow

A renderer must use this sequence for a document:

```text
load source and frontmatter
  -> analyze the MDX AST
  -> validate policy, data, and registered component use
  -> prepare data-backed attributes from that same analysis
  -> evaluate and render outside this module
```

Validation never writes an HTML artifact. Rendering must reject validation
errors before it writes or serves one.

## Single-Analysis Invariant

`analysis.ts` is the sole owner of MDX structural interpretation for document
semantics. It identifies MDX JSX elements, attributes, element locations,
closing tags, and document ESM nodes.

- Validation and render preparation must consume the same `DocumentAnalysis`
  instance for one render request.
- Do not reintroduce regular-expression scanning of MDX tags or attributes.
  Text inside fenced code is not a component; only parsed MDX JSX nodes are.
- Use AST positions for diagnostics and source changes. Source edits are applied
  right-to-left so an edit cannot invalidate another edit's offsets.
- Analysis may evaluate static expression syntax only: literals, static arrays,
  static objects, zero-expression template literals, and supported unary
  literals. It must never execute an MDX expression. Non-static expressions
  remain source text for later MDX evaluation.

This boundary prevents validation and rendering from accepting different
languages or reporting different component locations.

## Component Validation

Component meaning comes from the registry supplied by `src/components/`.

- Only capitalized MDX JSX names participate in registered-component
  validation. Ordinary MDX/HTML elements remain document syntax.
- For a registered component, validation applies the manifest schema to parsed
  props, checks whether Markdown children are allowed, and reports the element
  location, component name, and affected prop.
- A component that declares `dataProp` accepts `from` as an alternative source.
  `from` and the native prop are mutually exclusive. The resolved value is
  injected under `dataProp` before schema validation.
- Render preparation applies the same `from` result by replacing only the
  analyzed attribute range with a JSON JSX expression. Data is therefore baked
  into HTML; it is not fetched by the artifact at runtime.

## Frontmatter Data

`data.ts` owns frontmatter data declarations and the `from` projection grammar.

- A declaration provides exactly one base source: `$inline` or `$src`.
  `$src` is JSON, relative to the MDX file, and confined to the supplied
  project root.
- Declaration and derived names share one flat identifier namespace. Collisions
  are errors.
- `$derive` transforms its declaration's resolved base value synchronously. It
  is controlled by the caller's trusted-MDX mode and runs with a 200 ms timeout.
  This is protection against accidental host access or non-termination, not an
  adversarial sandbox.
- `from` accepts only `X`, `X.f.g`, `X[i]`, and `X[].f.g`. Array extraction
  preserves input length, padding missing values with `null`; a wrong type
  outside extraction is an error.

Changes to any of these rules require data unit tests, document integration
tests, and corresponding Agent authoring documentation updates.

## Error Contract

Validation errors use `CanvasValidationError`. Error codes are part of the
Agent repair interface: a document author can use them to distinguish malformed
MDX, policy violations, unknown components, schema failures, and data errors.

Preserve error-code stability. Every error includes severity, file, and message;
include line, component, prop, and fix guidance when its validation path has
that information. Errors that originate in frontmatter may have no body line;
errors associated with a component must use that component's analyzed location.

## Change Rules

- A document-language change must update analysis, validation, render
  preparation, contract fixtures, and the Agent skill together.
- A component schema change belongs to `src/components/`, but its document
  validation effect must be covered through this module's integration path.
- A renderer feature must not add a second document parser. Extend
  `DocumentAnalysis` if it needs document structure.
- Keep document policy separate from trusted extension code. This module reads
  document content; it does not load manifests, component modules, themes, or
  browser bundles.
- Keep comments focused on semantic constraints. Implementation mechanics
  belong in code and tests, not this specification.
