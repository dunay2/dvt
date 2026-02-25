# Development Standard & Base Template (Normative)

> **Status**: Normative (part of canonical blueprint via Annex 19)
> **Rule**: Any change to this file MUST be accompanied by an update to `docs/DVT_Blueprint_v0.6_MASTER.md` **Section 15** (Annex 19).

---

## 1) Toolchain

- **Node**: 22.x (runtime + CI, objetivo oficial del pack v0.6)
- **Package manager**: pnpm (workspaces)
- **Build orchestration (baseline actual)**: pnpm workspaces + scripts raíz
- **Build orchestration (fase 2 opcional)**: TurboRepo para affected builds
- **Language**: TypeScript strict, ESM
- **Schemas**: JSON Schema draft 2020-12 (source of truth for boundary payloads)
- **Formatter**: Prettier
- **Lint**: ESLint (including boundaries / no-restricted-imports)

## 2) Repo rules

- Each `packages/@dvt/<module>` is **self-contained**.
- Cross-module imports of internals are forbidden:
  - ✅ allowed: `@dvt/devkit-*` (technical-only), external deps
  - ❌ forbidden: importing `src/**` internals of another domain module
- Generated code lives under `src/generated/**` and MUST NOT be edited manually.

## 3) TypeScript rules

- `strict: true` and `noImplicitAny: true`
- **No `any`**.
- Prefer explicit domain types; keep adapter types isolated.
- Public exports MUST be curated through `src/index.ts` (barrel discipline).

## 4) Testing standard

### Unit tests

- Fast, deterministic, no external dependencies.

### Contract/schema tests

- JSON Schema compilation (AJV) MUST pass.
- Generated TS types MUST match schemas (codegen check).

### Smoke tests (mandatory where runtime-relevant)

- Each runtime-relevant module MUST expose `pnpm cli:smoke`.
- Smoke MUST start **real dependencies** via Docker Compose and run an end-to-end slice.
- Local infra compose files:
  - Kafka: `infra/kafka/local-compose.yaml`
  - Postgres: `infra/rds/local-compose.yaml`
- Smoke entry point: `packages/@dvt/<module>/cli/src/smoke.ts`
- Preferred approach: [Testcontainers](https://node.testcontainers.org/) for per-module independence; Docker Compose for full-stack integration.

## 5) ADR workflow

- ADRs live in `docs/adr/` with sequential numbering.
- Semantic changes MUST link to an Accepted ADR (see blueprint Section 13).
- ADR template: include Context, Decision, Consequences, Alternatives, and Scope.
- The CI gate (`infra/ci/adr-linkage.yml`) checks for ADR file changes **or** an `ADR-NNNN` reference in the PR body. Adding/modifying the ADR file is the preferred form.

### ADR migration note

- New ADRs MUST be created only under `docs/adr/`.
- Legacy ADR locations can be migrated in batches with redirect pointers and link updates.

## 6) PR checklist (minimum)

- [ ] Updated canonical blueprint if semantics changed (Section 15 = Annex 19 reference)
- [ ] ADR file added/modified or `ADR-NNNN` referenced in PR body for semantic changes
- [ ] `pnpm -r typecheck` passes
- [ ] `pnpm -r test` passes
- [ ] `pnpm -r cli:smoke` passes (where applicable)
- [ ] Schema validation and codegen checks pass
- [ ] Devkit surface check passes (`tooling/scripts/check-devkit-surface.ts`)
