# Development Standard & Base Template (Normative, English)

> **Status**: Normative (part of canonical blueprint via Annex 19)
> **Rule**: Any change to this file MUST be accompanied by an update to `docs/DVT_Blueprint_v0.6_MASTER.md` **Section 15** (Annex 19).

---

## 1) Toolchain

- **Node**: 22.x (runtime + CI, official target for pack v0.6)
- **Package manager**: pnpm (workspaces)
- **Build orchestration (current baseline)**: pnpm workspaces + root scripts
- **Build orchestration (optional phase 2)**: TurboRepo for affected builds
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
