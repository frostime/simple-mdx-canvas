# Backlog

This file records the accepted product contract and the work required to make
that contract real. It is the planning source until the work is accepted. Move
completed rules into the appropriate durable specification; do not treat this
file as end-user documentation.

## Accepted Contract

### Product Boundary

- `simple-mdx-canvas` renders one agent-authored `.mdx` document with registered
  components into an HTML artifact. `validate`, `render`, and `serve` are the
  supported workflow.
- The project is not a general application framework, a site generator, or an
  arbitrary document-module loader.
- `render` and `serve` use the same document semantics. Rendering always
  validates before writing or serving HTML.
- The supported Node runtime is Node 22 or newer. Every documented command,
  config path, and extension path must work on that range after package
  installation, not only from this repository's source checkout.

### Document Language

- Canvas documents are trusted local authoring inputs. JSX expressions and
  `HtmlBlock` raw HTML or scripts are supported authoring capabilities.
- Document-level ESM `import` and `export` are not part of the language.
  Reusable code belongs in registered user components; reusable data belongs in
  frontmatter or external data files.
- Frontmatter `$derive` is enabled by default. Its 200 ms VM timeout remains a
  guard against accidental non-terminating transforms, not a security boundary.
- Agent-readable validation errors remain structured and stable enough for a
  validate-repair-render loop.

### Components and Extensions

- Built-in and user components share one registry. A duplicate name is an
  error; users do not override built-ins.
- User extensions are trusted TypeScript or TSX source. The extension-loading
  boundary owns compilation of their config, manifest, and component modules.
- A user component can be static or interactive. Static components may receive
  Markdown children. Interactive components render on the server and hydrate in
  the browser as isolated component roots; their props must be JSON-serializable
  and they cannot receive MDX children.
- The rendered HTML embeds the JavaScript needed by interactive components.
  Static documents do not need a browser React runtime solely because the
  renderer uses React on the server.

### Assets and Themes

- The HTML shell embeds renderer-owned framework assets such as Bulma, KaTeX,
  and Chart.js when needed.
- Document-authored URLs are preserved. Local images and other document assets
  resolve relative to the final HTML file; the caller is responsible for writing
  the artifact where those referenced assets remain available.
- The project does not promise fully self-contained documents or copy, rewrite,
  validate, or bundle document-authored assets.
- Themes remain local CSS overrides selected by the document or CLI. Only
  implemented generic theme behavior is public; named themes without CSS
  behavior are not part of the contract.

## Intentional Breaking Changes

The repository is pre-release. The following changes are intentional and must
be called out in release notes and migration guidance:

- Remove `render --no-validate`; rendering always validates.
- Remove `--trusted-mdx`; `$derive` no longer requires a CLI flag.
- Reject document-level `import` and `export` in every command mode.
- Remove unimplemented config and frontmatter declarations: `layout`,
  `output.selfContained`, `snippets`, `components.localDir`, and inactive named
  theme claims. Remove the unused `renderMode` metadata; the later interactive
  component contract will define its own manifest field.
- Replace the claim that every HTML artifact is self-contained with the asset
  rule above.

## Work Items

### P0: Establish a Behavior Baseline

Build a behavior-oriented fixture suite before structural changes.

Acceptance:

- Valid fixtures cover documented Markdown/GFM, math, each built-in component,
  frontmatter data sources, `$derive`, `HtmlBlock`, local theme CSS, and image
  URL preservation.
- Invalid fixtures assert stable error codes and useful locations for unknown
  components, invalid component props, forbidden document ESM, invalid data,
  and invalid MDX syntax.
- Fixtures assert semantic HTML fragments and document behavior, not complete
  HTML snapshots containing third-party CSS or generated IDs.
- For every in-contract fixture, successful validation implies successful
  rendering. Invalid fixtures do not write an HTML output.
- The suite distinguishes intentional breaking changes from regressions.

### P0: Use One MDX Analysis Model

Replace regex-based JSX detection and prop parsing in validation with the same
MDX AST model used by rendering.

Acceptance:

- Fenced code containing JSX-looking text is treated as code, not a component.
- Component discovery, attributes, child rules, source locations, `from`
  resolution, and source rewriting use one parsed representation.
- Documented literal and expression forms accepted by rendering are validated
  consistently, including object-form component props.
- No source rewrite depends on fragile byte offsets from a separately parsed
  document without verifying the associated AST position.

### P0: Make Package and CLI Delivery Real

Repair the public package surface and initialization workflow.

Acceptance:

- `package.json` publishes a working JavaScript and type entry for
  `import { defineConfig } from 'simple-mdx-canvas'`.
- `smc init` creates a config that works from a clean temporary project where
  the package is installed, with no source-checkout assumptions.
- Config and component manifest discovery have an explicit extension policy.
- A packed tarball smoke test exercises `init`, `validate`, `render`, and
  `list-components` from a clean temporary project.
- Node 22 and Node 24 coverage verify the documented runtime floor.

### P0: Implement User TS/TSX Component Loading

Create one extension-loading boundary responsible for config, manifest, source
compilation, validation, and diagnostic errors.

Acceptance:

- A documented TypeScript or TSX manifest can register a static component that
  validates and renders through the same registry as built-ins.
- Relative imports within the trusted extension source work under Node 22.
- Invalid manifests, load failures, duplicate names, and invalid component
  metadata produce actionable errors.
- An integration fixture proves that a user component renders after package
  installation rather than only in a source checkout.

### P1: Add Isolated Interactive User Components

Support interactive user components without hydrating every document.

Acceptance:

- The manifest explicitly distinguishes static and interactive components.
- The renderer server-renders an interactive component, serializes only its
  JSON-compatible props, embeds its browser bundle, and hydrates only that
  component root.
- Interactive components reject MDX children with a structured validation
  error. Static component child behavior remains unchanged.
- A browser test opens both `render` output and `serve` output, performs a
  component interaction, and verifies the visible state change.
- Browser bundles are emitted only when an interactive component is used.

### P1: Remove Inert Public Surface

Delete or replace declarations that have no executable behavior, then align the
public API, generated config, examples, and agent skill.

Acceptance:

- No type, config template, CLI help text, README, specification, or skill
  claims support for a removed declaration.
- Generic local theme CSS remains covered by an integration test.
- Document URL behavior is documented for Markdown images and `Figure`.

### P1: Documentation Convergence

After implementation and acceptance, replace the initial root documentation
with a coherent `docs/` hierarchy.

Target documents:

- product contract and supported CLI workflow;
- architecture and ownership of parsing, validation, rendering, themes, and
  extension loading;
- MDX authoring and component-extension contracts for Agents;
- verification and release checks;
- this backlog while work remains open.

Acceptance:

- `README.md`, `AGENTS.md`, examples, and `skills/write-mdx-canvas/` link to
  the new authoritative documents and describe only implemented behavior.
- Historical research and one-off implementation plans are either archived with
  an explicit historical status or removed when their durable content has an
  authoritative replacement.
- Root `SPEC.md` and `DESIGN.md` are deleted only after the new documents fully
  replace their product and architecture obligations.
- Package publication files exclude deleted root documents and generated sample
  HTML artifacts.

## Verification Strategy

Use layered verification for every refactor step:

1. Type check, build, and the documented example validate/render commands.
2. Unit tests for pure data and AST interpretation rules.
3. Integration tests through the public core API and compiled CLI.
4. Packed-package tests from an isolated temporary project.
5. Browser tests for generated HTML behavior, including interactive components.
6. A final semantic review that compares fixture outcomes before and after the
   refactor, excluding the intentional breaking changes listed above.
