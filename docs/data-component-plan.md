# Frontmatter Data Source — Plan & Acceptance

Status: historical implementation plan. Superseded by `docs/BACKLOG.md`,
`docs/REFACTOR_PLAN.md`, and the current source and tests.

## 1. Goal

Let a canvas document declare named data values in **frontmatter** and let consuming components (`Table`, `Chart`, any manifest that declares `dataProp`) reference those values by a string `from` prop. Data is resolved at **build time** and embedded into the single-file HTML artifact. No runtime fetch.

## 2. Why

Agent-authored canvases reuse the same data across visual components (the same rows shown as a `Table` and the same numbers in a `Chart`). Today that means duplicating JSON inside `Table data=` and `Chart config=`. Frontmatter data sources remove the duplication and keep the document DRY without turning MDX into code and without polluting the document body with renderless tags.

## 3. Surface (final UX)

```mdx
---
title: "Report"
data:
  rows:
    $src: data/rows.json
  costCfg:
    $inline:
      type: bar
      data:
        labels: [A, B]
        datasets:
          - { label: x, data: [1, 2] }
  counts:
    $inline:
      - { name: a, count: 3 }
      - { name: b, count: 5 }
    $derive:
      onlyCounts: "r => r.map(x => x.count)"
      names:      "r => r.map(x => x.name)"
---

<!-- safe mode: from + projection DSL -->
<Table from="rows" columns='["name","count"]' />
<Table from="onlyCounts" columns='["count"]' />
<Chart from="costCfg" />
```

### Frontmatter `data:` shape

A top-level `data` key. Each entry under it is a named declaration. Each declaration object uses exactly-one-of these `$`-prefixed magic keys:

| magic key | meaning | notes |
|---|---|---|
| `$src` | string; path to `.json` file relative to the mdx dir | loaded at build time; missing → `SMC_MISSING_ASSET` |
| `$inline` | any YAML literal | inline source |
| `$derive` | map of `{ name: "<lambda string>" }` | synchronous `(input) => <plain>`; the input is the `$inline`/`$src` resolved value of this same declaration; **gated by `--trusted-mdx`** |

Rules:
- A declaration may have `$inline` **or** `$src` (mutually exclusive → `SMC_DATA_SOURCE_CONFLICT`); `$derive` is optional either way.
- `$derive` produces additional names that join the same global namespace, with `SMC_DATA_REDECLARED` on collision.
- Top-level and derived names share one flat namespace. `name` (the YAML key) must be a JS identifier (`[A-Za-z_][A-Za-z0-9_]*`) → else `SMC_INVALID_DATA_NAME`.
- Parse/eval failures → `SMC_INVALID_DATA_SOURCE` / `SMC_DATA_TRANSFORM_ERROR`.

Why `$`-prefixed: Chart.js config has a `data`/`options` field, other configs may have `src`/`inline`. A bare key would collide with real field names. `$src` / `$inline` / `$derive` are uncommon as data field names → unambiguous.

### Consumer props (existing components)

- New optional `from` string prop on any manifest that declares `dataProp`.
- `from` resolves via projection DSL → value written into the component's `dataProp` (`Table` → `data`, `Chart` → `config`) → existing zod schema runs against the resolved native value.
- `from` + the native dataProp both present → `SMC_DATA_SOURCE_CONFLICT`.

### Projection DSL (`from`)

Pure string, safe-mode-allowed:

- `X` → whole value
- `X.f.g` → object path
- `X[i]` → array index
- `X[i].f` → index + path
- `X[].f.g` → array extraction: for each element take path `f.g` → array
- No arithmetic, no filters, no method calls

Bad token → `SMC_INVALID_PROJECTION`; unknown name → `SMC_UNKNOWN_DATA`.

### `$derive` sandbox

`vm.runInNewContext`, `timeout: 200ms`, sync only. Context provides: `Array`, `Object`, `Date`, `Map`, `Set`, `RegExp`, `Boolean`, `Math`, `JSON`, `Number`, `String`, `Symbol`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `Array.from`, `Array.isArray`, `Object.keys`, `Object.values`, `Object.entries`, `Object.fromEntries`, `Object.assign`. Does **not** provide: `process`, `require`, `module`, `globalThis`, `Buffer`, `setImmediate`, `setTimeout`, `setInterval`, `__dirname`, `__filename`, `fetch`, `URL`, network/DOM.

