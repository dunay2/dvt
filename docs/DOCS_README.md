# DVT Docs Structure (Baseline)

This repository uses **Zensical as the primary docs runtime** for local serve
and build flows.

- `zensical.yml` is the only documentation config file.
- Repo docs scripts and CI consume the same Zensical config contract.

## Goals

- Single canonical ADR location: `docs/adr/`
- Clear separation between normative docs and non-normative planning
- `index.md` in every directory to avoid orphaned sections
- `zensical.yml` kept as the canonical docs config surface

## Conventions

- Use `index.md` (lowercase) for every directory landing page
- Mark document status explicitly (`Accepted`, `Active`, `Draft`, `Review`, `Archived`)
- Keep ADR IDs unique globally
- Move historical documents to `docs/archive/` or `docs/adr/_archive/`
- Use the governed maintenance procedure in
  [`docs/guides/documentation-maintenance-guide-20260407.md`](./guides/documentation-maintenance-guide-20260407.md)
  when code, planning, or archive moves change active reader routes

## Quick start

```bash
pnpm docs:serve
```

Use the repository script instead of calling legacy docs tooling directly. The
script runs `docs:sync` first and then serves the generated site through
`zensical`.

For local docs validation and regeneration:

```bash
pnpm docs:ci
```

`pnpm docs:ci` is allowed to rewrite generated documentation surfaces in the
current worktree before running the docs validation checks.

For strict drift enforcement against `HEAD`:

```bash
pnpm docs:sync:check
```

That command is the explicit clean-worktree gate for tracked generated docs
output.

For planning-generated local or CI artifacts that are intentionally not tracked
in git:

```bash
pnpm docs:workboard:check
```

That command regenerates the planning-derived pages, verifies the required
files and sections exist, checks determinism across repeated runs, and fails if
those pages are accidentally tracked in git again.
For isolated local generation (useful with concurrent agents or long-lived
branches):

```bash
pnpm docs:planning:preview:isolated
```

This writes generated planning lane/workboard outputs to
`.generated-docs/docs/planning/state/` without modifying tracked docs files.

## Runtime authority

- Primary docs runtime: `zensical`
- Canonical docs config file: `zensical.yml`
- Canonical local commands: `pnpm docs:serve`, `pnpm docs:build`, and `pnpm docs:ci`

One contract now owns the docs runtime and docs validation surfaces. CI keeps
its explicit strict drift gates on top of that contract. There is no secondary
compatibility config.

## Planning-generated artifact rule

The tracked planning sources of truth are:

- `docs/planning/state/agent-lane-*.yaml`
- tracked planning docs such as `planning-control-tower.md`, portfolio maps,
  proposals, reviews, closeouts, and roadmap docs

For existing task operations, the local Postgres query store is the operational
surface. Use `pnpm planning:db:operate` for claim/release/status/progress and
evidence overlay changes, then inspect with `pnpm planning:db:query tasks` or
`pnpm planning:db:query next`. Lane YAML remains the bootstrap and PR-review
compatibility surface for new task definitions until create/delete commands are
declared for the DB rail.

The following planning surfaces are derived local/CI artifacts and must not be
committed:

- `docs/planning/index.md`
- `docs/planning/proposals/index.md`
- `docs/planning/reviews/index.md`
- `docs/planning/status/index.md`
- `docs/planning/state/agent-lane-*.md`
- `docs/planning/state/execution-workboard.md`
- `docs/planning/state/open-task-route.md`

## Generated-Docs Single-Writer Policy

Generated documentation ownership is declared in
[`docs/generated-docs-policy.json`](./generated-docs-policy.json).

Each artifact class in that policy declares:

- `artifacts`: generated files or file patterns owned by the class
- `sourcePaths`: the editable source files or directories that own the content
- `generatorCommand`: the canonical command used to regenerate the artifacts
- `tracking`: whether the generated output is intentionally `tracked` or
  `untracked`
- `manualEditPolicy`: whether humans edit the generated output directly or edit
  the source and regenerate

Validate the policy with:

```bash
pnpm docs:gov:generated-policy
```

`docs:gov`, `ci:docs`, and `verify:prepush` run this check so generated-doc
ownership cannot drift silently. For generated files, edit the declared source
paths and run the declared generator command instead of hand-editing the output.
