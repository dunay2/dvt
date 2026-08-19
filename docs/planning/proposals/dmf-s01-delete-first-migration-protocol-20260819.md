---
title: DMF S01 - Delete-first migration protocol
status: Proposed normative migration rule
owner: Architecture / Crypto / Domain owners
baseline_commit: 984e8b7d02644e2fd9f26341c4074208ec338522
created: 2026-08-19
planning_type: migration-policy
related_issues:
  - 2185
  - 2186
  - 2187
  - 2189
  - 2191
  - 2487
related_prs:
  - 2539
---

# DMF S01 — Delete-first migration protocol

## Decision

For every implementation that is being replaced, the migration cut follows this rule:

> Delete the old implementation, export, alias, path or fallback first in the implementation branch; run the repository checks to expose every broken consumer; then rebuild those consumers on the new authority in the same PR.

The final PR head must be green and mergeable. Broken intermediate commits may exist only inside the migration branch as an explicit discovery mechanism; broken code is never merged into `main`.

This protocol is normative for S01 and supersedes any earlier wording that implies keeping the old helper available while consumers migrate.

## Why delete first

Keeping the old source available during migration hides incomplete convergence:

- an unmodified consumer can continue compiling through the obsolete import;
- a transitive re-export can preserve an accidental dependency;
- tests may exercise the new path while production still calls the old path;
- a compatibility wrapper can become permanent;
- scanner results can report apparent convergence while the old mechanism remains callable;
- new code may imitate old behavior without confronting incompatible assumptions.

Delete-first turns the compiler, type checker, tests, build graph and repository scanner into the migration inventory.

```text
old implementation removed
        ↓
all real consumers fail visibly
        ↓
consumer-by-consumer reconstruction
        ↓
compatibility or explicit version decision
        ↓
zero obsolete references
```

## Safety boundary

Delete-first does not mean deleting public behavior without evidence.

Before removal, freeze the currently accepted domain contract:

- persisted/public digest or ID vectors;
- canonical preimage examples;
- prefixes, truncation and framing;
- error and fail-closed behavior;
- browser/Node/worker/tooling runtime expectations;
- database, artifact, idempotency and replay compatibility fixtures;
- known exceptions and intentionally unsupported inputs.

The old implementation is then removed. The frozen domain tests remain and become the acceptance oracle for the replacement.

Where the old implementation is known to be incorrect, tests must distinguish:

```text
legacy persisted values that remain readable
new corrected identity version for future writes
```

A corrected implementation must not silently change a persisted identity while keeping the same domain/version label.

## Mandatory migration sequence

### 0. Freeze the baseline

From a green `main`:

1. record the baseline SHA;
2. enumerate the source, export, path alias, package dependency and known consumers;
3. freeze representative public/persisted outputs;
4. classify the domain identity as byte-compatible migration or explicit version migration;
5. record commands that currently pass.

### 1. Delete the obsolete authority

Delete, as applicable:

- implementation file or migrating primitive section;
- barrel export and transitive re-export;
- TypeScript path alias;
- forwarding package or compatibility module;
- direct external dependency owned by the wrong package;
- insecure fallback;
- primitive-only local tests after their unique vectors are frozen centrally.

Do not add the replacement in the same edit before observing the breakage.

### 2. Run the red discovery pass

Run at least:

```text
repository scanner
typecheck
package builds
unit tests
contracts/determinism tests
relevant service-backed tests when resolution is runtime/config driven
```

Capture every failure as the authoritative consumer inventory for that cut.

Expected intermediate state:

```text
old symbol/path cannot resolve
all hidden and transitive consumers become visible
no fallback silently activates
```

An unexpected green result means one of:

- the source was actually unused;
- tests/build do not cover an active dynamic consumer;
- another duplicate implementation or alias is masking the deletion.

All three cases require investigation before adding the replacement.

### 3. Add the single new authority

Implement only the approved target boundary:

```text
packages/@dvt/crypto
  -> primitive mechanics

domain package
  -> preimage, identity version and semantic policy
```

No temporary wrapper, deprecated export, fallback implementation or dual authority is allowed.

