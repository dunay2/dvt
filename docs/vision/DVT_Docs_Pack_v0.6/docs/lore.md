# Lore (D&D mapping) — DVT+

> **Location (v0.6)**: `docs/lore.md` (entry point for Annex 20)
> **Decision**: en v0.6 el lore se mantiene en archivo único; una futura partición por carpetas requiere PR de migración explícita.
> **Generation procedures**: `docs/standards/development.md` (section: AI generation procedure)

---

## 14) Lore (D&D) + mandatory Mapping to repo

### 14.1 Lore purpose

Lore is **learning + onboarding**. It does not replace technical docs.

### 14.2 Mandatory "Mapping to repo"

El documento `docs/lore.md` MUST incluir una sección "📌 Mapping to repo" con:

- Purpose (real)
- Boundaries
- Repo paths
- Contracts (schemas)
- CLI commands
- Tests
- Kafka topics / RDS tables (if applicable)

### 14.3 Lore template (single-file section)

```markdown
# [Module Name] — Lore

## The story

<!-- Narrative/D&D framing for onboarding -->

## The character

<!-- Role in the system, metaphor -->

## 📌 Mapping to repo

| Field              | Value                                   |
| ------------------ | --------------------------------------- |
| **Purpose (real)** | <!-- What this module actually does --> |
| **Boundaries**     | <!-- What it MUST NOT do -->            |
| **Repo path**      | `packages/@dvt/<module>/`               |
| **Schemas**        | `packages/@dvt/<module>/schemas/`       |
| **CLI smoke**      | `pnpm --filter @dvt/<module> cli:smoke` |
| **Unit tests**     | `pnpm --filter @dvt/<module> test`      |
| **Kafka topics**   | <!-- if applicable -->                  |
| **RDS tables**     | <!-- if applicable -->                  |
```

---

## 15) AI generation procedure (strict order)

> **Note**: This section documents the scaffolding procedure for AI-assisted generation. It lives here as an operational runbook for the lore/onboarding layer. The normative development standard is in `docs/standards/development.md`.

1. Generate root scaffolding:
   - pnpm + turbo + base tsconfig
2. Generate boundary enforcement:
   - ESLint config + verify script (`tooling/scripts/check-devkit-surface.ts`)
3. Generate schema tooling:
   - bundling + AJV validation
   - TS codegen into `src/generated/**`
   - contract tests
4. Generate infra local compose:
   - `infra/kafka/local-compose.yaml` — Kafka + Zookeeper services
   - `infra/rds/local-compose.yaml` — Postgres service with init scripts
5. Generate initial modules:
   - `run-state-store`, `engine`, `planner`
   - include minimal schemas, codegen, contract tests, CLI smoke
6. Generate lore:
   - update `docs/lore.md` with campaign/module sections and required "📌 Mapping to repo"
7. Validate:
   - `pnpm turbo run codegen`
   - `pnpm turbo run build`
   - `pnpm turbo run test`
   - `pnpm turbo run cli:smoke`

---

## 16) Authoritative references (links)

- Turbo: https://turbo.build/repo/docs
- pnpm workspaces: https://pnpm.io/workspaces
- JSON Schema: https://json-schema.org/
- AJV: https://ajv.js.org/
- Kafka: https://kafka.apache.org/documentation/
- Transactional outbox: https://microservices.io/patterns/data/transactional-outbox.html
- CQRS: https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
- Postgres partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- ADRs: https://adr.github.io/
- Hexagonal: https://alistair.cockburn.us/hexagonal-architecture/
- Domain Layer (Fowler): https://martinfowler.com/bliki/DomainLayer.html
- Event sourcing (Fowler): https://martinfowler.com/eaaDev/EventSourcing.html
- D&D: https://dnd.wizards.com/
