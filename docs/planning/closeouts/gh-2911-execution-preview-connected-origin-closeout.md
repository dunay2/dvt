---
slice: GH-2911
date: 2026-09-04
last_reviewed: 2026-09-04
issue: 2911
author: Codex
---

# Closeout: GH-2911 — resolve connected origins for Execution Preview

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/github-mvp-issue-workflow.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/execution-model/dvt-execution-model.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-edge-execution-gate-plan-20260902.md`
- GitHub issue `#2911`

Planning DB identified the existing `PreviewExecutionPlan` command and
`ProjectSelectedExecutableSubgraph` query. The slice reuses those rails and adds
no parallel execution or graph-projection command.

## Think-First analysis

- **Problem:** Preview reported that a DBT model had no origin even though the
  Canvas displayed a connected incoming edge.
- **Root cause:** artifact and planner projections treated stale duplicated
  `dbt.selectedSourceId` metadata as stronger than the current canonical topology.
- **Invariant:** a matching explicit selection wins; otherwise exactly one
  compatible incoming edge is unambiguous. Zero inputs and unresolved multi-input
  ambiguity still fail closed.
- **Selected option:** extract one pure connected-origin policy and reuse it in
  authoring reconciliation, DBT artifact generation, and planner metadata.
- **Rejected alternatives:** mutating the draft as a hidden Preview prerequisite,
  retaining stale metadata as authority, or selecting the first edge by array order.

## Work performed

- Added `resolveDbtModelConnectedOrigin` as the shared DBT origin-selection policy.
- Reused it from `reconcileDbtModelConnectedOrigin` so the editing surface and
  execution path cannot apply different fallback rules.
- Updated DBT artifact projection so a sole visible Source or Model edge remains
  executable when duplicated selection metadata is stale.
- Updated the planner graph projection so `sourceRef` reports the same connected
  origin instead of forwarding a detached identifier.
- Added action-level coverage for `Source -> Model 1 -> Model 2`, with stale origin
  metadata on the selected terminal model, through publication and Preview request.

## Validation evidence

| Evidence                               | Result                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Focused test before implementation     | FAIL — 3 failures reproduced missing policy and `origin_required`                                    |
| Artifact/authoring/planner unit suites | PASS — 34/34                                                                                         |
| Preview action integration suite       | PASS — 4/4                                                                                           |
| `pnpm --filter @dvt/web typecheck`     | PASS                                                                                                 |
| `pnpm --filter @dvt/web lint`          | PASS                                                                                                 |
| Local Web listener                     | PASS — exactly one listener on `127.0.0.1:5173`, PID 38216                                           |
| Visible Chrome verification            | NOT RUN — browser control was stopped from the extension; application remains open for human testing |
| `pnpm governance:refresh`              | PASS — stable after two passes; 6,380/6,380 files governed                                           |
| Feature mechanization implementation   | PASS — 267 DB manifests                                                                              |
| `pnpm verify:prepush`                  | PASS — changed Web suites, architecture guard, formatting, lint, and forbidden-file checks           |

## Debt and stubs

No debt, stub, placeholder, fake adapter, new dependency, parallel command/query
rail, disabled rule, relaxed check, bypassed hook, or compatibility copy was added.
Contracts, engine, planner package, adapters, API, and database surfaces were not
changed, so ARC-2 is not triggered.