### 4. Repair every broken consumer

For each red-discovery failure:

1. identify the domain owner;
2. declare a direct dependency on the new package;
3. import the primitive directly;
4. preserve the domain preimage and post-processing, or introduce an explicit domain version;
5. restore its domain tests;
6. remove obsolete package/dependency/config references in the same cut.

The migration is not complete while an old reference remains merely because the main test suite is green.

### 5. Prove compatibility or version the identity

For each public or persisted identity:

```text
old bytes/preimage/digest
versus
new bytes/preimage/digest
```

Then choose exactly one outcome:

- **byte-equivalent:** same identity version and exact outputs;
- **intentionally changed:** new domain identity version, migration/read policy and removal condition;
- **unused internal behavior:** delete without compatibility machinery, backed by zero-consumer proof.

No generic `sha256-v2`, global compatibility flag or permanent dual write is permitted.

### 6. Finish green and absent

Before merge:

```text
all required checks green
old source absent
old export absent
old alias/path absent
old dependency absent
old tests removed or converted to domain tests
repository scanner reports zero unclassified occurrences
```

The final diff must show replacement, not coexistence.

## What delete-first means per S01 migration

## Physical package move

When `packages/@dvt/canonical` moves to `packages/@dvt/crypto`:

1. remove the old path and `@dvt/canonical` alias in the branch;
2. run the red discovery pass;
3. create only `packages/@dvt/crypto`;
4. repair direct package/config imports;
5. do not add a forwarding workspace, symlink or deprecated alias.

The public package name `@dvt/crypto` remains; the obsolete physical and alias names disappear.

## Contracts SHA/JCS implementations

For:

```text
packages/@dvt/contracts/src/utils/sha256HexUtf8.ts
packages/@dvt/contracts/src/utils/jcsCanonicalize.ts
```

1. freeze contract validation and persisted-record vectors;
2. delete both implementations and their primitive exports;
3. compile contracts to reveal every real consumer;
4. add the direct `@dvt/crypto` dependency/imports;
5. preserve executable schema refinements and domain validation messages;
6. remove primitive-only contract tests after their vectors exist centrally.

Contracts remain the schema/validation owner, not a crypto facade.

## Engine facades

For:

```text
packages/@dvt/engine/src/utils/jcs.ts
packages/@dvt/engine/src/utils/sha256.ts
```

1. delete the facades first;
2. compile engine and all reverse dependencies;
3. import `@dvt/crypto` directly from each actual domain consumer;
4. keep idempotency and plan-integrity preimages, versions and errors in engine;
5. add no replacement engine facade.

If the JCS facade produces no failures, confirm and record it as genuinely unused before final deletion.

## Planner primitives

`packages/@dvt/planner/src/domain/hashing.ts` contains both domain-facing helper behavior and private primitive mechanics.

The cut must:

1. freeze `planId` and planner-input golden values;
2. remove the private JCS/TextEncoder/WebCrypto/hex implementation and planner-owned `json-canonicalize` dependency first;
3. run planner build/tests to expose every dependency;
4. retain or reconstruct only domain-facing helper functions over direct `@dvt/crypto` imports;
5. prove byte equality or explicitly version the affected planner identity.

The whole planner domain helper need not disappear when it still names a real planner responsibility; its duplicated primitive implementation must disappear.

## Artifact SHA helper

For `packages/@dvt/artifacts/src/compiledCode/sha256.ts`:

1. freeze artifact/CAS exact-byte vectors;
2. delete the helper first;
3. compile artifacts and reverse dependencies;
4. repair every consumer with direct byte/stream SHA imports;
5. retain descriptor, admission, bounded-I/O and collision semantics in artifacts;
6. add no replacement artifact SHA facade.

## Plan verifier helper

For `packages/@dvt/plan-verifier/src/crypto.ts`:

1. delete the local WebCrypto/UTF-8/hex layer;
2. expose all actual verifier consumers through compilation/tests;
3. import shared primitives directly;
4. keep verifier-specific error translation and policy local;
5. do not preserve a crypto forwarding module.

## dbt analysis hashing

