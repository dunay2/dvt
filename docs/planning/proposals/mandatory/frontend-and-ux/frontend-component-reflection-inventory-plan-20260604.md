---
title: Frontend Component Reflection Inventory Current Contract
status: Accepted
owner: Web / Governance
last_reviewed: 2026-10-25
planning_type: mandatory-proposal
---

# Frontend component reflection inventory

The frontend-governance read model owns `ListFrontendComponentReflection`.
Source extraction is implemented by `scripts/planning-db/frontend-component-inventory.cjs`
and imported through the existing Planning DB import rail. Its tables and views
are declared in `tools/planning-db/schema.sql`; current architecture facts live
in Planning DB and are read through governed queries.

## Bounded reflection recovery

`ImportPlanningGovernanceQueryStore` also owns explicit recovery of this
reflection alone. An operator invokes the existing import rail with
`--scope frontend-components --expected-current-sha256 <imported-source-hash>`.
This mode is not called by inspection, documentation refresh or publication.
The default bootstrap/recovery import retains its existing behavior.

The candidate inventory must be the clean, tracked version at the current Git
HEAD. The receipt identifies that commit and the new source hash. Under the
existing import transaction lock, the expected hash must match the one existing
imported reflection source. Missing or mixed source identities, stale hashes,
unknown scopes and combining this scope with `--if-stale` are rejected.

Recovery reuses the existing extractor and reflection writer. Its complete
write set is `frontend_components`, `frontend_surface_component_links`,
`frontend_component_files`, `frontend_component_cq_rails` and
`frontend_component_evidence`. Local override tables, architecture and ownership
authority, mechanization, other imported projections and schema are preserved.
Invalid component/file/evidence references reject the recovery; transaction
failure rolls back all five tables. There is no fallback to a global import.

The Git reader owns candidate provenance; the pure validator owns identity,
reference and completeness invariants. The import coordinator owns admission,
the shared transaction and its receipt. Source reads and the existing snapshot
writer own SQL access. Coordinator tests exercise these boundaries with a
minimal candidate; adapter tests and real DB recovery prove materialization.

Physical component ownership remains separate from frontend reflection.
`ReadComponentFiles` resolves current Git paths against the DB ownership tree;
`ListFrontendComponentReflection` and the Canvas registry drift query inspect
the explicit frontend associations. A zero registry drift result does not
certify global architecture or semantic evidence completeness.

Validation is `node --test scripts/planning-db-frontend-component-inventory.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs`
and `pnpm verify:prepush`.
