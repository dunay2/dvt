# CLAUDE.md — Project Context for AI Assistants

## Project

**DVT (Data Value Transform)** — Multi-adapter orchestration engine.
Current phase: **Phase 1 MVP** (due 2026-03-31).

## Monorepo Layout

- **pnpm workspaces** with packages under `packages/*`.
- Key packages:
  - `@dvt/contracts` — shared types, Zod schemas, events
  - `@dvt/engine` — deterministic workflow engine core
  - `@dvt/adapter-postgres` — PostgreSQL persistence adapter
  - `@dvt/adapter-temporal` — Temporal.io adapter
  - `@dvt/cli` — command-line tooling (golden-path validation, contract checks)

## Build & Test

```bash
pnpm install        # install all dependencies
pnpm build          # build every package
pnpm test           # run all tests
pnpm type-check     # TypeScript strict-mode check (tsc --noEmit)
pnpm format         # Prettier format
pnpm lint           # ESLint
```

- **TypeScript** strict mode everywhere.
- **Vitest** for unit / integration tests.
- **ESLint + Prettier** for linting and formatting.

## Determinism Rules (Engine Core)

Inside `packages/@dvt/engine/src/` the following are **forbidden**:

- `Date.now()` / `new Date()` — use the injected clock.
- `Math.random()` — use the injected RNG.
- `process.env` — configuration must be passed explicitly.

These rules ensure workflow replay correctness.

## Commit Convention

**Conventional Commits** required (enforced by commitlint):

```
feat(engine): add retry backoff strategy
fix(contracts): correct Zod schema for StepResult
chore(docs): update architecture diagrams
```

## Documentation

- Entry point: `docs/INDEX.md`
- Architecture: `docs/architecture/engine/INDEX.md`
- Roadmap: `ROADMAP.md`
- Changelog: `CHANGELOG.md`
