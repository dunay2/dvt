# ADR-030 Artifact Store Content Addressing

Status: Superseded by ADR-0032
Date: 2026-03-06
Last Updated: 2026-03-06 — aligned to codebase audit
Completeness: ~35%

---

## Supersession Notice

> **This ADR has been partially superseded by [ADR-0032 — compiledCodeRef Ownership](../../../../../adr/ADR-0032-compiled-code-ref-ownership.md).**
>
> ADR-0032 is the accepted, implemented decision governing content-addressed storage of compiled artifacts in DVT+. ADR-030 covers the broader artifact store concept which is still pending full implementation.

---

## Context

Artifacts such as dbt manifests, ExecutionPlan bundles, and compiled SQL must be stored immutably and referenced across system components. Mutable artifact references create non-determinism in workflow execution and break auditability.

Two storage concerns exist:

1. **Plan artifacts** (ExecutionPlanV2 bundles) — written by Planner, referenced by Engine via `PlanRef`
2. **Step artifacts** (compiled SQL per model) — written during plan enrichment, referenced via `CompiledCodeRef` in `StepStarted.payload`

---

## Decision

Use content-addressed storage based on SHA-256 hashes for all artifact types.

### Implemented (via ADR-0032)

Artifact identity for compiled code and plan artifacts:

```
<scheme>://<location>/<sha256>
```

Examples:

- `s3://dvt-artifacts/ab2399f7c3...`
- `gs://dvt-artifacts/ab2399f7c3...`
- `file:///tmp/artifacts/ab2399f7c3...` (dev/test only)
- `mem://ab2399f7c3...` (in-memory test adapter)

SHA-256 is computed using `computeSha256(content: Buffer): string` in `@dvt/planner/src/compiledCode/sha256.ts`.

Plan ID is computed using `sha256CanonicalJson(planCore)` via RFC 8785 JCS canonicalization in `@dvt/planner/src/domain/hashing.ts`.

### Specified (not yet implemented)

Canonical artifact URI scheme with tenant and type scope:

```
artifact://{tenantId}/{artifactType}/{sha256}
```

Example:

```
artifact://tenantA/dbt-manifest/ab2399f...
artifact://tenantA/compiled-sql/ef1234a...
```

This canonical scheme is **not enforced** by any current adapter. Normalization layer is pending.

---

## Current Implementation State

### What exists in code

| Component                                      | File                                                          | Status                           |
| ---------------------------------------------- | ------------------------------------------------------------- | -------------------------------- |
| `ICompiledCodeStorage` port                    | `packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts`     | ✅ Implemented (write-only)      |
| `S3CompiledCodeStorage`                        | `packages/@dvt/planner/src/compiledCode/adapters/S3...`       | ✅                               |
| `MinioCompiledCodeStorage`                     | `packages/@dvt/planner/src/compiledCode/adapters/Minio...`    | ✅                               |
| `FileSystemCompiledCodeStorage`                | `packages/@dvt/planner/src/compiledCode/adapters/FS...`       | ✅ (dev only)                    |
| `InMemoryCompiledCodeStorage`                  | `packages/@dvt/planner/src/compiledCode/adapters/InMemory...` | ✅ (test only)                   |
| `NoopCompiledCodeStorage`                      | `packages/@dvt/planner/src/compiledCode/adapters/Noop...`     | ✅                               |
| `computeSha256`                                | `packages/@dvt/planner/src/compiledCode/sha256.ts`            | ✅                               |
| `sha256CanonicalJson` (RFC 8785)               | `packages/@dvt/planner/src/domain/hashing.ts`                 | ✅                               |
| `@dvt/canonical` (sha256Hex + jcsCanonicalize) | `packages/@dvt/canonical/src/`                                | ✅                               |
| `IArtifactStore` formal port                   | —                                                             | ❌ Not created                   |
| Tenant-scoped upload                           | —                                                             | ❌ No tenantId in port signature |
| Retrieval / read method                        | —                                                             | ❌ Write-only port               |
| Canonical `artifact://` URI                    | —                                                             | ❌ Not enforced                  |

### What this ADR is missing

1. **Tenant isolation decision** — who enforces tenantId at the artifact boundary?
2. **Backend selection rationale** — S3 vs. MinIO vs. GCS (de facto S3/MinIO, no ADR)
3. **Retention policy** — no decision on TTL, archival, or deletion safety
4. **Read path** — `ICompiledCodeStorage` is write-only; no formal `get()` decision
5. **URI normalization** — no decision on canonical `artifact://` enforcement

---

## Invariants (as implemented — ADR-0032)

INV-CCREF-001 — `sha256` MUST be the SHA-256 hex digest of the blob at `storageUri`.

INV-CCREF-006 — Event log stores ONLY reference (`sha256 + storageUri`), never SQL text.

INV-CCREF-007 — `file://` URIs are prohibited in `NODE_ENV=production`.

INV-CCREF-008 — Upload MUST be idempotent: same sha256 uploaded twice MUST NOT throw.

---

## Consequences

### Positive

- Deterministic references — same content always produces same sha256 key
- Deduplication — upload is idempotent; no double storage
- Cache-friendly — sha256 is a stable cache key
- Auditability — event log references are immutable and verifiable

### Negative

- Artifact deletion policies must consider shared references across tenants and runs
- Multi-tenant safety requires tenant prefix or per-tenant bucket — not yet enforced
- Write-only port means callers cannot verify artifact existence without a separate mechanism

---

## Pending ADRs Required for Full Closure

| ADR            | Title                                                             | Priority |
| -------------- | ----------------------------------------------------------------- | -------- |
| New            | IArtifactStore formal hexagonal port                              | P0       |
| New            | Artifact Retention Strategy (TTL, archival, deletion safety)      | P1       |
| New            | Artifact Store Backend Selection (S3/MinIO/GCS decision criteria) | P2       |
| Update ADR-030 | Canonical URI scheme enforcement (`artifact://`)                  | P2       |
