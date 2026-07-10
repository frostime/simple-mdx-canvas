# AGENTS.md

Project: `simple-mdx-canvas` converts one agent-written `.mdx` file into a directly openable HTML canvas.

Core contract: `.mdx` content + registered components -> `smc validate` -> `smc render` -> `.html`. Do not turn this into a general app framework.

Before changing behavior, read the relevant code plus `SPEC.md`/`DESIGN.md`. Keep changes surgical; do not refactor adjacent code without need.

Verification:

```bash
npm run check --silent
npm run build --silent
npm run validate:example
npm run render:example
```

When changing MDX syntax, built-in components, validation rules, rendering behavior, or visual output, update all affected docs/examples/skills in the same change.

`skills/write-mdx-canvas/` is for external Agents. It must describe what compliant canvas documents can use and how to validate/render/repair them. Do not impose fixed report outlines.

Component design:

- Prefer deep interfaces over shallow wrappers.
- Do not invent a smaller parallel API over a mature underlying library.
- `Chart` accepts Chart.js `config` and passes it through; renderer may fill missing theme defaults but must not override explicit config.
- `HtmlBlock` uses children, safe by default, and `unsafe` for trusted raw HTML/JS.

Current project state: unpublished/pre-release. Do not preserve obsolete local APIs unless the user asks. If an interface is wrong, replace it and update examples/docs/skills.

Dependency changes must keep tracked lockfiles consistent.