Honest boundary: "prevent accidental misuse + limit time" layer, **not an adversarial sandbox** (vm caveat). derive stays gated by `--trusted-mdx`; output is a local HTML file.

## 4. Architecture

### New deep module `src/core/document-data.ts`

Public surface (only two functions):

```ts
resolveDocumentData(frontmatter, { cwd, docDir, trustedMdx }) =>
  { data: DocumentDataMap; errors: CanvasValidationError[] }

resolveFrom(from: string, data: DocumentDataMap) =>
  { ok: boolean; value?: unknown; error?: CanvasValidationError }
```

Internal (private to module): per-declaration source resolution (`$src` file load / `$inline` literal), identifier check, namespace dedup, derive sandbox eval, projection parser.

The module depends only on frontmatter, not on full source scanning — declarations live in frontmatter.

### Changes to existing modules

- `types.ts` / `document.ts`: extend `CanvasFrontmatter` with `data?: DataDeclarations` (typed as a record of named declarations). Already parsed by `gray-matter`.
- `validate.ts`: switch from regex `parseAttributes` to **MDX AST** prop extraction (DESIGN §12 future work, done now); for each consumer component with a `from` attribute, call `resolveFrom` + write value into `dataProp`, then run existing zod schema. New errors appended. Data resolution errors flow from `resolveDocumentData(document.frontmatter, ...)`.
- `render.ts`: call `resolveDocumentData(document.frontmatter, ...)` first. Then for every consumer component (AST nodes) rewrite its `from` attribute to `dataProp='<escaped JSON>'` in the source passed to MDX `evaluate`. No runtime scope injection; MDX stays content-not-code.
- `registry.ts` / `types.ts`: add `dataProp?: string` to `CanvasComponentManifest`; set `Table` → `'data'`, `Chart` → `'config'`; relax their schemas (native `data`/`config` optional, `from: z.string().optional()`, refine mutual exclusion).
- No new built-in component manifest. `Data` is not a registered component.

### Decision log (locked)

