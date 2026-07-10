# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-07-10
### Added
- Frontmatter `data:` declarations: name reusable data values once and reference them from `Table` / `Chart` via a `from` prop, so the same rows or chart configuration no longer need to be duplicated across components.
- `$src` source: load JSON from a file path relative to the `.mdx` document (confined to the project root).
- `$inline` source: inline YAML literals as data.
- `$derive` transforms: compute derived subsets (map/filter/aggregate) from a declaration's own source. Gated behind `--trusted-mdx`; evaluated synchronously in a constrained `vm` sandbox with a 200ms timeout.
- `from` projection DSL: `X` (whole value), `X.f.g` (object path), `X[i]` (array index), `X[].f.g` (array extraction with null padding so output length equals source length).
- `manifest.dataProp` extension point: any registered component can declare which prop `from` resolves into (`Table` → `data`, `Chart` → `config`), making the data-source mechanism general.
- `npm test` script and `node:test` suite (26 unit + 15 integration cases) covering source resolution, projection DSL, `$derive` sandbox, render/validate integration, and fail-closed error paths.
- `docs/data-component-plan.md` design and acceptance document.
- `skills/write-mdx-canvas/references/data-sources.md` agent reference for the new feature.

### Changed
- `Table` and `Chart` schemas: `data` / `config` is now optional when `from` is present (mutually exclusive via `refine`).
- `validate` now resolves frontmatter data before schema validation and injects the resolved `from` value into the component's `dataProp`, so zod schemas check the real data shape.
- `render` resolves data sources at build time and splices `from="X"` into `dataProp={...JSON...}` via mdast byte-exact positions; the rendered HTML is self-contained with no runtime fetch.
- SPEC §5/§11/§12, DESIGN §2/§7/§8/§12, and `write-mdx-canvas` SKILL updated to document frontmatter data sources, the new error codes, and the `$derive` security boundary.
- `examples/report.mdx` now demonstrates `data:` + `from` reuse between `Table` and `Chart`.

### Fixed
- `render` no longer hardcodes `trustedMdx: true` when resolving data; `$derive` is now correctly gated by `--trusted-mdx` on the render path too.
- `render` now fail-closes (throws `CanvasValidationException`) when data resolution or a `from` projection fails, instead of silently falling back to the raw source and emitting an empty result. This guards the `--no-validate` path.
- `$src` paths are now confined to the project root; absolute paths and parent-traversal escapes are rejected with `SMC_INVALID_DATA_SOURCE`.
- Declarations with `$derive` but no `$src` / `$inline` are now rejected (`SMC_INVALID_DATA_SOURCE`); `$derive` only transforms an existing source.
- `$derive` values that are not maps (strings, arrays, scalars) are now rejected with `SMC_INVALID_DATA_SOURCE` instead of being silently ignored or producing misleading errors.

### Security
- `$derive` sandbox boundary documented honestly: it prevents accidental host access (no `process` / `require` / `module` / `globalThis` / `Buffer` / timers / `fetch` / DOM) and limits execution time, but is not an adversarial sandbox; `Function` remains reachable through constructor chains. `$derive` stays gated behind `--trusted-mdx`.

## [0.1.0] - 2026-07-01
### Added
- Initial pre-release: `smc render` / `validate` / `serve` / `init` / `list-components` CLI.
- Built-in components: `Chart`, `Columns` / `Column`, `Grid` / `Cell`, `Table`, `Tags` / `Tag`, `Callout`, `Cards` / `Card`, `Tabs` / `Tab`, `Figure`, `PromptBox`, `HtmlBlock`.
- GFM Markdown, KaTeX math, fenced code highlighting, Bulma-based theme system with light/dark toggle.
- Agent-readable validation error codes and `write-mdx-canvas` skill.

[Unreleased]: https://github.com/frostime/simple-mdx-canvas/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/frostime/simple-mdx-canvas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/frostime/simple-mdx-canvas/releases/tag/v0.1.0
