---
title: Documentation Guide
description: Locate the current product, architecture, maintenance, and deferred-work documents.
scope:
  - /docs/**
  - /src/**
updated: 2026-07-11
---

# Documentation Guide

These documents describe the current repository. Git history and
`CHANGELOG.md` retain implementation history; do not add process notes or
superseded plans here.

## Read By Task

| When you need to... | Read |
| --- | --- |
| Change a public command, document capability, component contract, extension contract, theme, or asset behavior | [Product Contract](./SPEC.md) |
| Change source ownership, parser flow, validation/render relationship, extension loading, or dependency direction | [Architecture](./DESIGN.md) |
| Modify the repository, add dependencies, select verification, prepare a release, or update related documentation | [Development Guide](./DEVELOPMENT.md) |
| Consider work that is intentionally deferred and not yet approved | [Backlog](./BACKLOG.md) |
| Change MDX source semantics or diagnostics | [Document Module Specification](../src/document/SPEC.md) |
| Change trusted local extension loading | [Extension Module Specification](../src/extensions/SPEC.md) |
| Write a canvas document for an end user | [write-mdx-canvas skill](../skills/write-mdx-canvas/SKILL.md) |

## Authority

Code and tests define the implemented behavior. `SPEC.md` defines supported
public behavior; `DESIGN.md` defines architecture constraints that preserve
that behavior. A proposed change that conflicts with either requires an
explicit contract or design update in the same change.

`BACKLOG.md` is not a roadmap or an implementation authorization. Re-scope and
accept an item before implementation.
