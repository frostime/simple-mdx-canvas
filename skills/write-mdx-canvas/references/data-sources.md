# Frontmatter Data Sources

A canvas document can declare named data values in frontmatter and reuse them across components with a `from` prop, so the same rows or chart configuration do not need to be duplicated.

Data is resolved at **build time** and embedded into the single HTML artifact. The rendered page does not fetch data at runtime.

## Declaration

Add a top-level `data` key to frontmatter. Each entry is a named declaration using exactly one of `$src` / `$inline`, plus an optional `$derive`:

```yaml
---
data:
  rows:
    $src: data/rows.json          # path relative to the .mdx file
  costCfg:
    $inline:                       # any YAML literal
      type: bar
      data:
        labels: [A, B]
        datasets:
          - { label: cost, data: [3, 5] }
  counts:
    $inline:
      - { name: a, count: 3 }
      - { name: b, count: 5 }
    $derive:
      onlyCounts: "r => r.map(x => x.count)"
      names: "r => r.map(x => x.name)"
---
```

| magic key | meaning |
|---|---|
| `$src` | path to a `.json` file relative to the `.mdx` file |
| `$inline` | any YAML literal (object, array, scalar) |
| `$derive` | map of `{ name: "<lambda string>" }`; each lambda is `(input) => <plain value>` |

Rules:

- `$src` and `$inline` are mutually exclusive.
- Declaration names and derived names share one flat namespace and must be identifiers (`[A-Za-z_][A-Za-z0-9_]*`).
- `$derive` runs during rendering. Use it only in trusted local documents.

## Consumption

Components that declare a `data` prop slot accept `from` instead of their native data prop:

- `Table`: `from` resolves into `data`.
- `Chart`: `from` resolves into `config` (a whole Chart.js configuration object).

```mdx
<Table from="rows" columns='[{"key":"name","label":"Name"},{"key":"count","label":"Count"}]' />
<Chart from="costCfg" title="Cost comparison" />
```

`from` and the native prop (`data` / `config`) are mutually exclusive.

## Projection DSL

`from` supports a small string projection syntax. No arithmetic, filters, or method calls.

| form | result |
|---|---|
| `X` | the whole declared value |
| `X.f.g` | object path |
| `X[i]` | array index |
| `X[i].f` | index then field |
| `X[].f.g` | array extraction: for each element take path `f.g` |

Inside `X[]...`, missing fields or out-of-bounds indices on individual elements yield `null`, so the output length always equals the source array length (S3 alignment). At the top level (outside any `[]`), accessing a field on a non-object or an index on a non-array is a hard `SMC_INVALID_PROJECTION` error.

```mdx
<Table from="rows" columns='[{"key":"name","label":"Name"}]' />
<Table from="counts[].name" columns='[{"key":"name","label":"Name"}]' />
```

## `$derive` sandbox

`$derive` lambdas are evaluated synchronously in a constrained `vm` sandbox with a 200ms timeout. The sandbox provides `Math`, `JSON`, `Number`, `String`, `Boolean`, `Symbol`, `Date`, `Map`, `Set`, `RegExp`, `Array`, `Object`, and common static methods. It does **not** provide `process`, `require`, `module`, `globalThis`, `Buffer`, timers, `fetch`, or any DOM/BOM.

This is a "prevent accidental misuse + limit time" layer, not an adversarial sandbox. The blocked globals above are not intentionally supplied, but `vm` contexts still expose intrinsics reachable through constructor chains (e.g. `Object.constructor.constructor`); do not rely on their absence for adversarial isolation. Use `$derive` only with trusted local input.

## Error codes

| code | when |
|---|---|
| `SMC_UNKNOWN_DATA` | `from` names an undeclared value |
| `SMC_DATA_REDECLARED` | a declaration or derived name collides with an existing one |
| `SMC_INVALID_DATA_NAME` | a declaration or derived name is not a valid identifier |
| `SMC_INVALID_PROJECTION` | `from` projection syntax is invalid, or `from` is used on a component without a data slot |
| `SMC_DATA_TRANSFORM_ERROR` | a `$derive` lambda threw, timed out, or reached a blocked global |
| `SMC_DATA_SOURCE_CONFLICT` | `$inline`+`$src` both given, or `from`+native data prop both given |
| `SMC_INVALID_DATA_SOURCE` | `$inline` unparseable, or `$src` file unreadable or not valid JSON |
| `SMC_MISSING_ASSET` | `$src` file does not exist |

## When to use

- Reuse the same rows across multiple `Table` calls.
- Share one chart configuration between prose and a `Chart`.
- Keep large data out of the MDX body via `$src`.
- Compute a derived subset (filtered/mapped) once and feed several components.

Use `$derive` only when the document is trusted local input and the transform
keeps repeated component data clearer than external preprocessing.