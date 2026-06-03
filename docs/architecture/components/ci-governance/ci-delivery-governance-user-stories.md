---
title: CI Delivery Governance User Stories
status: Active
owner: Engineering / CI Governance
last_reviewed: 2026-05-23
---

# CI Delivery Governance User Stories

Owned concern: user-facing scenarios for the CI delivery governance component
and its mandatory-plan absorption state.

## Stories

### US-CDG-001 - Contributor Reproduces CI Tool Contracts Locally

As a contributor changing CI helpers, I want one local command for CI-tool
contract checks so that I can reproduce the merge gate before pushing.

Acceptance:

- `pnpm test:ci-tools` runs the semantic CI helper suite.
- The same command is invoked by the `CI tool contracts` lane.
- Failures identify the policy surface that drifted.

### US-CDG-002 - Reviewer Trusts The Required Workflow Gate

As a reviewer, I want workflow parity tests to prove the CI-tool lane remains
wired so that review does not depend on visually inspecting YAML.

Acceptance:

- `workflow-pattern-parity.test.mjs` asserts `run: pnpm test:ci-tools`.
- The test also asserts shared scope emitters remain wired into CI.
- Removing the lane fails local and CI validation.

### US-CDG-003 - Planner Avoids Reopening Absorbed Work

As a planning agent, I want the mandatory CI delivery plan to label absorbed
items so that I do not create duplicate next tasks for shipped gates.

Acceptance:

- `CDG-W4-1` is marked `Absorbed`.
- The plan points to the component doc and semantic guard.
- Residual items remain explicit instead of hidden.

### US-CDG-004 - Operator Finds The Current Component Boundary

As a CI operator, I want a local component guide with API, invariants,
transitions, and consumers so that I can reason about delivery-governance
changes without scanning workflows first.

Acceptance:

- The component doc includes a public API table.
- Invariants separate workflow gates, scope policy, generated-doc ownership,
  and planning posture.
- Mermaid diagrams explain state and CI flow.

### US-CDG-005 - Architecture Guard Prevents Plan Drift

As an architecture reviewer, I want a semantic guard over the canon so that
documentation cannot drift back to open-work language for absorbed gates.

Acceptance:

- `ci-delivery-governance-canon.test.mjs` checks component guide structure.
- The same test checks user stories and Fowler analysis.
- The same test checks the mandatory proposal declares the current canon.
