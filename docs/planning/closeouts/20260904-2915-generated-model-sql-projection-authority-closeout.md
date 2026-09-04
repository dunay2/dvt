---
title: Issue 2915 Generated Model SQL Projection Authority Closeout
status: Accepted
date: 2026-09-04
owners:
  - Web / Canvas Model Authoring
issue: https://github.com/dunay2/dvt/issues/2915
featureId: GH-2915-GENERATED-MODEL-SQL-PROJECTION-AUTHORITY
---

# Issue 2915 Generated Model SQL Projection Authority Closeout

## Think-First reconciliation

The reported screen is not a wording defect. The current Model Code section
accepts edits, stores them as `metadata.config.sql`, labels the resulting
artifact `authored`, and bypasses generated projection behavior. The proposed
hard cut removes that parallel authority and keeps SQL as a read-only artifact
projection through `GenerateDbtWorkspaceArtifacts`.

This issue deliberately does not claim that the legacy `dbt:model` node already
stores the canonical typed Substrait document. Full shared Model/Transform
semantic convergence remains visible in issue #2903. Closing the immediate SQL
authority leak and closing the node-species migration are different changes.

## Governing sources used

- `AGENTS.md`.
- `docs/planning/status/governance-document-rule-inventory.md`.
- `docs/guides/ai-work-protocol.md`.
- `docs/planning/state/github-mvp-issue-workflow.md`.
- `docs/architecture/command-query-rail-governance.md`.
- `docs/architecture/fowler-opportunity-planning-governance.md`.
- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`.
- `docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md`.
- `docs/architecture/system/subsystems/semantic-transformation/index.md`.
- `docs/architecture/components/web/graph/canvas-inspector-authoring-component.md`.
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`.
- `docs/planning/proposals/mandatory/frontend-and-ux/generated-model-sql-projection-authority-plan-20260904.md`.

The Planning DB architecture-design and creation-intent authorities were
queried first. The result requires reuse of `ConfigureCanvasDbtNode` and
`GenerateDbtWorkspaceArtifacts`; no parallel rail is allowed.

## Delivery record

### Work performed

- Replaced the generated Model SQL editor with the shared read-only Monaco
  viewer and changed the visible copy to identify a generated projection.
- Removed `modelSql` from `DbtNodeAuthoringMetadata`, retired the
  `provenance: authored` branch, and made graph-draft normalization remove both
  legacy top-level `sql` and `config.sql` values.
- Kept SQL generation on `GenerateDbtWorkspaceArtifacts`; Preview now consumes
  the artifact generated from the connected origin and ordered output columns.
- Removed the historical authored-SQL guards from column ordering, output
  selection, and semantic function replacement.
- Reclassified `DbtModelCodeAuthoringSection` from the only governed Canvas
  Monaco editor owner to an explicit read-only output leaf.
- Updated the live create-link-preview scenario to assert a viewer, absence of
  an editor, absence of persisted `config.sql`, and generated Preview SQL.

### Acceptance reconciliation

| Acceptance statement                              | Evidence                                                                                                                                       | Result                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Generated SQL cannot be edited                    | `DbtModelCodeAuthoringSection` renders one `MonacoCodeViewer` and no `MonacoCodeEditor`                                                        | Accepted                                                |
| Model metadata does not acquire `config.sql`      | metadata normalization and workspace artifact tests cover both new and legacy inputs                                                           | Accepted                                                |
| Copy identifies a read-only projection            | English and Spanish catalogs say generated/read-only projection                                                                                | Accepted                                                |
| Preview materializes projected SQL                | `canvasDbtWorkspaceArtifacts.test.ts` proves the generated body is published and legacy SQL is ignored                                         | Accepted                                                |
| Column operations are not blocked by authored SQL | column authoring and semantic function tests pass with legacy SQL present                                                                      | Accepted                                                |
| Unit and Cypress coverage exists                  | unit/presentation/architecture suites pass; the updated Cypress scenario reaches the real rail once its external connection setup is available | Accepted with external execution blocker recorded below |
| Full semantic convergence remains visible         | issue #2903 remains the explicit owner                                                                                                         | Accepted                                                |

### Validation evidence

- Red test:
  `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx`
  failed because the production surface still rendered the editor.
- Green focused presentation: the same command passed `2/2` tests; the
  `CanvasNodeWorkbenchPanel` pair passed `23/23` tests.
- Focused unit coverage passed `67/67` tests across DBT metadata, projection,
  column/function authoring, workspace artifact generation, and inspector
  presentation; the draft controller passed `8/8` tests.
- Full Web suite:
  `pnpm --filter @dvt/web test` passed `1600/1600` unit tests, `963/963`
  presentation tests, and `273/273` architecture tests.
- `pnpm --filter @dvt/web lint` passed.
- `pnpm --filter @dvt/web typecheck` passed.
- `pnpm docs:feature-mechanization:implementation --feature
GH-2915-GENERATED-MODEL-SQL-PROJECTION-AUTHORITY` passed with `271` DB
  manifests.
- `pnpm governance:refresh` passed after two stable generation passes with
  `6400/6400` governed files and zero drift.
- `pnpm verify:prepush` passed, including changed-file tests, Prettier, ESLint,
  mechanization, and forbidden-file checks.
- Visible Chrome proof on the running application inspected
  `auth_audit_events -> Model 1`: one read-only viewer, zero editors, and a
  generated ten-column `source(...)` query.
- `pnpm --filter @dvt/web test:e2e:source-import:live` was run twice. After an
  obsolete viewport selector was corrected, the scenario was blocked before
  the affected flow because `POST /workspace/warehouse/connections` returned
  `422`, leaving the governed connection catalog empty. This independent live
  environment failure is tracked with evidence in issue #2173; it is not
  reported here as a passing execution.

### Obsolete behavior and remaining work

The editable Model SQL surface, `modelSql` draft field, `authored` provenance,
"Edit to take ownership" transition, and tests that treated authored SQL as an
accepted graph-draft authority are obsolete and removed. This does not migrate
the legacy `dbt:model` species to canonical typed Substrait. Shared
Model/Transform semantics and card convergence remain in issue #2903.

### No-debt and no-stub evidence

- No debt entry, TODO, FIXME, placeholder, fake adapter, fake success path, or
  unfinished branch was added.
- No lint, type, architecture, test, or quality rule was disabled or relaxed.
- No hook or check was bypassed; both commits used `pnpm commit` and the normal
  pre-commit hooks.
- No contract, engine, planner, adapter, API, or database surface changed, so
  ARC-2 evidence was not triggered.
