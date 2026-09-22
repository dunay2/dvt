---
title: AI CI Preflight Automation Current Contract
status: Accepted
owner: CI / Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
---

# AI CI preflight automation

CI governance owns the preflight workflow and its verified
`EmitWorkflowCapabilityScopes` rail. Planning DB readiness is provided by the
existing current-schema import/check rail; there is no second preparation
command.

Workflow behavior lives in `.github/workflows`, `package.json`, and `scripts`.
Current rail evidence is read directly from Planning DB through governed queries.
Validation is `node --test scripts/governance-refresh.test.cjs scripts/pr-closeout.test.cjs`,
the changed workflow checks, and `pnpm verify:prepush`.
