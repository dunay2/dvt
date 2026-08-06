---
title: HET2 public REST artifact to PostgreSQL and dbt vertical
status: Accepted
date: 2026-08-05
owners:
  - '@dvt/contracts'
  - '@dvt/artifacts'
  - '@dvt/temporal-http-json-plugin'
  - '@dvt/adapter-temporal'
  - '@dvt/planner'
  - dvt-temporal-worker
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/HttpJsonArtifactStepTypeConfig.v1.ts
  - packages/@dvt/artifacts/src/contentAddressed/S3ContentAddressedArtifactStore.ts
  - packages/@dvt/temporal-http-json-plugin/src/HttpJsonArtifactPluginRunner.ts
  - apps/temporal-worker/src/runtime/nodeHttpsJsonClient.ts
  - apps/temporal-worker/src/runtime/temporalWorkerHttpJsonProfile.ts
  - apps/web/src/app/views/canvas/httpJsonArtifactAuthoringModel.ts
  - apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts
  - apps/web/cypress/e2e/canvas/canvas-het2-rest-artifact-dbt-live.cy.ts
  - scripts/run-het2-public-vertical-live-proof.cjs
evidence:
  tests:
    - node --test scripts/run-het2-public-vertical-live-proof.test.cjs
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/artifacts test
    - pnpm --filter @dvt/temporal-http-json-plugin test
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/plan-verifier test
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/web test
    - pnpm test:web:e2e:het1-public:live
    - pnpm test:web:e2e:het2-public:live
    - pnpm docs:feature-mechanization:implementation -- --base 2eb393a4a --feature E-HET2-PUBLIC-REST-ARTIFACT-DBT-20260805
    - pnpm planning:db:integrity:check
    - pnpm verify:prepush
---

# Summary

HET2 proves the public heterogeneous route
`ACQUIRE_HTTP_JSON_ARTIFACT -> LOAD_OBJECT_FILE_TO_POSTGRES -> DBT_MODEL -> DBT_TEST`
through the existing Preview, StartRun, status, event, cancellation and recovery
rails. The implementation adds no HTTP proxy or product route.

# Review and size-gate disposition

PR #2226 changes 67,652 lines because the DB-first planning operation
regenerates and reorders the canonical feature-mechanization snapshot. The
semantic planning delta is revision 14 to 15 plus the nine HET2 implementation
surfaces; product, contract, adapter, test and evidence changes remain separated
into reviewable microcommits. The repository-approved `pr-size-exempt` path was
explicitly authorized for this generated-governance case; no quality, ARC,
review or required-status gate was disabled.

# Boundary evidence

```mermaid
flowchart LR
  Canvas[Canvas authoring] --> Preview[PreviewExecutionPlan]
  Preview --> Start[StartRun]
  Start --> Temporal[Generic Temporal dispatcher]
  Temporal --> Acquire[HTTP JSON policy plugin]
  Acquire --> Client[Worker HTTPS and DNS adapter]
  Client --> Store[(Content-addressed S3 object)]
  Store --> Loader[Retained HET1 loader]
  Loader --> Postgres[(PostgreSQL)]
  Postgres --> Dbt[DBT model and test]
```

- Plans contain opaque `http-endpoint:*`, `http-auth:*`, object-store and
  PostgreSQL references, never a URL, token or secret header.
- The worker performs HTTPS-only GET, per-hop DNS/IP validation, address
  pinning, same-origin bounded redirects, timeout, byte, encoding, media-type,
  status, SHA-256 and JSON/JSONL checks. Its address policy covers mapped and
  compatible IPv4-in-IPv6 forms plus the well-known NAT64 prefix.
- The artifact store conditionally creates the tenant-scoped content address,
  verifies an identical retry, and rejects conflicting bytes.
- Activity results and run events carry only `ArtifactAcquisitionEvidence` and
  never response bytes, endpoint URLs or credentials.
- The generic engine and Temporal adapter remain step-family agnostic; the HTTP
  plugin, worker network adapter and HET1 loader are independently composed.

# Executable outcomes

The protected browser proof starts with an empty MinIO bucket and an
authenticated TLS fixture. It proves initial publication, verified-existing
retry, two-row JSONL load, DBT success, endpoint-reference denial, real HTTP 503
refusal, same-size response digest mismatch, request timeout, and controlled
DBT-test failure, all with no invalid downstream start. It requests
cancellation while acquisition is active, proves the active layer settles
without starting the loader, and recovers to a distinct completed run. Evidence
assertions also reject fixture bytes, URL fragments and the bearer token.

The retained HET1 live proof independently exercises source-object integrity
refusal before PostgreSQL mutation, so the combined HET1/HET2 route demonstrates
both acquisition-side and loader-side tamper rejection.

The controlled loopback exception exists only in the non-production proof
configuration; production address policy rejects loopback, private, link-local,
metadata, multicast and unspecified addresses, including IPv4-mapped,
IPv4-compatible and well-known NAT64 representations.
