---
title: Plan admission hard-cut
status: Accepted
date: 2026-04-29
owners:
  - '@dvt/contracts'
  - '@dvt/engine'
  - '@dvt/plan-verifier'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlanAdmission.v1.ts
  - packages/@dvt/contracts/test/plan-admission-matrix.architecture.test.ts
  - packages/@dvt/engine/src/contracts/PlanAdmissionPolicy.ts
  - packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts
  - packages/@dvt/plan-verifier/src/planVersion.ts
  - packages/@dvt/plan-verifier/src/verify.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- plan-admission-matrix.contract.test.ts
    - pnpm --filter @dvt/contracts test -- plan-admission-matrix.architecture.test.ts
    - pnpm --filter @dvt/engine test -- WorkflowEngine.test.ts
    - pnpm --filter @dvt/plan-verifier test -- planVersionAdmission.architecture.test.ts planVersionAdmission.test.ts verify.test.ts
---

# Summary

This evidence records the ARC-2 proof for strict start-run admission over the
`ExecutionPlan` admission pair `(planVersion, schemaVersion)`.

# What changed

- Added an executable admission matrix in `@dvt/contracts`.
- Added an engine policy that fails closed when a `PlanRef` names an
  unsupported pair.
- Replaced the previous broad `v1.*` schema-prefix admission with matrix-backed
  admission.
- Added negative tests for `v1.future` on a supported `planVersion` and for
  no-dispatch behavior before provider execution.
- Added a semantic architecture fitness test that guarded, at the time of this report,
  the component guide, user stories, mailbox Fowler analysis, owned-concern
  docblocks, and retired naming drift.
- Removed the plan-verifier semver compatibility fallback and replaced it with
  explicit runtime admission.
- Removed the separate engine `PlanVersionPolicy` boundary and consolidated
  plan-version rejection in `PlanAdmissionPolicy`.

# Validation

Targeted contracts and engine tests prove that only the current pair
`(1.0, v1.2)` is accepted and that unsupported schema versions are rejected
before adapter dispatch. Plan-verifier tests prove adapter-side verification
uses admission instead of major/minor compatibility.

# Historical validation scope after PR #3413

The original commands and results above remain historical, not a claim about
current regression coverage. The [pre-retirement architecture test](https://github.com/dunay2/dvt/blob/d5d8755871b585ea40767e5f030cab644e6269bb/packages/@dvt/contracts/test/plan-admission-matrix.architecture.test.ts)
also required the mailbox analysis. PR #3413 retires that report-presence check.
The surviving test checks the component guide, user stories, owned-concern
headers, active admission surfaces, plan-version examples, retired naming and
the engine admission-policy boundary; it does not require the retired mailbox report.
This maintenance note does not reexecute the original commands or change the
recorded acceptance, contract, runtime result or open risk status.
