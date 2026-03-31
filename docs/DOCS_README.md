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

That command is the explicit clean-worktree gate for generated docs output.

## Runtime authority

- Primary docs runtime: `zensical`
- Canonical docs config file: `zensical.yml`
- Canonical local commands: `pnpm docs:serve`, `pnpm docs:build`, and `pnpm docs:ci`

One contract now owns the docs runtime and docs validation surfaces. CI keeps
its explicit strict drift gates on top of that contract. There is no secondary
compatibility config.
