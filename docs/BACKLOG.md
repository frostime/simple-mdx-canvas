---
title: Backlog
description: Deferred product candidates that require explicit re-scoping before implementation.
scope:
  - /docs/BACKLOG.md
updated: 2026-07-11
---

# Backlog

This file contains deferred candidates, not approved work. An item must be
re-scoped and accepted before code, public contracts, or documentation changes
begin.

## Deferred: Interactive User Components

**Status:** not currently planned.

The current static TSX extension model server-renders reusable components.
`HtmlBlock` remains available for trusted, local DOM scripting. Reconsider this
item only when a report needs reusable component-local browser state or events
that are no longer maintainable as a static component or an isolated HTML
fragment.

A future proposal must define:

- manifest metadata that distinguishes static and interactive components;
- server rendering followed by hydration of only the interactive component root;
- JSON-serializable props and a structured rejection of MDX children;
- browser bundling that is emitted only when an interactive component is used;
- browser tests for both `render` and `serve` output that exercise a visible
  state change.

This item must not introduce document-level event handlers or document ESM
imports. It must preserve static documents without a browser React runtime.
