---
slice: GH-2892
date: 2026-09-03
last_reviewed: 2026-09-03
issue: 2892
author: Codex
---

# Closeout: GH-2892 — reposition and sort Canvas data columns

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/github-mvp-issue-workflow.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/frontend-command-query-rail-inventory.md`
- `docs/adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md`
- `docs/adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md`
- GitHub issues `#2417`, `#2770`, and `#2892`

The existing query is `PreviewWarehouseSourceObjectRows`; `ConfigureCanvasDvtNode` remains the
separate command authority for canonical Transform output order. Planning DB now returns
`reuse-existing-rail` for the sample query. Architecture design
`GH-2892-CANVAS-DATA-COLUMN-INTERACTIONS-20260903` governs the presentation change.

## Think-First analysis

- **Problem:** the Data panel rendered static column headers, so users could neither reposition
  columns nor sort the sample by a field.
- **Root cause:** `OperationalDrawerDataTable` mixed static table rendering into a broad primitive
  module and held no table presentation state.
- **Invariant:** sorting and positioning affect only the bounded sample projection. They never
  mutate the query result, canonical Canvas field order, `FieldId`, lineage, or node authoring.
- **Selected option:** use the already-installed TanStack Table state model with a small native
  drag and keyboard adapter in one focused component.
- **Rejected alternatives:** a second global store would create duplicate authority; changing
  `ConfigureCanvasDvtNode` would confuse sample presentation with authored Transform semantics;
  a bespoke sorting engine would duplicate an installed capability.
- **Fowler opportunity:** separate the table's reason for change from reusable drawer primitives
  and remove literal CSS tests rather than preserving both implementations.

## Work performed

- Extracted `OperationalDrawerDataTable` into a 197-line owned component and deleted the prior
  renderer and styles from `OperationalDrawerPanelPrimitives`; no compatibility copy remains.
- Header click cycles ascending, descending, and original row order. Sorting is stable, treats
  numeric text naturally, keeps nulls last, and does not mutate input rows.
- Dragging a header before or after another header moves its cells in the same operation and shows
  the insertion edge. `Alt+ArrowLeft` and `Alt+ArrowRight` provide the keyboard equivalent.
- Sorting direction is exposed through `aria-sort`; keyboard movement is exposed through
  `aria-keyshortcuts`; visible arrows communicate active direction.
- Local presentation state resets when a different source object sample is rendered.
- Removed inherited assertions that tested Tailwind class literals instead of table behavior.

## Validation evidence

| Evidence                                                                               | Result                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Focused test before implementation                                                     | FAIL — interactive component did not exist                   |
| Focused drawer and card-regression tests                                               | PASS — 22/22                                                 |
| `pnpm --filter @dvt/web test:changed`                                                  | PASS — 6/6                                                   |
| `pnpm --filter @dvt/web test:shell-session:run`                                        | PASS — 25 files, 114 tests                                   |
| `pnpm --filter @dvt/web typecheck`                                                     | PASS                                                         |
| `pnpm --filter @dvt/web lint`                                                          | PASS                                                         |
| Visible browser on `auth_audit_events`                                                 | PASS — asc/desc/reset, drag and keyboard; 0 console errors   |
| Local listeners                                                                        | PASS — one Web listener on 5173 and one API listener on 3000 |
| `pnpm docs:feature-mechanization -- --feature GH-2892-CANVAS-DATA-COLUMN-INTERACTIONS` | PASS                                                         |
| `pnpm governance:refresh` and `pnpm verify:prepush`                                    | PASS                                                         |

## Debt and stubs

No debt, stub, placeholder, fake adapter, new dependency, parallel command/query rail, disabled
rule, relaxed check, skipped hook, or hidden compatibility path was introduced. Contract, engine,
adapter, API, and canonical Canvas authoring surfaces were not changed, so ARC-2 is not triggered.
