# P0 Refactor Plan

Status: planned.

This plan implements the P0 work in [BACKLOG.md](./BACKLOG.md). It protects
accepted behavior while replacing the validation, package-delivery, and static
extension foundations. Interactive user components are P1 work and are not
implemented by this plan.

## Scope and Boundaries

In scope:

- behavior fixtures and a local `npm run verify` quality gate;
- one MDX AST analysis model for validation and rendering;
- removal of the accepted obsolete CLI flags and unimplemented declarations;
- package exports, Node 22 compatibility, and static TS/TSX user components;
- movement out of the mixed `src/core/` directory according to ownership.

Out of scope:

- isolated browser hydration for interactive user components;
- asset copying, URL rewriting, or asset bundling;
- a documentation-site framework, arbitrary MDX module imports, or user
  replacement of built-in components;
- visual redesign of built-in components.

## Preserved Behavior

Unless an item is listed under "Intentional Contract Changes", a refactor must
preserve the following behavior:

- GFM Markdown, math, documented built-in components, local theme CSS, data
  declarations, and `HtmlBlock` render to an HTML artifact;
- component names resolve through one registry and duplicates are rejected;
- `Chart` passes explicit Chart.js configuration through unchanged except for
  missing renderer theme defaults;
- validation errors remain structured with stable codes, locations, component
  names, prop names, messages, and repair guidance where available;
- `render` and `serve` represent the same document semantics;
- document-authored asset URLs are preserved exactly.

## Intentional Contract Changes

The following behavior changes are part of P0 and must be represented by new
or updated tests rather than preserved-characterization tests:

- `render --no-validate` is removed; rendering always validates.
- `--trusted-mdx` is removed; `$derive` is available by default.
- document ESM `import` and `export` are rejected.
- `layout`, `output.selfContained`, `snippets`, `components.localDir`, and
  named theme claims without CSS behavior are removed from the public surface.
- Full self-containment is no longer claimed. URLs in Markdown and `Figure`
  resolve relative to the generated HTML file.

## Target Ownership

The target layout is organized by the design knowledge each area owns, not by
whether a file happens to parse, validate, or render.

```text
src/
  cli.ts          command parsing and process boundaries
  config.ts       public configuration contract and config discovery
  document/       source loading, frontmatter data, MDX analysis, validation
  components/     built-ins, registry, extension loading
  render/         HTML rendering, shell, theme and renderer-owned assets
  contracts.ts    public cross-area types only when ownership is genuinely shared
```

The final file arrangement may keep a small entrypoint at `src/cli.ts` or
`src/index.ts`. Do not create forwarding-only modules merely to match this
sketch.

### Dependency Direction

```text
cli -> config, components, document, render
render -> document analysis, component registry, renderer assets
document validation -> document analysis, component registry
components extension loader -> config, component contracts
```

`document` must not depend on HTML shell details. `components` must not depend
on CLI parsing. `render` must not re-parse a document that validation already
analyzed.

## Phases

### Phase 0: Characterize the Public Contract

Status: accepted.

Goal: create executable behavior protection before moving code.

Work:

- Add a compact fixture corpus for valid and invalid canvas documents.
- Add a fixture harness that invokes the public validation and rendering path.
- Record a packed-package smoke probe in a temporary installed project.
- Define the future `npm run verify` composition; do not require a known-failing
  package smoke test until Phase 3 repairs package delivery.

Acceptance:

- Existing supported behavior has semantic assertions, not whole-document CSS
  snapshots.
- Known parser drift is represented by failing tests for its intended repaired
  behavior and marked as a planned correction.
- The package smoke probe proves the current public-entry defect before it is
  fixed; it is an expected failure outside the green baseline suite.
- The green baseline gate runs type checking, tests, build, example validation,
  and example render. Phase 3 adds the package smoke test to `verify` after its
  regression condition is fixed.

