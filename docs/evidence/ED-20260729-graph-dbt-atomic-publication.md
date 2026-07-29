---
title: Atomic publication of graph-authored dbt workspace artifacts
status: Accepted
date: 2026-07-29
owners:
  - '@dvt/contracts'
  - dvt-api
  - dvt-web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts
  - apps/api/src/application/ports/graphDbtWorkspaceArtifactPublication.ts
  - apps/api/src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.ts
  - apps/api/src/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.ts
  - apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts
  - apps/web/src/app/services/dbtProject/dbtGraphWorkspaceArtifactPublisher.ts
  - apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/graph-dbt-workspace-artifact-publication.contract.test.ts
    - pnpm --filter dvt-api exec vitest run test/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.test.ts
    - pnpm --filter dvt-web exec vitest run src/app/services/dbtProject/__tests__/dbtGraphWorkspaceArtifactPublisher.test.ts
    - pnpm --filter dvt-web exec vitest run src/app/services/dbtProject/__tests__/graphDbtWorkspaceArtifactPublication.api.test.ts
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-web test
    - pnpm verify:prepush
---

# Summary

Graph-authority execution now publishes the complete dbt artifact set through one
product-specific protected command. The command validates the accepted workspace
snapshot and delegates exactly one mutation to the existing atomic workspace-file
batch gateway.

# Decision

The minimum viable publication boundary contains:

- `dbt_project.yml`;
- `models/schema.yml`;
- every managed `models/**/*.sql` artifact produced by the Canvas plan.

The request carries the expected revision for every artifact, including unchanged
files, and marks only changed or absent artifacts as writes. The API sends all
expectations and writes to one `IWorkspaceFileBatchMutationPort.apply` call.
It returns the batch receipt on success or one typed conflict without performing
a partial client-side sequence.

The web publisher derives one deterministic idempotency key from the full
publication intent. It does not invoke the command when local preflight detects
an external revision conflict, and it refreshes the dbt projection only after
the server accepts the publication.

# Failure semantics

- Any revision conflict is detected before the first write.
- A failure while replacing a later artifact restores every original file.
- An equivalent retry replays the stored receipt rather than applying the writes
  again.
- The endpoint is `/workspace/dbt/graph-artifacts/publications`; the existing
  single-file editor route remains available for its separate use case.
- No Planning DB migration, generic browser batch endpoint, saga, second store,
  or command bus is introduced.

# Scope boundary

This change establishes atomic publication for one graph-authored dbt workspace
snapshot. Exact durable binding of a compiled or executed plan to a later project
revision remains follow-up work and is not assumed by this MVP.

# Verification history

The red test was first published at commit
`b37d441de28475497792afdf948988b2dd28698c` and failed in GitHub Actions run
`30465081343` because the web publisher still performed sequential file writes.
The implementation replaces that loop with the command boundary above. Current
CI results on the final PR head are the acceptance record.
