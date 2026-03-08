# DVT Docs Structure (Baseline)

This ZIP contains a **clean baseline documentation structure** for MkDocs + Material.

## Goals

- Single canonical ADR location: `docs/adr/`
- Clear separation between normative docs and non-normative planning
- `index.md` in every directory to avoid orphaned sections
- `mkdocs.yml` ready to run with the structure

## Conventions

- Use `index.md` (lowercase) for every directory landing page
- Mark document status explicitly (`Accepted`, `Active`, `Draft`, `Review`, `Archived`)
- Keep ADR IDs unique globally
- Move historical documents to `docs/archive/` or `docs/adr/_archive/`

## Quick start

```bash
pnpm docs:serve
```

Use the repository script instead of calling `mkdocs serve` directly. The
script runs `docs:sync` first and then serves the generated site through the
configured documentation toolchain.
