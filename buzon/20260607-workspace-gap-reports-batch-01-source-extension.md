---
title: Workspace Gap Reports Batch 01 Source Extension
status: Draft
owner: Architecture / Workspace governance
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
extends: buzon/20260607-workspace-gap-reports-batch-01.md
---

# Workspace Gap Reports Batch 01 Source Extension

## Correction intent

This extension hardens the first batch report against actual repository source.
The original batch report was useful as a coarse inventory, but it was too broad
and under-evidenced. This extension makes its assumptions explicit and reconciles
it with package manifests, source entrypoints, and governed CI scope.

## Sources checked

- `pnpm-workspace.yaml`
- `tools/ci/scope-config.mjs`
- `tools/ci/policy/workflow-scope.json`
- root `package.json`
- app/package `package.json` files for API, Web, workers, core packages,
  adapters, CLI, artifacts, observability, traceability, and canonical/crypto
- representative `src/index.ts` or `src/server.ts` entrypoints for every major
  runtime group

## Source-backed corrections

### 1. Workspace count is not safe as a hardcoded number

The report must not assert an exact count unless it names the counting policy.
Source inspection shows an ambiguity:

- CI scope includes `cli` as a workspace entry.
- `crypto` is the logical package name, but its physical path is
  `packages/@dvt/canonical`.
- User expectation says 24, but a physical source inventory can list 25 rows if
  CLI is counted as a workspace and canonical/crypto is listed by package name
  and path.

**Correction**

The canonical next step is not to keep arguing over 24 vs 25. The repo needs a
workspace registry that defines:

- counted product workspace;
- counted tooling workspace;
- package name;
- physical path;
- CI key;
- validation commands;
- owner;
- public/private posture.

### 2. Workspaces must be classified by role

The first report treated all workspaces similarly. Source inspection shows at
least these different roles:

| Role                     | Workspaces                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Product UI               | `@dvt/web`                                                                                                  |
| API composition root     | `dvt-api`                                                                                                   |
| Worker composition roots | `dvt-temporal-worker`, `dvt-outbox-worker`, `dvt-projector-worker`, `dvt-lineage-worker`                    |
| Core domain/runtime      | `@dvt/engine`, `@dvt/planner`, `@dvt/run-domain`, `@dvt/dsl`, `@dvt/plan-verifier`, `@dvt/plan-interpreter` |
| Contracts/shared kernel  | `@dvt/contracts`, `@dvt/planner-contracts`                                                                  |
| Infrastructure adapters  | `@dvt/adapter-temporal`, `@dvt/adapter-postgres`, `@dvt/observability-otel`                                 |
| Cross-cutting            | `@dvt/artifacts`, `@dvt/observability`, `@dvt/traceability-service`, `@dvt/crypto`, `@dvt/cli`              |

### 3. Package scripts reveal readiness differences

Source manifests show different maturity patterns:

- Rich local suites: `@dvt/web`, `@dvt/adapter-temporal`, `dvt-api`,
  `@dvt/delivery`.
- Risk posture: packages using `--passWithNoTests`, especially
  `@dvt/plan-verifier` and `@dvt/state-store`.
- Tooling posture: `@dvt/cli` is not user-facing but is `private: false`.
- Scaffold posture: `@dvt/observability-otel` has source comments saying it is a
  scaffold/noop for real SDK binding.

### 4. Top priority is not equal coverage; it is vertical closure

The source check confirms the highest-value chain is:

```text
web -> api -> contracts -> dsl -> planner -> plan-verifier -> plan-interpreter -> engine -> adapters/workers -> state-store/artifacts/traceability
```

Therefore, the batch report should prioritize reports and implementation around
closing one real vertical flow rather than polishing every package equally.

## Revised batch conclusions

1. The previous report should be treated as superseded by
   `20260607-source-grounded-24-workspace-gap-reports.md` plus the deeper group
   reports.
2. The immediate engineering artifact should be a workspace registry, not another
   hand-maintained count.
3. The product-critical issue is the missing source-to-run proof.
4. Runtime correctness needs lifecycle/SLO/idempotency matrices.
5. Cross-cutting workspaces must be tied to generated documentation and planning
   DB, otherwise DB-first documentation will drift.

## Follow-up actions

- Create canonical workspace registry.
- Generate public surface matrices from `src/index.ts` barrels.
- Replace `--passWithNoTests` risk with explicit coverage declarations.
- Mark the original batch as a preliminary inventory, not a complete audit.
