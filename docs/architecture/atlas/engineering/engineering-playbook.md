# DVT+ Engineering Playbook (Code-Aligned)

Date: 2026-03-06
Source: repository code snapshot on `main`

## Navigation

- [Atlas Home](../README.md)
- [Atlas Index](../index.md)
- [Architecture Atlas](../architecture/architecture-atlas.md)
- [Completion Assessment](../status/code-completion-assessment-2026-03-06.md)

## Repository Structure (Actual)

```text
apps/
  api/
  web/

packages/@dvt/
  adapter-postgres/
  adapter-temporal/
  canonical/
  cli/
  contracts/
  dsl/
  engine/
  engine-contracts/
  observability/
  observability-otel/
  plan-interpreter/
  plan-verifier/
  planner/
  state-contracts/
  state-store/
  traceability-service/
```

## Runtime Composition (Today)

- `apps/api` boots Fastify + health/version/db readiness + optional intent reconciler.
- `apps/api` does not yet expose run-domain endpoints.
- `apps/web` renders product views mostly from local mock data.

## Branch Strategy (Current Reality)

- `main`: primary integration branch.
- `feature/*`: short-lived work branches.
- `dev-a/*`: integration/experiment branches in use.
- `develop`: not present in current branch set.

## Pull Request Rules

PR should include:

- tests for changed behavior
- contract/ADR reference when changing architecture boundaries
- no boundary violations across packages
- updates to docs in the same change when behavior changes

## CI/Verification Gates in Code

Primary commands in root `package.json`:

- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm validate:contracts`
- `pnpm lint:determinism`
- `pnpm docs:sync:check`

Package-level examples:

- `pnpm --filter @dvt/engine test`
- `pnpm --filter @dvt/planner test`
- `pnpm --filter @dvt/adapter-temporal test`
- `pnpm --filter @dvt/adapter-postgres test`

## Definition of Done (Operational)

A feature is done when:

- code is merged with passing tests in impacted packages
- behavior is reachable from runtime composition (not test-only wiring)
- tenant safety and idempotency paths are tested when relevant
- observability fields (`runId`, `tenantId`, status/error tags) are emitted
- docs in this atlas are updated if architecture status changed

## Current High-Impact Gaps

- Engine runtime wiring in API process is pending.
- Temporal provider is not selected in API runtime (reconciler currently allows `mock` only).
- Outbox worker exists as library but is not started as a runtime process.
- Web still depends on mock datasets for core workflows.
- Plugin runtime package is not present.

## Related Documents

- Architecture atlas: `../architecture/architecture-atlas.md`
- Completion and effort assessment: `../status/code-completion-assessment-2026-03-06.md`
- System delivery status: `../../system-delivery-status.md`
- Roadmap of record: `../../planning/roadmap/index.md`

## Next

- Continue with [Code Completion Assessment](../status/code-completion-assessment-2026-03-06.md)
