---
title: Development Guide
description: Maintain, verify, and release the repository without drifting its public contract.
scope:
  - /src/**
  - /test/**
  - /package.json
  - /package-lock.json
  - /pnpm-lock.yaml
updated: 2026-07-11
---

# Development Guide

## Prerequisites

Use Node 22 or newer. Before release, run the full gate on Node 22 and Node 24.
Both `package-lock.json` and `pnpm-lock.yaml` are tracked; dependency changes
must update both.

## Verification

```bash
npm run verify --silent
```

`verify` runs type checking, source tests, build, example validation/render,
and an installed-tarball smoke test. The package test verifies public
`defineConfig` import, `init`, static TSX extension loading, component listing,
validation, and rendering from a clean consumer project.

Run the same command under Node 22 and Node 24 before a release. Do not report
a release gate as passing when either runtime or the tarball test was skipped.

## Change Matrix

| Change | Update and verify |
| --- | --- |
| MDX syntax, document policy, frontmatter data, or validation errors | `docs/SPEC.md`, `src/document/SPEC.md`, contract fixtures, data/integration tests, and `skills/write-mdx-canvas/` |
| Built-in component props or output | `docs/SPEC.md`, component references in the skill, contract fixtures, and visual/example coverage as appropriate |
| Registry, manifest, or extension loading | `docs/SPEC.md`, `docs/DESIGN.md`, `src/extensions/SPEC.md`, extension tests, and installed-package smoke |
| CLI command or package export | `README.md`, `docs/SPEC.md`, CLI/package tests, and tarball smoke |
| Renderer shell, themes, or asset behavior | `docs/SPEC.md`, `docs/DESIGN.md`, example/contract coverage, and the Agent skill when authoring behavior changes |
| Dependency or runtime floor | `package.json`, both lockfiles, `README.md`, `docs/SPEC.md`, and Node 22/24 verification |

## Documentation Rules

- Keep `docs/` current-state only. Use Git history and `CHANGELOG.md` for
  completed implementation narratives.
- Put public behavior in `docs/SPEC.md`, architecture constraints in
  `docs/DESIGN.md`, maintenance workflow here, and unapproved future candidates
  in `docs/BACKLOG.md`.
- Module specifications hold local invariants that cannot be safely inferred
  from nearby code. Current module specifications are under `src/document/` and
  `src/extensions/`.
- The external authoring skill describes document authorship, not renderer
  internals. Keep it independent of unpublished repository-only documentation.

## Package Boundary

Publish only the package files declared in `package.json`. Before changing that
list, inspect `npm pack --dry-run --json` and keep source files, generated
examples, process documents, and obsolete root documents out of the tarball.
