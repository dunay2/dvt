---
title: Substrait structured field capability gate evidence
status: Accepted
date: 2026-09-03
owners:
  - contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitStandardCandidates.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitFieldBindingHierarchy.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts
  - packages/@dvt/contracts/test/dvt-substrait-struct-capability.contract.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm exec eslint packages/@dvt/contracts/src packages/@dvt/contracts/test --max-warnings 0
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# Substrait structured field capability gate evidence

## Scope

This prerequisite for issue #2771 admits the pinned core identities for
`substrait.Type kind.struct` and `substrait.Expression rex_type.nested`. It also
allows the existing authoring sidecar to retain a stable parent field identity
for ordered children. It does not expose the unfinished authoring interaction
or claim PostgreSQL projection support.

## Behavioral proof

The protobuf contract test round-trips a heterogeneous struct and preserves
child order and nullability without a private encoding. Admission tests require
the construction expression and structured type together and keep target and
visual postures unavailable.

Sidecar tests prove that sibling ordinals are scoped to their parent and reject
unknown parents, cross-relation parents, duplicate identities and ancestry
cycles. Existing root fields remain valid because `parentFieldId` is optional.

## Boundaries

The capability catalog remains the only support authority. The semantic
document remains the only persistence authority. No command, route, UI-only
tree, SQL convention, adapter or runtime operator was added.
