# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
+- Published JavaScript and type entrypoints for `defineConfig`.
+- Trusted local TS/TSX config, manifest, and static component loading through one extension boundary.
+- Packed-package smoke coverage for `init`, `list-components`, `validate`, and `render` with a TSX component and relative import.
+
+### Changed
- **Breaking:** `render` always validates; `--no-validate` and `--trusted-mdx` are removed.
- **Breaking:** `$derive` runs for trusted local documents without a CLI flag.
- Document-level import/export remain unsupported; direct scripts, styles, event handlers, and `javascript:` links are rejected.

## [0.2.0] - 2026-07-10
### Added
- Frontmatter `data:` sources for reusable values, referenced by `Table` / `Chart` via `from`.
  Sources: `$inline` (YAML) and `$src` (JSON under the project root).
  Optional projection: `X`, `X.f.g`, `X[i]`, `X[].f.g`.
  Optional `$derive` lambdas under `--trusted-mdx` (sandboxed, 200ms timeout).
- Agent docs and example coverage for data sources (`references/data-sources.md`, `examples/report.mdx`).
- `npm test` with unit and integration coverage for the data path.

### Changed
- `Table` / `Chart` accept either their native data prop or `from` (not both).
- Data is resolved at build time and embedded in the HTML artifact (no runtime fetch).

### Security
- `$derive` stays gated by `--trusted-mdx`. The sandbox limits accidental host access and runtime; it is not an adversarial isolation boundary.

## [0.1.0] - 2026-07-01
### Added
- Initial pre-release CLI: `render`, `validate`, `serve`, `init`, `list-components`.
- Built-in components, GFM Markdown, math, code highlighting, Bulma theme with light/dark toggle.
- Agent validation errors and `write-mdx-canvas` skill.

[Unreleased]: https://github.com/frostime/simple-mdx-canvas/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/frostime/simple-mdx-canvas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/frostime/simple-mdx-canvas/releases/tag/v0.1.0
