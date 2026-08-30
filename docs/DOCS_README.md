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
pnpm docs:publish
pnpm docs:serve
```

`pnpm docs:publish` is the explicit, DB-backed publication request. It queries
existing Planning DB authority, runs only generators declared for publication,
and assembles the untracked Zensical tree without importing or rebuilding the
database. `docs:serve` does not generate
documentation; it validates and serves that existing tree. `pnpm docs:build`
uses the same tree and also fails with the publication command when it is absent.

Before consulting architecture or design, query the authority rather than
guessing from the filesystem:

```bash
pnpm planning:db:query architecture-designs --limit 100
```

Follow the returned canonical evidence paths for deeper reading. A rendered page
is a disposable view, not architecture authority. If Planning DB is unavailable
or stale, fail closed; import is an explicit bootstrap or recovery operation.

For local docs validation and regeneration:

```bash
pnpm docs:ci
```

`pnpm docs:ci` is allowed to rewrite generated documentation surfaces in the
current worktree before running the docs validation checks. Its code-state step
is deliberately DB-free.

Generate only the ignored local code-state inventory without Planning DB:

```bash
pnpm docs:status:generate --code-state-only
```

To request a DB-backed site projection, including Repository Map, run:

```bash
pnpm docs:publish
```

For strict drift enforcement against `HEAD`:

```bash
pnpm docs:sync:check
```

That command is the explicit clean-worktree gate for tracked generated docs
output.

MVP task lifecycle is validated through GitHub Issues and pull requests. The
repository does not generate a second local workboard.

## Runtime authority

- Primary docs runtime: `zensical`
- Canonical docs config file: `zensical.yml`
- Canonical local commands: `pnpm docs:publish`, `pnpm docs:serve`,
  `pnpm docs:build`, and `pnpm docs:ci`

One contract now owns the docs runtime and docs validation surfaces. CI keeps
its explicit strict drift gates on top of that contract. There is no secondary
compatibility config.

## Planning authority rule

GitHub Issues owns MVP backlog, priority, assignment, status, blockers,
acceptance, and task evidence. Pull requests own implementation review, checks,
and merge.

Planning DB remains the authority for architecture, components, capabilities,
relations, command/query rails, feature mechanization, and architecture
evidence. It is not a second task registry.

The following planning surfaces are derived local/CI artifacts and must not be
committed:

- `docs/planning/index.md`
- `docs/planning/proposals/index.md`
- `docs/planning/reviews/index.md`
- `docs/planning/status/index.md`

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
