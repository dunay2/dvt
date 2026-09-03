---
title: VTX2 standard-first capability admission evidence
status: Accepted
date: 2026-09-03
owners:
  - contracts
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityAdmission.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalogSchema.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - packages/@dvt/contracts/test/dvt-substrait-capability-admission.contract.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm exec eslint packages/@dvt/contracts/src packages/@dvt/contracts/test --max-warnings 0
    - pnpm docs:feature-mechanization:implementation -- --feature VTX2-STANDARD-FIRST-CAPABILITY-ADMISSION-2641
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# VTX2 standard-first capability admission evidence

## Scope

Issue #2641 mechanizes the admission sequence over the existing
`DvtSubstraitCapabilityCatalogV1` read model. A supported standard capability now
retains typed use-case, exact identity, fixture, positive/negative validation, stable
identity, target-conformance, and visual-posture evidence. No new command, query,
registry, runtime operator, provider claim, or UI catalog was introduced.

## Behavioral proof

Contract tests prove that supported status rejects incomplete admission evidence,
semantic admission does not imply provider-native acceptance, and a bounded DVT
extension proposal rejects when its reviewed alternatives contain an existing standard
identity. The extension gate also rejects missing upstream-gap evidence.

The existing `lower` scalar-function capability is the end-to-end admitted example. It
retains the official Substrait function identity, canonical evidence, mapped target
posture, visual evidence, and stable DVT identity proof without claiming provider-native
acceptance.

## Structure and compatibility

The previous 703-line multi-reason catalog was split into identity, schema, standard
candidate, admission, product-need, and composition modules. Every affected production
and test module remains below 200 lines. The public `@dvt/contracts/substrait` surface
and deterministic catalog serialization remain compatible; candidate capabilities and
product gaps keep their prior semantic states.