- Carrier: frontmatter `data:` namespace (F), not a `<Data>` component.
- Magic keys: `$src` / `$inline` / `$derive`.
- derive value form: string lambda `r => <plain>`, single param, sync.
- Two-pass resolution (frontmatter declarations are inherently position-independent).
- AST-based source rewrite + AST-based validate prop extraction (DESIGN §12 future work, done now).
- derive sync only; vm timeout 200ms; minimal context; not adversarial; gated by `--trusted-mdx`.
- Declarations are self-contained (no `$derive` referencing other declarations' names; its `r` input is its own `$src`/`$inline`).
- Chart `from` accepts only a whole Chart.js config; Chart component code unchanged.
- `--trusted-mdx` reused for derive gating (no new flag).

### Safety boundary note

derive is in **frontmatter YAML**, not in MDX body. This keeps MDX body non-code (SPEC §12 unchanged). The write-mdx-canvas SKILL hard rule "no arbitrary JS expressions beyond literal props" stays as-is — the body only gains the string `from` prop (a literal).

## 5. Error Codes

| code | when |
|---|---|
| `SMC_UNKNOWN_DATA` | `from` names an undeclared value |
| `SMC_DATA_REDECLARED` | `name` or derived key collides |
| `SMC_INVALID_DATA_NAME` | declaration name not a valid identifier |
| `SMC_INVALID_PROJECTION` | `from` projection syntax invalid |
| `SMC_FORBIDDEN_DATA_TRANSFORM` | `$derive` present but `--trusted-mdx` not set |
| `SMC_DATA_TRANSFORM_ERROR` | derive eval threw (syntax, runtime, timeout, sandbox escape attempt) |
| `SMC_DATA_SOURCE_CONFLICT` | `$inline`+`$src` both given, or `from`+native dataProp both given |
| `SMC_INVALID_DATA_SOURCE` | `$inline` unparseable / `$src` file unreadable or non-JSON |
| `SMC_MISSING_ASSET` | `$src` file does not exist (existing planned code, reused) |

## 6. Acceptance Criteria

A merge-ready state when **all** hold:

1. `npm run check` passes (tsc --noEmit).
2. `npm run build` passes.
3. `npm run validate:example` passes on `examples/report.mdx` after it has frontmatter `data:` and a body component with `from`.
4. `npm run render:example` produces `examples/report.html` opening standalone (no external data file needed at open time).
5. `report.html` does **not** contain `src="data/..."` references nor `fetch(` calls; data is embedded.
6. New `node:test` tests pass (see §7).
7. SPEC.md, DESIGN.md, `skills/write-mdx-canvas/` (SKILL + new `references/data-sources.md` + Table/Chart reference updates) all reflect the feature.
8. `--trusted-mdx` toggle is observed (derive rejected without it; accepted with it).

## 7. Test Surface (rough)

Cases to cover via `node:test` (lightest available, matches engines >=20).

**Document-data unit (`src/core/document-data.ts`):**
- `$inline` literal → resolved.
- `$src` file resolution relative to doc dir → loaded; missing file → `SMC_MISSING_ASSET`.
- `$inline` + `$src` both → `SMC_DATA_SOURCE_CONFLICT`.
- malformed `$src` file (non-JSON) → `SMC_INVALID_DATA_SOURCE`.
- declaration name invalid identifier → `SMC_INVALID_DATA_NAME`.
- name collision (two top-level / derived key collision) → `SMC_DATA_REDECLARED`.
- `$derive` under trusted flag executes; results attached.
- `$derive` under non-trusted → `SMC_FORBIDDEN_DATA_TRANSFORM`.
- `$derive` throws (syntax / runtime / explicit throw) → `SMC_DATA_TRANSFORM_ERROR`.
- `$derive` infinite loop → `SMC_DATA_TRANSFORM_ERROR` (timeout).
- `$derive` sandbox tries `process` → `SMC_DATA_TRANSFORM_ERROR`.

**Projection DSL:**
- whole `X`.
- object path `X.f.g`.
- index `X[0].f`.
- array extraction `X[].f.g`.
- bogus grammar → `SMC_INVALID_PROJECTION`.
- path missing on value → `SMC_INVALID_PROJECTION` (or empty array for `X[]` — pick one and document).
- unknown name → `SMC_UNKNOWN_DATA`.

**Render / validate integration:**
- safe-mode doc using `<Table from="rows" .../>` validates and renders with the resolved rows.
- Chart `from="costCfg"` renders with `data-canvas-chart` carrying the resolved config.
- `from` + native prop both present → `SMC_DATA_SOURCE_CONFLICT`.
- `from` pointing at non-existent data → `SMC_UNKNOWN_DATA`.
- `$derive` accepted only under `--trusted-mdx`.

**Behavior quick checks:**
- rendered HTML is self-contained for a doc using `$src` (data baked in).
- `--trusted-mdx` flag toggles derive acceptance.

## 8. Out of Scope (this branch)

- Cross-declaration references (a `$derive` lambda referencing another declared name).
- derive async / streaming.
- worker_threads hard sandbox.
- `output.bundleAssets=false` style external-data HTML mode.
- Snippet reuse (separate future feature).
- General validator AST overhaul beyond what `from`/`dataProp` need.

## 9. Doc/Skill updates required

- SPEC §5 add `data?` to frontmatter fields; §7 (or a new subsection) describe frontmatter data sources; §11 add error codes; §12 add derive gated + sandbox caveat (MDX body non-code preserved).
- DESIGN §2 extend `Document` with data sources; §7 describe frontmatter data resolution; §11 note AST prop extraction.
- `skills/write-mdx-canvas/SKILL.md`: add frontmatter data source example; note `from` is a safe-mode string prop; no relaxation of "no arbitrary JS in body" rule (derive lives in frontmatter).
- New `skills/write-mdx-canvas/references/data-sources.md`.
- Update `references/components/table.md` and `chart.md` with `from`.
- Update `examples/report.mdx` to demonstrate frontmatter `data:` + `from` reuse between `Table` / `Chart`.