The current dbt hash is active and semantically incomplete. Therefore delete-first begins only when the #2171 replacement cut is Ready.

In that cut:

1. freeze current accepted analysis/source-revision fixtures and identify legacy persisted values;
2. delete `dbtAnalysisHash.ts` before implementing the replacement;
3. run API/dbt tests to expose every consumer and hidden assumption;
4. implement the complete versioned native-analysis identity, not another local stable serializer;
5. migrate all consumers and explicitly handle any legacy read policy;
6. do not leave a compatibility wrapper under the old file/symbol.

Until that cut is ready, the file is classified as active debt, not removed independently in an unrelated PR.

## Delivery MD5

For outbox shard assignment:

1. freeze representative shard outputs;
2. remove the direct Node MD5 call first;
3. repair compilation using the shared MD5 primitive;
4. retain tenant input framing, 16-hex truncation, signed-int64 conversion and modulo in delivery;
5. require exact shard parity.

## UUID and random identity allocation

For API/Web manual UUID and fallback implementations:

1. freeze public prefix/format and injected-factory behavior;
2. delete manual UUID generation and `Date.now()` / `Math.random()` fallbacks first;
3. run browser/API tests to expose every allocation path;
4. use direct shared UUID/secure-random primitives behind the existing domain prefix helper;
5. fail closed when secure entropy is unavailable;
6. add no weak compatibility fallback.

## Canvas draft idempotency

`canvasDraftIdempotencyKey.ts` is active duplicate functionality, not dead code.

Its migration cut must:

1. freeze every canvas command prefix and relevant deterministic test fixture;
2. delete the entire helper file/export first;
3. run Web typecheck/tests to identify every canvas caller;
4. migrate each caller to the single browser idempotency authority;
5. preserve command-domain prefixes;
6. remove the local random/timestamp fallback permanently.

## Prohibited migration techniques

The following are rejected even temporarily at the final PR head:

- old function forwarding to new function;
- new function forwarding to old function;
- deprecated alias or package;
- barrel re-export retained “for compatibility”;
- dual implementation selected by feature flag;
- dual-write of old and new identities without a bounded migration decision;
- silent fallback to old behavior;
- copy of the old implementation under a new filename;
- catching import/runtime failure and generating a weaker identity;
- leaving obsolete code because tests do not currently execute it.

## Commit and PR structure

A migration PR may use this visible sequence:

```text
commit 1: freeze baseline vectors and inventory
commit 2: delete old implementation and expose failures
commit 3+: add new authority and repair consumers
final commit: remove residual references and refresh evidence
```

Squashing is optional. What matters is that review can see the deletion boundary and the final head is green.

Do not open a PR whose final state is deliberately red. Do not split deletion and repair into independently mergeable PRs when the first would break `main`.

## Definition of Ready for a delete-first cut

- [ ] Old implementation and all known exports/aliases/dependencies are named.
- [ ] Domain owner and compatibility class are fixed.
- [ ] Current public/persisted vectors are frozen.
- [ ] Required commands and service-backed tests are named.
- [ ] New primitive/domain boundary is approved.
- [ ] Legacy read/version policy is explicit when outputs change.
- [ ] The branch can complete deletion and repair in one PR.

## Definition of Done

- [ ] Old implementation was deleted before consumer repair in the branch history.
- [ ] Red discovery output was captured and reconciled against the inventory.
- [ ] Every surfaced consumer imports the new authority directly.
- [ ] No wrapper, alias, fallback, duplicate or transitive primitive export remains.
- [ ] Domain semantics and error behavior are preserved or explicitly versioned.
- [ ] Public/persisted output compatibility is proven.
- [ ] Final scanner reports zero obsolete/unclassified references.
- [ ] Final build, typecheck, tests and required service-backed checks are green.
- [ ] `main` is never left broken.

## Consequence for the current PR

PR #2539 remains a discussion and decision PR. It does not delete production code itself.

Acceptance changes the implementation rule for #2189, #2191, #2487 and later S01 cuts:

> The old mechanism is not kept alive to make migration comfortable. It is removed inside the branch so every dependency becomes visible, and the branch is completed against the single new authority before merge.
