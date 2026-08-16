---
title: Issue 2401 dbt source config metadata closeout
status: Accepted
date: 2026-08-16
owners:
  - API
planning_type: closeout
---

# Issue 2401 dbt Source Config Metadata Closeout

## Summary

Issue #2401 corrects the existing `ImportWarehouseSources` dbt artifact
projection. Governed table identity is now emitted through dbt's canonical
`config.meta` extension rather than as a table-level `meta` sibling. Existing
legacy table metadata is normalized when that table is enriched; no parallel
DVT YAML dialect or compatibility branch was added.

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/adr/ADR-0058-warehouse-source-import-rails.md`
- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`
- `docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md`

## Cause And Real Work Performed

`buildGovernedSourceMetadata` placed `dvt_source_identity` in the generic table
metadata object's `meta` property. The deterministic serializer correctly
emitted that object verbatim, but the resulting table-level YAML shape was the
legacy dbt form.

The correction is limited to:

- `apps/api/src/application/services/warehouseSourceYamlMerge.ts`: merge
  existing table `meta` and `config.meta` into canonical `config.meta`, replace
  only the DVT-owned identity, preserve unrelated config and metadata, and omit
  empty config structures;
- `apps/api/test/application/services/warehouseSourceYaml.test.ts`: assert the
  exact canonical YAML, reject generated sibling `meta`, prove deterministic
  parse/serialize round-trip, normalize prior generated metadata, and cover a
  table without governed identity.

No DTO, schema, serializer, command, query, route, adapter, or migration was
added. `SourceYamlDocument`, `SourceYamlSource`, `SourceYamlTable`, and
`SourceYamlColumn` remain the single lossless document model.

## Other Metadata Surfaces Reviewed

- Source- and column-level metadata are generic lossless pass-through values;
  DVT does not generate `dvt_source_identity` at those levels.
- `dbtManifestProjection.ts` reads `resource.meta` from dbt's generated
  `manifest.json`; that is dbt's resolved manifest shape and is not legacy YAML
  generation.
- Repository analyzer fixtures use dbt manifest version `1.10.0`. No deliberate
  legacy dbt source-YAML output branch or supported-version switch was found.

## Validation Evidence

- Red cycle: `pnpm --filter dvt-api test -- warehouseSourceYaml.test.ts` failed
  exactly 3 new canonical-shape assertions while the other 11 tests passed.
- Green cycle: `pnpm --dir apps/api exec vitest run --config vitest.config.ts test/application/services/warehouseSourceYaml.test.ts`:
  PASS, 14 tests.
- `pnpm --filter dvt-api lint`: PASS.
- `pnpm --filter dvt-api typecheck`: PASS.
- `pnpm --filter dvt-api test`: PASS, 190 files and 1,032 tests; 2 files and 27
  infrastructure-gated tests retained their existing skip conditions.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`: PASS,
  ARC-0; no evidence or risk update required.
- `pnpm docs:feature-mechanization -- --feature E-SOURCE-IMPORT-COMMERCIAL`:
  PASS.
- `pnpm verify:prepush`: PASS, including global implementation mechanization,
  changed-file formatting, and lint.
- A real `dbt parse` was not run: this checkout has no `dbt` executable and no
  tracked `dbt_project.yml` integration fixture. No fake success was substituted.

## No-Debt And No-Stub Evidence

- No debt, legacy compatibility state, migration, TODO, FIXME, disabled rule,
  relaxed gate, or hook bypass was introduced.
- No stub, placeholder, fake adapter, fake parser result, or unfinished branch
  was added.
- Unrelated local favicon changes were neither staged nor modified.
