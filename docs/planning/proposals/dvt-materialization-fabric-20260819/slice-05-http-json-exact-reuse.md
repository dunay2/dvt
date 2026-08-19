---
title: S05 - Exact HTTP JSON artifact reuse
status: GO as first production vertical after S01-S04 and S11 outcome contract
owner: HTTP JSON Plugin / Artifacts / Engine / Reliability
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2499, 2500, 2501]
---

# S05 — Exact HTTP JSON artifact reuse

## Decision

**GO as the first bounded production vertical**, but implementation is sequenced after S01–S04 and the S11 reused-outcome contract.

The reason is unusually strong: the current HTTP JSON step already receives a trusted expected SHA-256, byte size and media type, validates the acquired bytes and publishes them to tenant-scoped CAS. DVT can therefore prove an exact hit without inventing HTTP freshness semantics, semantic SQL equivalence or external table snapshots.

The first hit rule is deliberately strict:

> Reuse only a fully verified result bound to the same exact invocation and expected content descriptor. URL, ETag, `Last-Modified`, endpoint name and prior success are not sufficient.

## Need

Today an execution may repeat the network request even when the exact expected artifact has already been acquired, validated and stored. This wastes:

- endpoint latency and egress;
- worker time and response-byte processing;
- retries against unavailable or rate-limited sources;
- duplicate acquisition under concurrent runs.

This slice proves the complete Materialization Fabric on the safest available domain:

```text
trusted expected descriptor
  -> exact invocation lookup
  -> independent output verification
  -> zero-network reuse
```

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

`packages/@dvt/temporal-http-json-plugin/src/HttpJsonArtifactPluginRunner.ts` already enforces:

- expected HTTP status;
- redirect limits;
- expected media type;
- exact byte size;
- expected SHA-256;
- JSON or JSONL syntax validation;
- publication to the existing content-addressed artifact store.

`httpJsonArtifactPluginTypes.ts` narrows the store to `Pick<IContentAddressedArtifactStore, 'publish'>`. The plugin therefore cannot perform a pre-network exact verification.

Current `ArtifactAcquisitionEvidence` can report `created` or `verified-existing`, but both outcomes occur after acquisition/publication. It does not mean that the HTTP request was avoided.

This is a genuine small vertical: the source already supplies exact content evidence; the missing seam is lookup/verify/reuse before `acquire()`.

## Architectural fit

```text
HttpJsonArtifactPluginRunner
  -> build trusted-artifact InvocationDigest
  -> materialization lookup/verifier
       ├── verified hit -> return existing artifact + reused evidence
       └── miss/reject -> current acquire/validate/publish path
                           -> lease/fence/publication/index confirm
```

The existing runner remains the execution authority. No parallel HTTP cache, proxy or alternate plugin is introduced.

## Open-source convergence

### Reuse

- existing DVT HTTP acquisition and JSON/JSONL validation;
- existing S3 CAS conditional publication;
- S01–S04 Materialization Fabric contracts/protocols;
- standard HTTP client behavior and Temporal cancellation/retry boundaries.

### Explicitly reject for the first vertical

- generic RFC HTTP caching;
- weak/strong ETag interpretation as content identity;
- `Last-Modified` or TTL freshness heuristics;
- caching arbitrary responses without a trusted expected digest;
- caching error responses;
- a reverse proxy or CDN as the semantic authority.

Conditional HTTP revalidation may later reduce transfer for resources without known content digests, but it is not exact result reuse and must have a separate profile/evidence model.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| Semantic identity | Low–Medium | Trusted expected descriptor and runtime/profile must be complete. |
| Plugin integration | Medium | Preserve current security/cancellation/fallback behavior. |
| Publication/concurrency | High | Depends on S02–S04 fault-safe protocol. |
| Security | High | URI/credential redaction and cross-scope hit disclosure. |
| Verification | Medium | Exact bytes are already testable. |
| Product value | High potential | Network calls and bytes are directly measurable. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| Expected SHA/size/media | Step config/runner | Invocation/profile identity provider. |
| HTTP validation | Runner | Pre-acquisition exact lookup and verifier. |
| CAS publication | Existing artifact store | Explicit read/verify and result manifest. |
| Acquisition evidence | Created/verified-existing | Canonical `REUSED` completion evidence. |
| Temporal execution | Existing plugin | Lease/fence integration on cold miss. |
| Tests | HTTP validation/plugin suites | Zero-call hit, concurrency, fault and scope corpus. |

## Task decomposition

1. [#2499](https://github.com/dunay2/dvt/issues/2499) performs exact verified lookup before network acquisition.
2. [#2500](https://github.com/dunay2/dvt/issues/2500) integrates cold production with lease, manifest and fenced confirmation.
3. [#2501](https://github.com/dunay2/dvt/issues/2501) proves output equivalence, zero-network hits, fallback and measured value end to end.

## Exact execution paths

### Warm verified hit

```text
build exact InvocationDigest
  -> scoped index lookup
  -> authorize before disclosure
  -> verify ResultManifest and artifact bytes
  -> acquire active-run reference/pin
  -> emit successful reused outcome
  -> return same downstream artifact descriptor
  -> HTTP acquire calls = 0
```

### Miss or rejected candidate

```text
lookup miss/rejection/index unavailable
  -> acquire scoped lease/fence when available
  -> recheck after lease
  -> execute unchanged HTTP acquisition validation
  -> publish artifact and ResultManifest
  -> independently verify
  -> confirm index only with current fence
  -> emit executed/published outcome
```

If opportunistic index/lease infrastructure is unavailable, the runner keeps its normal acquisition capability and does not claim a reusable result.

## Verification corpus

Required cases:

- JSON and JSONL cold miss then warm hit;
- same URL with changed expected digest/size/media type;
- endpoint unavailable while a valid warm materialization exists;
- existing artifact without eligible manifest;
- missing/corrupt/quarantined/expired output;
- wrong tenant/trust scope;
- index, S3, verifier and lease outages;
- cancellation while waiting and during acquisition;
- simultaneous cold invocations;
- crash after artifact upload, manifest upload, verification and index confirmation;
- stale producer after lease takeover;
- redirects, malformed JSON/JSONL, oversize body and credential handling remain unchanged.

Release gates:

```text
warm exact hit HTTP calls = 0
warm exact hit response bytes = 0
false-safe hit = 0
cross-scope hit/disclosure = 0
100 cold concurrent invocations -> 1 confirmed producer result
full vs reused downstream artifact divergence = 0
```

Measure total latency, HTTP calls/bytes, hash verification CPU, CAS/index operations and rejection reasons. Value is accepted only when the predeclared #2152 threshold is met for representative payloads.

## Stop and narrow conditions

Stop or narrow when:

- the endpoint contract cannot supply a trusted expected digest;
- verifying the stored artifact costs as much as reacquiring it for target payloads and the source is cheap/reliable;
- fallback alters current HTTP security or failure semantics;
- any false hit, stale digest acceptance or cross-scope disclosure occurs;
- the implementation begins acting as a generic HTTP cache.

## Gate result

```text
gateDecision: go
gateScope: first-exact-production-vertical
authorizedImplementation: false
blocksOn:
  - S01-S04 complete
  - S11 reused outcome contract
firstVertical: true
```
