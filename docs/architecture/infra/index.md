---
title: Infrastructure Architecture
status: Active
owner: Platform / Infrastructure
last_reviewed: 2026-03-08
---

# Infrastructure Architecture

This page is the canonical landing page for infrastructure and runtime-platform
documentation.

It exists to stop infrastructure notes from being scattered across `infra/`,
package-local design files, API runtime specs, and CI workflow files with no
clear entry point.

Concept anchors for this page:

- [Glossary](../../concepts/glossary.md) for `runtime`, `artifact`, and
  `status`
- [Domain Language](../../concepts/domain-language.md) for the naming rules
  used across infra, planning, and runtime docs

## Scope

- local platform dependencies used for development and verification;
- database bootstrap and migration surfaces;
- runtime exposure and deployment-sensitive API concerns;
- CI and delivery workflows that affect documentation and runtime confidence.

## Canonical Reading Order

1. [infra/README.md](../../../infra/README.md)
2. [packages/@dvt/adapter-postgres/DESIGN.md](../../../packages/@dvt/adapter-postgres/DESIGN.md)
3. [API current-to-target architecture](../components/api/api-current-to-target-architecture.md)
4. [System Delivery Status](../system-delivery-status.md)
5. [R-20260308 G5 state-store outbox worker drift](../../risk-register/adapters/R-20260308-g5-state-store-outbox-worker-drift.md)

## Primary Infrastructure Anchors

- Local Postgres compose:
  [infra/docker/postgres/docker-compose.yml](../../../infra/docker/postgres/docker-compose.yml)
- Canonical Temporal Postgres proof runbook:
  [Temporal Postgres Proof Environment](../../runbooks/temporal-postgres-proof-environment.md)
- Local bootstrap SQL:
  [infra/docker/postgres/init/001_bootstrap.sql](../../../infra/docker/postgres/init/001_bootstrap.sql)
- Database migrations:
  [infra/db/migrations/2026-03-04_g3_start_run_intent.sql](../../../infra/db/migrations/2026-03-04_g3_start_run_intent.sql)
  and
  [infra/db/migrations/2026-03-06_artifact_store.sql](../../../infra/db/migrations/2026-03-06_artifact_store.sql)
- CI workflow entrypoint:
  [.github/workflows/ci.yml](../../../.github/workflows/ci.yml)
- Docs deployment workflow:
  [.github/workflows/docs-deploy.yml](../../../.github/workflows/docs-deploy.yml)

## Architectural Position

### Local infra is part of the product boundary

Local compose files, bootstrap SQL, and migrations are not disposable side
notes. They shape whether adapters, API auth, and state-store behavior can be
verified at all.

### Infra docs must point back to runtime docs

Infrastructure without runtime context is misleading. Read infra docs together
with:

- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
- [Runbooks](../../runbooks/index.md)
- [Risk Register](../../risk-register/index.md)

### Delivery workflows are architecture, not just automation

CI and docs deployment workflows are part of the repository operating model. If
they drift from the documented runtime assumptions, the documentation is lying.

## Verification

- `pnpm test:adapter-postgres`
- `pnpm --filter dvt-api test`
- `pnpm docs:build`

## Open Gaps

- There is still no single production deployment architecture doc.
- Infrastructure guidance is still split between `infra/`, package-local design
  files, and planning/risk docs.
- Redpanda and broader event-bus runtime notes remain subordinate to local
  compose artifacts rather than a first-class accepted platform spec.
