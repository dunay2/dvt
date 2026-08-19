---
title: DMF S01 - Keep, Modify, Move and Retire Matrix
status: Proposed
owner: Architecture / Contracts / Crypto / Domain Owners
baseline_commit: 2955d3c8c5400beff4f07c3b98369438b6140645
created: 2026-08-19
planning_type: convergence-disposition
related_issues:
  - 2185
  - 2186
  - 2187
  - 2189
  - 2191
  - 2487
  - 2489
related_prs:
  - 2484
  - 2539
---

# DMF S01 — Keep, Modify, Move and Retire Matrix

## Purpose

This document converts the S01 identity proposal into an explicit convergence decision:

- what remains because it owns real domain semantics;
- what remains but must call the shared primitive authority directly;
- what moves or is rewritten;
- what is duplicate, unused, unsafe or incorrectly located and must be retired;
- what is intentionally excluded because it is not the same identity problem.

The exhaustive repository-wide primitive/consumer inventory remains owned by [#2186](https://github.com/dunay2/dvt/issues/2186). This matrix is the source-grounded **DMF S01 disposition subset** and must not create another competing inventory.

Baseline inspected: [`main@2955d3c8c5400beff4f07c3b98369438b6140645`](https://github.com/dunay2/dvt/tree/2955d3c8c5400beff4f07c3b98369438b6140645).

## Executive decision

The convergence rule is:

> Keep domain identities and their versioned semantics. Keep one physical/public `@dvt/crypto` primitive authority. Remove duplicate implementations, wrappers, re-exports, obsolete aliases and unsafe randomness fallbacks after every active consumer has moved and compatibility has been proved.

This means that DVT does **not** remove every file or function that computes a digest. It removes duplicated algorithm mechanics while preserving domain-owned decisions such as:

- fields included in a preimage;
- ordering and framing;
- identity version;
- prefixes and truncation;
- shard conversion and modulo policy;
- validation/admission behavior;
- exact-byte versus semantic identity;
- persistence and compatibility lifecycle.

## Disposition vocabulary

| Disposition | Meaning |
|---|---|
| `KEEP` | Correct owner and responsibility. No semantic removal. |
| `KEEP_AND_MODIFY` | Preserve domain behavior, but replace local primitive calls/imports and tighten the boundary. |
| `MOVE_AND_REWRITE` | Preserve the capability, align its physical/public ownership and replace the current implementation. |
| `RETIRE_AFTER_MIGRATION` | Active duplicate/facade; delete only after all consumers move and output compatibility is proved. |
| `RETIRE_CONFIRMED_UNUSED` | No active source consumer has been found; remove in the migration cut after the zero-consumer scanner and build prove it. |
| `RETAIN_AS_EXCEPTION` | Similar vocabulary but intentionally outside shared crypto/DMF semantics. |
| `DEFER_TO_DOMAIN_OWNER` | A real domain identity whose compatibility or semantic redesign belongs to an existing bounded issue. |

## Target boundary

```text
@dvt/contracts
  owns schemas, wire contracts and semantic brands
            ↑
individual domains
  own versioned preimages, identity meaning and post-processing
            ↓
@dvt/crypto
  owns only shared primitive mechanics
```

Target primitive authority:

```text
packages/@dvt/crypto
package name: @dvt/crypto

UTF-8 / hex
RFC 8785 canonicalization
SHA-256 bytes / UTF-8 / streaming
MD5 bytes / UTF-8 — compatibility, non-security
secure random bytes
UUIDv4 / UUIDv7 mechanics
```

Forbidden final architecture:

```text
hash(value: unknown)
HashService shared by all domains
implicit JSON.stringify inside a digest helper
primitive re-exports through contracts/engine/artifacts/planner/verifier
another crypto or canonical package
forwarding @dvt/canonical alias
Node-only copied helpers in scripts/tools
per-runtime implementations with independent behavior
```

# 1. What stays

## 1.1 The `@dvt/crypto` package identity stays

| Current element | Disposition | Reason |
|---|---|---|
| Published/import name `@dvt/crypto` | `KEEP` | It is already actively consumed and is the accepted shared primitive boundary. |
| Leaf-package dependency direction | `KEEP` | Crypto must not depend on contracts, planner, engine, artifacts, adapters or applications. |
| Direct consumer imports | `KEEP` as final rule | Every package that uses a primitive declares and imports `@dvt/crypto` directly. |

The package concept stays. The current physical directory and implementation do not stay unchanged.

## 1.2 Existing domain identities stay distinct

These identities must not be collapsed into `InvocationDigestV1` or a generic digest type:

| Identity/domain | Disposition | What remains owned by the domain |
|---|---|---|
| Planner `inputHashSha256` | `KEEP` | Planner-input preimage, normalization, version and golden values. |
| Planner `planId` | `KEEP` | Canonical `PlanCore` preimage and plan identity compatibility. |
| Plugin compatibility fingerprint | `KEEP` | Admission/compatibility semantics; it is not a materialization key. |
| Artifact/blob SHA-256 | `KEEP` | Exact-byte integrity and content-addressed locator semantics. |
| Plan artifact SHA-256 | `KEEP` | Exact stored executable-plan byte binding. |
| Event/signal/start idempotency identities | `KEEP` | Versioned preimages, prefixes, logical-attempt rules and replay semantics. |
| Recovery identity | `KEEP` | Domain framing and intentional truncation remain explicit. |
| dbt content/source/analysis identities | `DEFER_TO_DOMAIN_OWNER` | #2171 owns complete semantic inputs and versioning. The primitive moves; the identity is not deleted. |
| Workspace/warehouse/governance fingerprints | `KEEP` or `DEFER_TO_DOMAIN_OWNER` | Preserve accepted preimages and outputs unless the owning domain versions them. |
| Delivery outbox shard assignment | `KEEP` | Tenant-affinity input, 16-hex truncation, signed-int64 conversion and modulo policy remain in delivery. |
| Git `repoSha` / `commitSha` | `RETAIN_AS_EXCEPTION` | These are Git object/provenance identities, not automatically SHA-256 contracts. |
| Run IDs and browser command IDs | `KEEP` | Domain prefix and allocation authority remain; only UUID/entropy mechanics move. |

## 1.3 Domain validation and policy stay

The following responsibilities remain even when their primitive imports change:

- contracts verifying canonical plan/build records;
- engine verifying exact plan bytes and metadata alignment;
- planner selecting and normalizing the plan/input preimage;
- artifact code binding descriptors to exact bytes;
- dbt code selecting the complete analysis/content preimage;
- delivery code assigning stable shards;
- Web/API code selecting command/run prefixes and injection seams;
- domain-specific errors and fail-closed behavior.

## 1.4 Domain tests stay

Retain tests that prove a business or compatibility contract, including:

- plan/input/PlanCore golden identities;
- stored-plan and artifact integrity;
- event/signal/start/recovery idempotency;
- dbt source/content/analysis revisions;
- workspace/warehouse/governance fingerprints;
- delivery shard assignments;
- run-ID and command-ID prefixes;
- tenant/scope/admission behavior.

A test does not become obsolete merely because it mentions SHA, JCS, MD5 or UUID.

# 2. What stays but must be modified

## 2.1 Planner hashing boundary

| Source | Current state | Final action | Reason |
|---|---|---|---|
| `packages/@dvt/planner/src/domain/hashing.ts` | Owns `json-canonicalize`, `TextEncoder`, WebCrypto SHA and hex conversion. | `KEEP_AND_MODIFY`: retain only planner-facing domain helper names if useful; route canonicalization/UTF-8/SHA through direct `@dvt/crypto`; remove private primitive code. | Planner owns plan preimages, not cryptographic mechanics. |
| `packages/@dvt/planner/package.json` | Direct dependency on `json-canonicalize`; no direct `@dvt/crypto`. | Remove planner's direct OSS canonicalizer dependency; add direct `@dvt/crypto`. | A single vetted JCS implementation must live behind the primitive authority. |
| `PlanAssembler` and planner golden tests | Consume `sha256CanonicalJson`. | Keep behavior and output vectors; migrate primitive only after byte-equivalence proof. | `planId` and planner input hashes are persisted/public domain identities. |

The external `json-canonicalize` library is a **candidate implementation inside `@dvt/crypto`**, not an approved planner-owned dependency. It stays only if the normative RFC 8785 and runtime-parity corpus passes.

## 2.2 Contracts executable validation

| Source | Current state | Final action | Reason |
|---|---|---|---|
| `packages/@dvt/contracts/src/schema-packs/planner-build.ts` | Imports local JCS and handwritten SHA utilities. | `KEEP_AND_MODIFY`: retain validation/refinement logic; import approved primitives directly from `@dvt/crypto`. | Contracts own schemas and executable validation, not algorithms. |
| `packages/@dvt/contracts/src/schema-packs/plan-records.ts` | Same local primitive dependency. | `KEEP_AND_MODIFY`: preserve canonical-record validation and domain messages; direct crypto import. | Removing validation would weaken persisted-plan safety. |
| Other contract refinements using local JCS/SHA | Active consumers. | Migrate directly and add `@dvt/crypto` as a declared dependency. | No primitive implementation or re-export remains in contracts. |
| `packages/@dvt/contracts/src/index.ts` | Re-exports primitive utilities. | Remove JCS/SHA primitive exports; retain schemas, brands and domain contracts. | Consumers must not receive crypto transitively from contracts. |
| `packages/@dvt/contracts/package.json` | Does not declare crypto. | Add direct dependency only while executable refinements invoke it. | Explicit dependency direction, no hidden implementation. |

Contract schemas that already represent SHA-256 remain. Tightening loose digest fields occurs only where compatibility fixtures and stored records are frozen.

## 2.3 Engine domain logic

| Source | Current state | Final action | Reason |
|---|---|---|---|
| `packages/@dvt/engine/src/core/idempotency.ts` | Domain preimages are explicit; SHA comes through local facade; UUID comes directly from Node. | `KEEP_AND_MODIFY`: preserve every preimage, version and normalization rule; import SHA/UUID mechanics directly from crypto. | The domain logic is valuable and not duplicate. |
| `packages/@dvt/engine/src/security/planIntegrity.ts` | Correct exact-byte and plan-identity validation; SHA via local facade; JCS already direct. | `KEEP_AND_MODIFY`: preserve integrity behavior/errors; use direct approved crypto primitives consistently. | Removing the validator would break the trust boundary. |
| Engine tests for idempotency and plan integrity | Domain tests. | Keep and replay frozen vectors. | They prove semantic compatibility, not primitive implementation. |

## 2.4 Artifact domain

| Source | Current state | Final action | Reason |
|---|---|---|---|
| Compiled-code attachment/readers | Use local `computeSha256`. | `KEEP_AND_MODIFY`: retain exact-byte descriptor and admission semantics; import byte/stream SHA directly from crypto. | Artifact identity remains exact-byte content addressing. |
| `S3ContentAddressedArtifactStore` | Uses the local artifact SHA helper for collision verification. | Preserve content-addressed storage, conditional publication and verification; replace only the primitive. | CAS behavior is not duplicated crypto behavior. |
| `packages/@dvt/artifacts/package.json` | No direct crypto dependency. | Add direct dependency after consumers migrate. | No transitive primitive through another package. |

## 2.5 dbt analysis identity

| Source | Current state | Final action | Reason |
|---|---|---|---|
| `apps/api/src/infrastructure/dbt/dbtAnalysisHash.ts` | Local `createHash`; local recursive `localeCompare` sort and `JSON.stringify`. | `KEEP_AND_MODIFY`, coordinated with #2171: preserve/replace the domain identity only after complete analysis inputs and a version are frozen; remove local primitive and local stable serializer. | It is both duplicate implementation and an incomplete semantic identity. Deleting the whole file before #2171 would lose domain behavior without solving completeness. |

The current digest must not become `InvocationDigestV1`. S06 later defines a complete `NativeAnalysisManifest` identity.

## 2.6 Delivery shard assignment

| Source | Current state | Final action | Reason |
|---|---|---|---|
| `packages/@dvt/delivery/src/outboxShardAssignment.ts` | Calls Node MD5 and performs tenant-affine shard conversion. | `KEEP_AND_MODIFY`: move only MD5 calculation to `@dvt/crypto`; retain input framing, first 16 hex, signed 64-bit conversion and modulo. | MD5 here is compatibility/partition policy, not an insecure artifact digest. |
| Delivery shard tests | Verify stable assignment. | Keep unchanged and require byte/output parity. | Changing shards can alter ordering/load distribution operationally. |

## 2.7 Run/browser identity allocation

| Source | Current state | Final action | Reason |
|---|---|---|---|
| `apps/api/src/entrypoints/http/startRunIdentity.ts` | Owns `run_` prefix plus handwritten UUIDv7/random bytes/formatting. | `KEEP_AND_MODIFY`: retain platform authority and `run_` prefix; replace UUID mechanics with `randomUuidV7()` from crypto. | Prefix/authority are domain semantics; UUID mechanics are duplicate. |
| `apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts` | Owns prefix API but manually constructs UUIDv4 from random bytes. | `KEEP_AND_MODIFY`: retain prefix helper and fail-closed behavior; call shared UUIDv4 primitive. | Avoid another browser UUID implementation. |
| `apps/web/src/app/services/projectOnboarding/projectOnboardingService.ts` | Correct service/injected factory; local UUID and insecure `Date.now()` fallback. | Keep service and injection seam; use shared browser idempotency helper/crypto; delete fallback. | Onboarding remains; unsafe entropy fallback does not. |
| `apps/web/src/app/views/canvas/previewGraphSignature.ts` | Domain graph normalization but imports JCS from contracts. | Preserve signature input semantics; import direct crypto and freeze/version output compatibility before changing bytes. | Contracts must not be a primitive facade. |

# 3. What moves and is rewritten

## 3.1 Physical package move

| Current | Target | Disposition |
|---|---|---|
| `packages/@dvt/canonical/**` | `packages/@dvt/crypto/**` | `MOVE_AND_REWRITE` |
| Package name `@dvt/crypto` | `@dvt/crypto` | `KEEP` |

The old physical directory does not remain as:

- forwarding workspace;
- deprecated package;
- symlink;
- TypeScript path alias;
- compatibility wrapper.

The existing `jcs.ts` and `sha256.ts` files are not simply copied. The target package is rebuilt around the accepted primitive API and central test corpus from #2187/#2189.

## 3.2 Active package/config references

Update in the move/migration cut:

- root `tsconfig.json` paths;
- package project references;
- package dependencies;
- CI scope/config manifests;
- active workflow policy references;
- current architecture/package maps;
- generated traceability outputs through their existing generators.

The current root aliases:

```json
"@dvt/crypto": ["./packages/@dvt/canonical/src/index.ts"],
"@dvt/canonical": ["./packages/@dvt/canonical/src/index.ts"]
```

converge to one target:

```json
"@dvt/crypto": ["./packages/@dvt/crypto/src/index.ts"]
```

The `@dvt/canonical` alias has no active source import in the current audit and must be removed, not deprecated.

## 3.3 Active documentation

`docs/architecture/shared/crypto.md` remains the canonical package document but must be rewritten to describe:

- the aligned physical/public name;
- the accepted primitive surface;
- supported runtime/export strategy;
- direct-import rule;
- domain-versus-primitive ownership;
- compatibility/version rule;
- no re-export/alias/tooling exception.

Historical files under `docs/archive/**` remain historical evidence and are not rewritten to pretend that the old topology never existed. Broken active links and generated references are updated.

# 4. What is duplicate and must be retired

## 4.1 Confirmed primitive implementations/facades

Delete **after** consumers migrate and compatibility vectors pass:

| Source | Classification | Reason for retirement | Migration owner |
|---|---|---|---|
| `packages/@dvt/contracts/src/utils/sha256HexUtf8.ts` | Duplicate handwritten SHA-256 + UTF-8 | Full algorithm implementation inside contracts; wrong ownership and maintenance risk. | #2191 |
| `packages/@dvt/contracts/src/utils/jcsCanonicalize.ts` | Duplicate handwritten JCS-like serializer | Near-copy, locale-sensitive sorting, wrong ownership. | #2191 |
| `packages/@dvt/artifacts/src/compiledCode/sha256.ts` | Duplicate Node SHA wrapper | Active but adds no artifact semantics; consumers can call byte SHA directly. | #2191 |
| `packages/@dvt/plan-verifier/src/crypto.ts` | Duplicate WebCrypto/UTF-8/hex layer | Primitive mechanics belong in shared crypto; verifier-specific error mapping stays at its boundary. | #2191 |
| `packages/@dvt/engine/src/utils/sha256.ts` | Convenience re-export/facade | Two active consumers can import crypto directly; final architecture forbids transitive facade. | #2191 |
| Private primitive portion of `packages/@dvt/planner/src/domain/hashing.ts` | Duplicate JCS/WebCrypto/hex mechanics | Planner keeps preimage/domain helper, not primitive implementation. | #2191 |
| Primitive/stable-serializer portion of `apps/api/src/infrastructure/dbt/dbtAnalysisHash.ts` | Duplicate SHA + local canonicalizer | Remove only after #2171 fixes the complete domain identity. | #2171 / #2191 |
| Direct Node MD5 call in `outboxShardAssignment.ts` | Duplicate primitive | Move algorithm call; retain all shard semantics. | #2191 |
| Handwritten UUIDv7 in `startRunIdentity.ts` | Duplicate UUID/entropy mechanics | Retain run prefix/authority only. | #2191 |
| Handwritten UUIDv4 in `createBrowserIdempotencyKey.ts` | Duplicate UUID mechanics | Retain prefix/fail-closed domain helper. | #2191 |
| Primitive re-exports from `@dvt/contracts` | Convenience re-export | Hides direct dependency and creates another public primitive surface. | #2191 |
| Planner direct `json-canonicalize` dependency | Duplicate dependency ownership | OSS implementation, if accepted, belongs behind `@dvt/crypto`. | #2189 / #2191 |

## 4.2 Confirmed unused or obsolete surfaces

| Source/config | Disposition | Evidence and safeguard |
|---|---|---|
| `packages/@dvt/engine/src/utils/jcs.ts` | `RETIRE_CONFIRMED_UNUSED` | It only re-exports `@dvt/crypto`; current source search and #2186 found no active source consumer. Delete after zero-consumer scanner/build confirms no dynamic/config dependency. |
| TypeScript alias `@dvt/canonical` | `RETIRE_CONFIRMED_UNUSED` | No active source import found; it preserves a misleading historical name. Remove with package move and scan configs/docs. |
| Old physical `packages/@dvt/canonical/**` | Retire after move | Public package name is already `@dvt/crypto`; retaining the path or alias preserves ambiguity. |
| Active docs describing engine re-exports/current mismatch as target design | Rewrite/remove obsolete statements | They document current debt, not the accepted end state. |

“Unused” here means no active source consumer was found at the fixed baseline. The actual deletion cut must still run the repository scanner, package build, typecheck, tests and generated-reference refresh before removal.

## 4.3 Active duplicate functionality, not dead code

The following must not be mislabeled as unused:

| Source | Current usage | Correct disposition |
|---|---|---|
| `apps/web/src/app/views/canvas/canvasDraftIdempotencyKey.ts` | Used by multiple canvas commands/lifecycle paths. | `RETIRE_AFTER_MIGRATION`: move callers to the shared browser idempotency helper, then delete the whole file. |
| `packages/@dvt/artifacts/src/compiledCode/sha256.ts` | Used by compiled-code/artifact readers and CAS paths. | `RETIRE_AFTER_MIGRATION`, not immediate deletion. |
| Planner `hashing.ts` | Used by `PlanAssembler`. | Retain domain API/preimage behavior; remove only primitive internals. |
| dbt `dbtAnalysisHash.ts` | Used by the native analyzer. | Retain until #2171 replaces it with a complete versioned analysis identity. |
| Engine SHA facade | Used by idempotency and plan integrity. | Migrate both consumers directly, then delete facade. |

This distinction prevents a cleanup PR from deleting active capability merely because an implementation is architecturally duplicate.

# 5. Unsafe behavior to remove

| Source | Behavior | Disposition | Reason |
|---|---|---|---|
| `canvasDraftIdempotencyKey.ts` | `Date.now()` + `Math.random()` fallback | Remove with file migration. | Not cryptographically strong and can produce collision-prone command identities. |
| `projectOnboardingService.ts` | `Date.now()` fallback when `randomUUID` is unavailable | Remove; fail closed through approved helper. | A protected idempotency boundary must not silently weaken identity quality. |
| Any manual UUID version/variant formatting outside crypto | Local mechanics | Remove after migration. | One implementation/test corpus is safer across runtimes. |
| Any raw secure entropy/UUID implementation outside crypto | Local mechanics | Remove unless an approved specialized exception exists. | Avoid inconsistent failure and format behavior. |

The domain prefix and injected deterministic factory remain. Only the unsafe/duplicate generation mechanics disappear.

# 6. Primitive-only tests to centralize and retire

Move unique vectors into `packages/@dvt/crypto/test/**`, prove parity, then delete:

- `packages/@dvt/contracts/test/sha256HexUtf8.test.ts`;
- `packages/@dvt/planner/test/compiledCode/sha256.test.ts`;
- `packages/@dvt/canonical/test/canonical.test.ts` as the mixed old-path primitive suite;
- any additional test whose sole purpose is the removed local primitive/facade.

Central primitive corpus must cover:

- SHA-256 empty/ASCII/Unicode/binary vectors;
- one-shot versus streaming equality;
- RFC 8785 ordering, Unicode, number and rejection vectors;
- MD5 standard and current outbox-input vectors;
- secure-random fail-closed behavior;
- UUIDv4/v7 version/variant and deterministic vectors;
- Node/browser/worker/tooling parity required by current consumers.

Keep domain tests in their packages even after they use shared crypto.

# 7. Intentionally retained exceptions

These are not duplicate shared primitives to remove indiscriminately:

| Surface | Disposition | Reason |
|---|---|---|
| `jose` for JOSE/JWT/key protocols | `RETAIN_AS_EXCEPTION` | Specialized mature protocol implementation; not replaced by generic crypto helpers. |
| Temporal deterministic workflow randomness | `RETAIN_AS_EXCEPTION` | Workflow replay determinism is a different contract from secure random identity allocation. |
| Non-security jitter/test deterministic RNG | `RETAIN_AS_EXCEPTION` when explicit | Not a secure identity primitive; keep clearly classified and injected. |
| Git OID parsing and `commitSha` vocabulary | `RETAIN_AS_EXCEPTION` | Algorithm/format is owned by Git/provider context. |
| Domain prefixes, truncation, signed conversion and modulo | `KEEP` | Business/compatibility post-processing, not cryptographic algorithm implementation. |
| Exact artifact/file streaming decisions | `KEEP` | Bounded-memory I/O and descriptor semantics remain in artifact/dbt domains; only the hasher comes from crypto. |

# 8. What must not be introduced

This convergence does not justify adding:

- a universal `IdentityService`;
- dependency-injected hash interfaces for pure deterministic primitives;
- a generic digest registry/database;
- automatic object serialization;
- CBOR, Protobuf or a custom DVT encoder for S01;
- BLAKE3 or another algorithm without a measured domain need;
- permanent dual writes or wrappers;
- `@dvt/canonical` compatibility package;
- a tooling-only crypto copy;
- global/cross-tenant materialization lookup;
- semantic equivalence between different domain identities.

# 9. Ordered retirement sequence

Deletion is sequenced to avoid breaking active consumers or silently changing identities:

```text
1. Freeze current public/persisted domain vectors
   - plan/input IDs
   - exact artifact/plan digests
   - idempotency/recovery values
   - dbt/content/governance representatives
   - outbox shard assignments
   - UUID/public-ID formats

2. Build packages/@dvt/crypto
   - one vetted implementation per primitive
   - central normative/runtime corpus
   - no domain preimages

3. Migrate consumers in bounded cuts
   - direct dependency/import
   - old/new byte comparison
   - preserve or explicitly version domain identity

4. Remove displaced implementation in the same cut
   - source helper/facade
   - barrel re-export
   - direct OSS/platform dependency
   - primitive-only local test

5. Move physical package and remove aliases
   - canonical -> crypto
   - no forwarding path/package

6. Refresh active docs/config/generated traceability

7. Run final scanner and repository verification
```

Do not merge an import-only migration that leaves the former helper callable. Do not delete an active helper before all callers and compatibility vectors are accounted for.

# 10. Per-file closeout requirements

Every retired source needs evidence containing:

1. exact old file and symbol;
2. all production/test consumers;
3. new direct import target;
4. old/new byte or format comparison;
5. domain preimage declared unchanged or explicitly versioned;
6. deleted export/path/dependency/test;
7. affected domain tests green;
8. scanner result proving no remaining active import/reference.

# 11. Final scanner/guard target

At completion of #2191, active code/config must satisfy:

```text
independent SHA-256 implementations outside @dvt/crypto = 0
independent MD5 implementations outside @dvt/crypto = 0
independent RFC 8785/JCS implementations outside @dvt/crypto = 0
manual UUIDv4/v7 mechanics outside @dvt/crypto = 0
raw secure entropy for identity allocation outside @dvt/crypto = 0
primitive re-exports/facades = 0
active imports of @dvt/canonical = 0
active path/config references to packages/@dvt/canonical = 0
unclassified active crypto/canonicalization occurrence = 0
```

Approved exceptions—Git OIDs, JOSE, Temporal deterministic RNG and explicit non-security jitter—must be classified rather than hidden from the scanner.

# 12. DMF S01 consequence

`MaterializationInvocationIdentityV1` is built only after the primitive convergence above is proven. It does not reuse or inherit any obsolete helper merely because the helper currently produces SHA-256 text.

The first S01 code implementation should therefore consume:

```text
@dvt/contracts
  -> strict versioned invocation identity schema/brands

materialization domain
  -> exact preimage builder and semantic profile

@dvt/crypto
  -> canonicalizeJson + sha256HexUtf8
```

It must not add another canonicalizer, SHA wrapper, re-export or compatibility alias.

## Decision summary

### Keep

- `@dvt/crypto` as the single primitive package name;
- every real domain identity and its owner;
- validation, exact-byte integrity, preimage and shard semantics;
- domain tests and frozen outputs;
- explicit specialized exceptions.

### Modify or move

- move the physical package to `packages/@dvt/crypto`;
- rebuild its primitive implementation and central corpus;
- migrate every consumer to a direct dependency/import;
- preserve/version domain outputs deliberately;
- update current config/docs/generated references.

### Retire

- duplicate SHA/JCS/MD5/UUID implementations;
- engine/contracts/artifact/planner/verifier primitive facades/re-exports;
- the unused engine JCS facade;
- the unused `@dvt/canonical` alias;
- unsafe timestamp/randomness identity fallbacks;
- primitive-only duplicate tests after vector centralization;
- the old physical `packages/@dvt/canonical` path;
- tooling-only copies and direct planner ownership of the JCS library.

This is the convergence boundary that #2189 and #2191 must implement. The PR itself remains documentation/discussion and does not claim that any source has already been removed.
