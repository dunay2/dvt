```markdown
# Changelog

All notable changes to this project will be documented in this file.

> **Note**: Future releases are managed by [release-please](https://github.com/googleapis/release-please).
> Changelog entries are generated automatically from Conventional Commits on merge to `main`.
> The section below documents changes made before release-please was activated.

## Unreleased

### 🔧 Tooling & configuration
- Add missing `test:determinism` and `test:replay` scripts to root package.json (referenced by CI but were absent).
- Create `CLAUDE.md` with project context for AI-assisted development.
- Update ROADMAP.md progress metrics with real GitHub milestone data (Phase 1: 8/14 closed = 57%).

### 📝 Documentation & housekeeping
- Fix README.md: correct CI badge references to actual workflows (`ci.yml`, `contracts.yml`), remove references to non-existent setup scripts and `IMMEDIATE_ACTION_PLAN.md`, consolidate duplicate sections, normalize all commands to `pnpm`.
- Fix docs/INDEX.md: remove broken link to non-existent `OPEN_ISSUES_AND_NEXT_FOCUS.md`, add missing sections (Contracts & automation, Runbooks, Frontend architecture).
- Fix ROADMAP.md: correct broken reference to `docs/WORKFLOW_ENGINE.md` → `docs/architecture/engine/WORKFLOW_ENGINE.md`.
- Fix CONTRIBUTING.md: replace all `npm` commands with `pnpm` for consistency with monorepo tooling.
- Fix docs/guides/QUALITY.md: update workflow table to reference actual CI files, replace `npm` with `pnpm` throughout.
- Fix scripts/README.md: replace `npm` commands with `pnpm`.
- Enable PR triggers in `ci.yml` and `pr-quality-gate.yml` (were commented out).
- Fix `release.yml`: migrate from `npm ci` to pnpm, replace deprecated `actions/create-release@v1` with `softprops/action-gh-release@v2`, make release manual-only (remove push trigger).
- Clean up root `runbooks/` stub (Spanish content replaced with redirect to canonical archive location).

### ♻️ Refactoring & repo layout
- Full engine migration to `packages/engine` with decoupled modules: `WorkflowEngine`, `SnapshotProjector`, `idempotency`, `state store`, `outbox`, and deterministic helpers (`clock`, `jcs`, `sha256`).
- Monorepo infrastructure consolidated: pnpm workspaces, shared tsconfig base, package-level tooling, and package-level scripts.
- Legacy folders (`engine/`, `adapters/`) now contain only redirects or are deprecated.

### 🔧 Tooling & configuration
- ESLint and Vitest configured for the monorepo, including deterministic test support and Date-free clock validation.
- New scripts and lockfile updates for adapter and engine dependencies.
- Prisma and database tooling support added in `adapter-postgres` (initial infrastructure).

### ✅ Tests & correctness
- New unit and contract tests for the engine: hash determinism, idempotency, PlanRef validation, plan integrity, clock edge cases, and contract typing.
- All `@dvt/engine` tests pass locally after migration and refactoring.
- Deterministic clock (`SequenceClock`) and date helpers validated without direct `Date` usage.

### ⚠️ Behavior & API changes
- `WorkflowEngine`: projection and events are now fully deterministic, with canonical hashing and stable event ordering (RunQueued → RunStarted → provider events → RunCompleted).
- Contracts and types normalized/exported for cross-package usage.
- Outbox worker and state store decoupled and tested.

### 📝 Documentation & housekeeping
- Documentation and runbooks moved to `runbooks/`.
- Updated documentation references and diagrams.

### 🧩 Related issues (implemented / referenced)
- Closed: #2 (types), #6 (state store infrastructure), #7 (determinism lint), #10 (golden-path infrastructure), #14 (engine core and projector), #16 (outbox worker), #17 (CI pipeline infrastructure).
- In progress: #5 (TemporalAdapter), #15 (Temporal Interpreter), #8 (Glossary), #9 (RunEventCatalog), #3 (Mermaid diagrams), #19 (security documentation).

### 🔜 In progress / follow-ups
- Real adapter integration (Temporal, Conductor): #5, #68, #69.
- Fixtures and determinism matrix: #70, #73.
- Documentation and diagrams: #3, #19.
- Lint/style cleanup (import/order, explicit return types): recommended follow-up PR.

---

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [2.4.9](https://github.com/dunay2/dvt/compare/v2.4.8...v2.4.9) (2026-02-12)


### 🐛 Bug Fixes

* **docs:** Extract normative security invariants from THREAT_MODEL [#63](https://github.com/dunay2/dvt/issues/63) ([#64](https://github.com/dunay2/dvt/commit/dae7055b9435225a592e130f10837528d46cbf9a)), closes [#13](https://github.com/dunay2/dvt/issues/13)

### [2.4.8](https://github.com/dunay2/dvt/compare/v2.4.7...v2.4.8) (2026-02-12)


### 📝 Documentation

* **engine:** Add Security section to INDEX.md ([#62](https://github.com/dunay2/dvt/issues/62)) ([6a04ff1](https://github.com/dunay2/dvt/commit/6a04ff17c7a56c4421b3ea5c63b32f0292c42835)), closes [#13](https://github.com/dunay2/dvt/issues/13)

### [2.4.7](https://github.com/dunay2/dvt/compare/v2.4.6...v2.4.7) (2026-02-12)


### 📝 Documentation

* update quality summary ([#41](https://github.com/dunay2/dvt/issues/41)) ([58b0497](https://github.com/dunay2/dvt/commit/58b0497b0186fa66d27ae02a46e57b668c3c12da))

### [2.4.6](https://github.com/dunay2/dvt/compare/v2.4.5...v2.4.6) (2026-02-12)

### [2.4.5](https://github.com/dunay2/dvt/compare/v2.4.4...v2.4.5) (2026-02-12)

### [2.4.4](https://github.com/dunay2/dvt/compare/v2.4.3...v2.4.4) (2026-02-12)

### [2.4.3](https://github.com/dunay2/dvt/compare/v2.4.2...v2.4.3) (2026-02-12)

### [2.4.2](https://github.com/dunay2/dvt/compare/v2.4.1...v2.4.2) (2026-02-12)

### [2.4.1](https://github.com/dunay2/dvt/compare/v2.4.0...v2.4.1) (2026-02-12)

## [2.4.0](https://github.com/dunay2/dvt/compare/v2.3.0...v2.4.0) (2026-02-12)


### ✨ Features

* Phase 2 - Projector and Engine adapter contracts ([#56](https://github.com/dunay2/dvt/issues/56)) ([81bfec8](https://github.com/dunay2/dvt/commit/81bfec85d59eb1b20be88fecd805dcbb75c44ebd))

... (file continues)

```
