-- Close integrity findings exposed by production-only command/query evidence.
-- Keep executable rails active, retire prose-only aliases, and restore one
-- canonical owner for the scoped workspace file repository implementation.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'WORKSPACE-CAS-INTEGRITY-AND-RAIL-RECONCILIATION-20260711',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'Workspace CAS integrity and rail reconciliation',
  'Architecture / Planning DB',
  'implemented',
  'Production-only implementation evidence exposed historical documentation aliases and incomplete component maturity records. The canonical catalog must retain only executable rails and one owner per implementation path.',
  'hidden_authority',
  'ValidateRailVocabulary;CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

-- The child component owns LocalWorkspaceFileRepository.ts. The remaining
-- local-adapter aggregate keeps a unique directory boundary instead of
-- claiming the child's concrete implementation file.
update architecture.component
set repo_path = 'apps/api/src/infrastructure/workspaceDiffChanges'
where component_id = 'SYS-API-INFRA-WORKSPACE-LOCAL-ADAPTERS';

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values
  (
    'OBS-WAREHOUSE-SOURCE-OBJECT-READER-RESULT',
    'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
    'Provider discovery failures and metric-evidence posture are exposed through typed source-object results and protected HTTP error translation.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-WORKSPACE-FILE-MUTATION-RESULT',
    'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS',
    'Revision conflicts and filesystem replacement failures are exposed through typed repository errors and command receipts.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-WORKSPACE-FILE-ADAPTER-RESULT',
    'SYS-API-INFRA-WORKSPACE-FILES',
    'Scoped read, write, and revision-conflict outcomes are exposed through protected workspace-file HTTP status and error responses.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-SOURCE-IMPORT-OPERATIONS-CONTRACT-TESTS',
    'SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS',
    'Contract validity is observable through focused schema tests; runtime telemetry belongs to implementing adapters.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-METRIC-EVIDENCE-HOTSPOT-PRESENTATION',
    'web.component.metrics.MetricEvidenceHotspot',
    'Accessible evidence details and provenance tones are observable through focused presentation tests.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-SOURCE-OBJECT-METRIC-EVIDENCE-PRESENTER',
    'web.component.metrics.SourceObjectMetricEvidencePresenter',
    'Metric abbreviation, confidence tone, and complete tooltip details are observable through focused presenter tests.',
    'log',
    true,
    'not_applicable'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.production_rail_reconciliation;

create temporary table production_rail_reconciliation (
  rail_name text primary key,
  rail_type text not null,
  ddd_owner text not null,
  rail_status text not null,
  mechanization_status text not null,
  implementation_refs jsonb not null,
  source_path text not null,
  reconciliation_note text not null
) on commit drop;

insert into production_rail_reconciliation (
  rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  mechanization_status,
  implementation_refs,
  source_path,
  reconciliation_note
)
values
  (
    'ApplyAdr0TraceabilityGate',
    'command',
    'Repository CI governance baseline',
    'implemented',
    'implemented',
    jsonb_build_array(
      'package.json#traceability:adr0',
      '.github/workflows/pr-quality-gate.yml#pnpm traceability:adr0'
    ),
    'docs/planning/proposals/mandatory/governance-and-docs/adr0-traceability-gate-restoration-plan-20260505.md',
    'The package command and its single remote workflow owner implement this gate.'
  ),
  (
    'GenerateGovernanceDocumentUnitMap',
    'command',
    'Repository governance document map',
    'implemented',
    'implemented',
    jsonb_build_array(
      'scripts/generate-governance-document-unit-map.cjs',
      'package.json#docs:governance:document-unit-map'
    ),
    'docs/planning/proposals/mandatory/governance-and-docs/system-governance-unit-index-plan-20260501.md',
    'The governed generator and package command implement the document-unit map.'
  ),
  (
    'GenerateGovernanceUnitCoverage',
    'command',
    'Repository governance unit index',
    'implemented',
    'implemented',
    jsonb_build_array(
      'scripts/check-governance-unit-coverage.cjs',
      'package.json#docs:governance:unit-coverage'
    ),
    'docs/planning/proposals/mandatory/governance-and-docs/system-governance-unit-index-plan-20260501.md',
    'The governed coverage checker and package command implement unit coverage validation.'
  ),
  (
    'ValidateContractReferences',
    'command',
    'ContractReferenceValidationCommand',
    'implemented',
    'implemented',
    jsonb_build_array(
      'scripts/validate-references.cjs',
      'package.json#contracts:references:validate'
    ),
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'The cross-contract reference validator is the executable command implementation.'
  ),
  (
    'ValidateRfc2119Language',
    'command',
    'Rfc2119LanguageValidationCommand',
    'implemented',
    'implemented',
    jsonb_build_array(
      'scripts/validate-rfc2119.cjs',
      'package.json#contracts:rfc2119:validate'
    ),
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'The RFC 2119 validator is the executable command implementation.'
  ),
  (
    'ListWorkspaceArtifacts',
    'query',
    'Workspace artifact preview read model',
    'implemented',
    'implemented',
    jsonb_build_array(
      'apps/web/src/app/queries/workspaceQueries.ts#useWorkspaceArtifactsQuery',
      'apps/web/src/app/views/artifacts/useArtifactsViewModel.ts'
    ),
    'docs/architecture/components/web/frontend-component-inventory.md',
    'The workspace artifact query and Artifacts view model implement this read model.'
  ),
  (
    'RecordArchitectureDocumentationReconciliationCanon',
    'command',
    'Architecture documentation reconciliation canon aggregate',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/planning/proposals/mandatory/governance-and-docs/architecture-doc-reconciliation-canon-plan-20260523.md',
    'The name describes a documentation disposition, not an executable application command.'
  ),
  (
    'RecordCanvasFowlerCanon',
    'command',
    'Canvas Fowler canon aggregate',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-fowler-canon-plan-20260523.md',
    'The name describes a planning disposition, not an executable Canvas command.'
  ),
  (
    'RecordCiRetentionReviewCanon',
    'command',
    'CI retention review canon aggregate',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md',
    'The name describes a review record, not an executable repository command.'
  ),
  (
    'RecordPlanningReviewFollowUp',
    'command',
    'Planning review follow-up ledger',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md',
    'Planning task lifecycle already uses canonical Planning DB operations; this alias has no distinct port.'
  ),
  (
    'RecordRuntimeReviewCanon',
    'command',
    'Runtime review canon aggregate',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/planning/proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md',
    'The name describes a review disposition, not an executable runtime command.'
  ),
  (
    'RecordWorkbenchUxCanon',
    'command',
    'Workbench UX canon aggregate',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md',
    'The name describes a UX planning disposition, not an executable product command.'
  ),
  (
    'RunAdr0TraceabilityGate',
    'command',
    'ADR-0000 traceability',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/archive/planning/proposals/ci-adr0-owner-consolidation-plan-20260511.md',
    'Archived alias retired in favor of ApplyAdr0TraceabilityGate.'
  ),
  (
    'ClassifyArchitectureGovernanceReviewFinding',
    'query',
    'Architecture review finding catalog',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/planning/proposals/mandatory/governance-and-docs/architecture-governance-review-canon-plan-20260524.md',
    'The classification exists only as review prose and has no executable read model.'
  ),
  (
    'ClassifyPlanningReviewIntake',
    'query',
    'Planning review intake catalog',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md',
    'The classification exists only as review prose and has no executable read model.'
  ),
  (
    'DocumentRepositoryCommandTaxonomy',
    'query',
    'Repository delivery governance',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/planning/proposals/mandatory/governance-and-docs/repository-command-catalog-normalization-plan-20260508.md',
    'Documentation generation is not a query read model; canonical repository command queries remain active separately.'
  ),
  (
    'ValidateWorkbenchShellContract',
    'query',
    'Workbench shell contract read model',
    'retired',
    'closed',
    '[]'::jsonb,
    'docs/architecture/components/web/workbench-ux-canon-component.md',
    'A test-only assertion is evidence, not an application query implementation.'
  );

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by,
  created_at,
  updated_at
)
select
  'local#production-rail-evidence-20260711#' || rail_type || '#' || lower(regexp_replace(rail_name, '[^a-zA-Z0-9]+', '', 'g')),
  'PRODUCTION-RAIL-EVIDENCE-20260711',
  mechanization_status,
  rail_name,
  lower(regexp_replace(rail_name, '[^a-zA-Z0-9]+', '', 'g')),
  rail_type,
  ddd_owner,
  rail_status,
  implementation_refs,
  implementation_refs,
  jsonb_build_array(source_path),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    source_path
  ),
  case
    when rail_status = 'implemented' then jsonb_build_array('Production code or package command owns the rail implementation.')
    else jsonb_build_array('Prose, tests, and review records do not constitute command/query implementations.')
  end,
  jsonb_build_array('No test, fixture, migration, or prose-only mention may count as implementation evidence.'),
  jsonb_build_array(
    'pnpm planning:db:query rail-vocabulary --no-refresh --limit 100',
    'pnpm planning:db:integrity:check'
  ),
  source_path,
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = production_rail_reconciliation.source_path
      limit 1
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'name', rail_name,
    'type', rail_type,
    'status', rail_status,
    'dddOwner', ddd_owner,
    'implementationRefs', implementation_refs,
    'reconciliationNote', reconciliation_note,
    'reconciledBy', '625_workspace_cas_integrity_and_rail_reconciliation'
  ),
  jsonb_build_object(
    'featureId', 'PRODUCTION-RAIL-EVIDENCE-20260711',
    'mechanizationStatus', mechanization_status,
    'governingSources', jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      source_path
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', rail_name,
        'type', rail_type,
        'status', rail_status,
        'dddOwner', ddd_owner
      )
    )
  ),
  1,
  'codex',
  now(),
  now()
from production_rail_reconciliation
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

insert into architecture.evidence (
  evidence_id,
  subject_kind,
  subject_id,
  evidence_kind,
  source_ref,
  result_state,
  recorded_at
)
values (
  'EV-WORKSPACE-CAS-INTEGRITY-AND-RAIL-RECONCILIATION',
  'check',
  'WORKSPACE-CAS-INTEGRITY-AND-RAIL-RECONCILIATION-20260711',
  'query',
  'pnpm planning:db:integrity:check',
  'pass',
  now()
)
on conflict (evidence_id) do update set
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = excluded.recorded_at;

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