Stop condition: do not move implementation modules until all current
characterization tests are green or an expected failure is explicitly recorded
as an intentional contract change.

### Phase 1: Centralize Document Semantics

Status: implementation complete, acceptance pending.

Goal: make MDX structure, locations, attributes, and component children have
one owner.

Work:

- Create a document-analysis interface over the MDX AST.
- Make validation consume analysis instead of scanning JSX with regular
  expressions.
- Make rendering consume the same analysis for `from` resolution and source
  preparation.
- Keep frontmatter data resolution in the document area.

Acceptance:

- Fenced JSX-looking text does not create component diagnostics.
- Valid object-expression component props are accepted when their schema allows
  them.
- Schema errors, `from` errors, and child-rule errors point to the analyzed
  component location.
- Valid fixtures validate and render; invalid fixtures do not write output.

Stop condition: no remaining production JSX regex parser or independent MDX
AST traversal decides component semantics.

### Phase 2: Align the Public Language and Configuration

Status: implementation complete, acceptance pending.

Goal: remove stale surface area and make command behavior match the accepted
contract.

Work:

- Remove `--no-validate` and `--trusted-mdx`.
- Enable `$derive` by default while retaining its timeout behavior.
- Reject document-level ESM in all command modes.
- Remove inactive config/frontmatter declarations and named-theme claims.
- Update examples and the external Agent skill only for implemented behavior.

Acceptance:

- CLI help, types, defaults, errors, examples, README, and the Agent skill
  agree on the document language.
- Tests cover each intentional contract change.
- A render command cannot emit HTML after validation errors.

### Phase 3: Repair Package Delivery and Static Extensions

Goal: make the installed CLI and documented static TS/TSX user components work
on Node 22 and Node 24.

Work:

- Publish explicit JavaScript and declaration entrypoints.
- Replace direct Node imports of TypeScript extension files with a trusted
  extension-loading and compilation boundary.
- Load config, manifest, and static component source through that boundary.
- Move implementation files from `core/` into their ownership areas only when
  the new boundary absorbs real complexity.

Acceptance:

- `init` creates a working project configuration after package installation.
- A static TSX component with a relative local import validates and renders.
- Duplicate component names and extension failures produce actionable errors.
- The packed-package smoke test passes under Node 22 and Node 24.

### Phase 4: P0 Acceptance

Goal: demonstrate that the refactor preserved its declared contract.

Work:

- Run the full local verification gate.
- Run the Node 22 and Node 24 verification matrix manually before release.
- Review fixture outcomes against the preserved and intentional-change lists.
- Update the backlog status and record any P1 prerequisites uncovered by P0.

Acceptance:

- `npm run verify` passes.
- Node 22 and Node 24 both pass the release verification matrix.
- No behavior change outside the intentional-change list lacks an approved
  contract update and a corresponding test.
- P1 interactive-component work has a clear starting interface, without being
  implemented opportunistically during P0.

## Verification Design

Use three test layers in P0:

1. **Contract fixtures**: source documents, expected validation result, and
   targeted semantic HTML assertions. These protect author-visible behavior.
2. **CLI and package integration**: compiled command execution and a tarball
   installed into a clean temporary project. These protect the delivery path.
3. **Focused unit tests**: pure document-data and AST interpretation branches
   where fixture setup would obscure the rule.

Avoid snapshots of complete HTML output. The output intentionally embeds large
third-party stylesheets and generated identifiers; full snapshots create noisy
failures without protecting document semantics.

P1 adds a browser layer for component hydration. It must open generated HTML,
exercise a user-visible interaction, and verify the post-interaction DOM.

## Local Commands

The final `verify` script must run the project-specific checks equivalent to:

```bash
npm run check --silent
npm test --silent
npm run build --silent
npm run validate:example
npm run render:example
npm run test:package
```

The exact npm script composition is an implementation detail. Do not make
`verify` report success when any underlying command is skipped.
