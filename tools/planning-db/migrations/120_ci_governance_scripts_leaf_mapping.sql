-- Persist the governed CI governance scripts leaf mapping created through
-- planning:db:operate. Old or nonfunctional script evidence is updated through
-- explicit deprecation/canonicalization rows instead of being silently removed.

drop table if exists pg_temp.ci_governance_script_leaf_map;

create temporary table ci_governance_script_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null
);

insert into ci_governance_script_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_id,
  test_path,
  test_kind,
  coverage_level,
  validation_command
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-AI-INTAKE',
    'CI governance AI intake scripts',
    'AiWorkIntakePolicy',
    'RunAgentPreflight;InspectAiProjectContext',
    'Owns AI preflight, AI project index, and agent efficiency checks for repository work.',
    'Prepare AI-assisted work with repository context and CI preflight evidence.',
    'AI work protocol, preflight, or agent efficiency policy changes.',
    'scripts/ai-preflight.cjs',
    'AI preflight and repository context script boundary',
    'hidden_authority',
    array['RunAgentPreflight', 'gen-ai-index']::text[],
    array[
      'scripts/AI_INDEX_README.md',
      'scripts/ai-preflight.cjs',
      'scripts/ai-preflight.test.cjs',
      'scripts/check-ai-efficiency-adoption.cjs',
      'scripts/check-ai-efficiency-adoption.test.cjs',
      'scripts/gen-ai-index.js'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-AI-INTAKE',
    'scripts/ai-preflight.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/ai-preflight.test.cjs scripts/check-ai-efficiency-adoption.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI governance docs generation scripts',
    'DocsGenerationPolicy',
    'GenerateDocsGovernanceManifest;GenerateGovernanceDocumentUnitMap;GenerateGovernanceUnitCoverage',
    'Owns generated documentation and planning view builders under scripts.',
    'Generate repository docs, planning views, code status, capability coverage, and traceability reports.',
    'Generated documentation, planning view, or traceability report shape changes.',
    'scripts/generate-workboard.cjs',
    'Generated docs and planning view builder script boundary',
    'responsibility_overload',
    array['sync-docs', 'generate-workboard', 'generate-code-status']::text[],
    array[
      'scripts/align-markdown-tables.cjs',
      'scripts/backfill-planning-last-reviewed.cjs',
      'scripts/docs-workboard-check-changed.cjs',
      'scripts/generate-capability-coverage.cjs',
      'scripts/generate-code-status.cjs',
      'scripts/generate-code-status.test.cjs',
      'scripts/generate-contract-index.cjs',
      'scripts/generate-db-surface-inventory.cjs',
      'scripts/generate-db-surface-inventory.test.cjs',
      'scripts/generated-doc-date.cjs',
      'scripts/generate-knowledge-intake-literature.cjs',
      'scripts/generate-knowledge-intake-literature.test.cjs',
      'scripts/generate-planning-lanes.cjs',
      'scripts/generate-planning-lanes.test.cjs',
      'scripts/generate-spec-traceability-report.cjs',
      'scripts/generate-workboard.cjs',
      'scripts/generate-workboard.test.cjs',
      'scripts/rebuild-snapshots.js',
      'scripts/sync-docs.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'scripts/generate-workboard.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/generate-workboard.test.cjs scripts/generate-code-status.test.cjs scripts/generate-db-surface-inventory.test.cjs scripts/generate-planning-lanes.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-QUALITY',
    'CI governance docs quality scripts',
    'DocsQualityGate',
    'ValidateFeatureMechanizationImplementation;CheckFeatureMechanizationDiffSurface',
    'Owns documentation quality, markdown location, and canonical docs checks.',
    'Validate docs placement, canonical docs posture, markdown changes, and docs quality gates.',
    'Docs validation, markdown lint, or canonical docs policy changes.',
    'scripts/docs-quality-check.cjs',
    'Documentation quality and markdown validation script boundary',
    'documentation_drift',
    array['docs-canonical-check', 'docs-quality-check', 'lint-markdown-changed']::text[],
    array[
      'scripts/docs-canonical-check.cjs',
      'scripts/docs-canonical-fix.cjs',
      'scripts/docs-doctor.cjs',
      'scripts/docs-planning-generated-check.cjs',
      'scripts/docs-quality-check.cjs',
      'scripts/check-markdown-locations.cjs',
      'scripts/format-markdown-changed.cjs',
      'scripts/lint-markdown-changed.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-QUALITY',
    'scripts/check-generated-docs-policy.test.cjs',
    'unit',
    'boundary',
    'node --test scripts/check-generated-docs-policy.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-GOVERNANCE-INDEXES',
    'CI governance index and refresh scripts',
    'GovernanceIndexRefreshPolicy',
    'GenerateGovernanceFileComponentIndex;GenerateGovernanceDocumentUnitMap;AcceptGovernanceFileFingerprintBaseline',
    'Owns governance index generation, governance DB import/export/check, and refresh orchestration scripts.',
    'Build, refresh, check, and export governance indexes and Planning DB governance projections.',
    'Governance index, fingerprint baseline, refresh sequence, or governance DB lifecycle changes.',
    'scripts/governance-refresh.cjs',
    'Governance index refresh, import, export, and check script boundary',
    'hidden_authority',
    array['governance:refresh', 'governance:db:check', 'governance:db:export']::text[],
    array[
      'scripts/check-governance-changed-files.cjs',
      'scripts/check-governance-changed-files.test.cjs',
      'scripts/check-governance-file-fingerprint-baseline.cjs',
      'scripts/check-governance-file-fingerprint-baseline.test.cjs',
      'scripts/check-governance-unit-coverage.cjs',
      'scripts/check-governance-unit-coverage.test.cjs',
      'scripts/generate-governance-coverage-report.cjs',
      'scripts/generate-governance-coverage-report.test.cjs',
      'scripts/generate-governance-document-unit-map.cjs',
      'scripts/generate-governance-document-unit-map.test.cjs',
      'scripts/generate-governance-file-component-index.cjs',
      'scripts/generate-governance-file-component-index.test.cjs',
      'scripts/generate-governance-remediation-queue.cjs',
      'scripts/generate-governance-remediation-queue.test.cjs',
      'scripts/governance-db-check.cjs',
      'scripts/governance-db-check.test.cjs',
      'scripts/governance-db-export.cjs',
      'scripts/governance-db-export.test.cjs',
      'scripts/governance-db-import.cjs',
      'scripts/governance-db-import.test.cjs',
      'scripts/governance-generated-paths.cjs',
      'scripts/governance-generated-paths.test.cjs',
      'scripts/governance-refresh.cjs',
      'scripts/governance-refresh.test.cjs',
      'scripts/planning-db/commands/governance-refresh-command.cjs',
      'scripts/planning-db/governance-refresh-write-rail.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-GOVERNANCE-INDEXES',
    'scripts/governance-refresh.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/governance-refresh.test.cjs scripts/governance-db-check.test.cjs scripts/governance-generated-paths.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CORE',
    'CI governance Planning DB core scripts',
    'PlanningDbLifecycle',
    'PreparePlanningDbForCiGate;ApplyPlanningLocalOperation;CheckPlanningDbComponentIntegrity',
    'Owns Planning DB lifecycle, migration, import/export, integrity, and surface check scripts.',
    'Run and validate Planning DB migrations, imports, exports, checks, and integrity gates.',
    'Planning DB lifecycle, schema migration, import/export, or integrity behavior changes.',
    'scripts/planning-db-migrate.cjs',
    'Planning DB lifecycle, migration, import, export, and integrity script boundary',
    'responsibility_overload',
    array['planning:db:migrate', 'planning:db:import', 'planning:db:integrity:check']::text[],
    array[
      'scripts/db-migrate.cjs',
      'scripts/planning-db-run.cjs',
      'scripts/planning-db-run.test.cjs',
      'scripts/planning-db-migrate.cjs',
      'scripts/planning-db-migrate.test.cjs',
      'scripts/planning-db-import.cjs',
      'scripts/planning-db-import.test.cjs',
      'scripts/planning-db-export.cjs',
      'scripts/planning-db-export.test.cjs',
      'scripts/planning-db-check.cjs',
      'scripts/planning-db-check.test.cjs',
      'scripts/planning-db-integrity-check.cjs',
      'scripts/planning-db-integrity-check.test.cjs',
      'scripts/planning-db-content.integration.test.cjs',
      'scripts/planning-db-surface-inventory-check.cjs',
      'scripts/planning-db-surface-inventory-check.test.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CORE',
    'scripts/planning-db-migrate.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-integrity-check.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-OPERATE',
    'CI governance Planning DB operate scripts',
    'PlanningDbCommandRail',
    'CreateGovernanceComponent;CreateArchitectureDesign;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence',
    'Owns planning:db:operate CLI and command-rail operation tests.',
    'Execute governed Planning DB write rails for tasks, components, architecture, docs disposition, and evidence.',
    'Planning DB write rail parsing, planning, idempotency, or persistence changes.',
    'scripts/planning-db-operate.cjs',
    'planning:db:operate governed write rail boundary',
    'hidden_authority',
    array['planning:db:operate']::text[],
    array[
      'scripts/planning-db-operate.cjs',
      'scripts/planning-db-operate.test.cjs',
      'scripts/planning-db-operate-tests/**'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-OPERATE',
    'scripts/planning-db-operate.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-operate.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
    'CI governance Planning DB query scripts',
    'PlanningDbQueryReadModel',
    'ReadComponentProfile;ValidateComponentIntegrity;ValidateRailVocabulary;DetectCodeSymbolDuplicates',
    'Owns planning:db:query CLI, query adapters, and query tests.',
    'Expose Planning DB read models for components, rails, docs, governance refresh, code symbols, and planning state.',
    'Planning DB query rail, read-model output, filter, or formatting changes.',
    'scripts/planning-db-query.cjs',
    'planning:db:query read-model adapter boundary',
    'evolutionary_architecture',
    array['planning:db:query']::text[],
    array[
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db-query-tests/**',
      'scripts/planning-db/queries/**'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
    'CI governance Planning DB catalog scripts',
    'PlanningDbCatalogInventory',
    'AssessCreationIntentQuery;DocumentRepositoryCommandTaxonomy;CheckBuzonIntakeRetirement',
    'Owns Planning DB catalog, code-symbol, command/query rail, frontend inventory, and feature mechanization helpers.',
    'Inventory code symbols, command/query rails, DB surfaces, frontend components, feature mechanization manifests, and knowledge-intake retirement posture.',
    'Catalog extraction, duplicate detection, feature mechanization, or retirement guard changes.',
    'scripts/planning-db/code-symbol-inventory.cjs',
    'Planning DB catalog extraction and duplicate-detection script boundary',
    'evolutionary_architecture',
    array['code-symbol-inventory', 'command-query-rail-catalog', 'frontend-component-inventory']::text[],
    array[
      'scripts/check-feature-mechanization.cjs',
      'scripts/check-feature-mechanization.test.cjs',
      'scripts/feature-mechanization-manifest.test.cjs',
      'scripts/lib/feature-mechanization-manifest.cjs',
      'scripts/planning-db/architecture-fitness/**',
      'scripts/planning-db/code-symbol-inventory.cjs',
      'scripts/planning-db/command-query-rail-catalog.cjs',
      'scripts/planning-db/command-query-rail-documentation.cjs',
      'scripts/planning-db/command-query-rail-reference-index.cjs',
      'scripts/planning-db/command-query-rail-shared.cjs',
      'scripts/planning-db/db-surface-inventory.cjs',
      'scripts/planning-db/frontend-component-inventory.cjs',
      'scripts/planning-db/frontend-mechanical-truth-inventory.cjs',
      'scripts/planning-db/knowledge-intake-retirement-guard.cjs',
      'scripts/planning-db-frontend-component-inventory.test.cjs',
      'scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs',
      'scripts/planning-db-knowledge-intake-retirement-guard.test.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
    'scripts/planning-db-frontend-component-inventory.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-frontend-component-inventory.test.cjs scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs scripts/planning-db-knowledge-intake-retirement-guard.test.cjs scripts/feature-mechanization-manifest.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-CHANGED-CLOSEOUT',
    'CI governance changed-slice closeout scripts',
    'ChangedSliceCloseoutGate',
    'RunChangedSliceVerification;RunChangedSliceCloseout;RunPrCloseout;BuildVerifyPrepushPlan',
    'Owns changed-file verification, closeout, PR closeout, formatting, commit helper, and local validation planning scripts.',
    'Plan and run changed-slice verification, prepush routing, PR closeout, commit formatting, and local change detection.',
    'Changed-file gate, prepush router, PR closeout, commit helper, or local validation plan changes.',
    'scripts/verify-prepush.cjs',
    'Changed-slice verification, prepush, closeout, and PR closeout script boundary',
    'evolutionary_architecture',
    array['verify:prepush', 'verify:changed', 'pr-closeout', 'pnpm commit']::text[],
    array[
      'scripts/check-changed.cjs',
      'scripts/closeout-changed.cjs',
      'scripts/closeout-changed.test.cjs',
      'scripts/commit.cjs',
      'scripts/docs-pr-create.cjs',
      'scripts/docs-pr-local.cjs',
      'scripts/fix-changed.cjs',
      'scripts/format-git-operation-changes.cjs',
      'scripts/format-git-operation-changes.test.cjs',
      'scripts/git-local-changes.cjs',
      'scripts/git-local-changes.test.cjs',
      'scripts/local-validation-plan.cjs',
      'scripts/pr-closeout.cjs',
      'scripts/pr-closeout.test.cjs',
      'scripts/type-check-prepush.cjs',
      'scripts/verify-changed.cjs',
      'scripts/verify-changed.test.cjs',
      'scripts/verify-prepush.cjs',
      'scripts/verify-prepush.test.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-CHANGED-CLOSEOUT',
    'scripts/verify-prepush.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/verify-prepush.test.cjs scripts/verify-changed.test.cjs scripts/pr-closeout.test.cjs scripts/git-local-changes.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'CI governance policy validation scripts',
    'RepositoryPolicyValidationGate',
    'ApplyAdr0TraceabilityGate;CheckPrQualityGovernanceParity;CheckArchitectureDependencyBoundaries',
    'Owns repository policy validators, generated-doc policy checks, forbidden-file checks, hash comparison, and QA artifact checks.',
    'Validate ARC evidence, contracts, executable examples, glossary, idempotency vectors, PR titles, references, RFC2119 language, generated docs policy, and QA artifacts.',
    'Repository policy validation, PR title, ARC evidence, generated docs policy, or reference validation changes.',
    'scripts/validate-pr-title.cjs',
    'Repository policy validation and QA artifact script boundary',
    'evolutionary_architecture',
    array['validate-pr-title', 'validate-contracts', 'qa-artifact-check']::text[],
    array[
      'scripts/check-forbidden-tracked-files.cjs',
      'scripts/check-generated-docs-policy.cjs',
      'scripts/check-generated-docs-policy.test.cjs',
      'scripts/compare-hashes.cjs',
      'scripts/qa-artifact-check.cjs',
      'scripts/validate-arc-evidence-frontmatter.cjs',
      'scripts/validate-contracts.cjs',
      'scripts/validate-executable-examples.cjs',
      'scripts/validate-glossary-usage.cjs',
      'scripts/validate-idempotency-vectors.cjs',
      'scripts/validate-pr-title.cjs',
      'scripts/validate-references.cjs',
      'scripts/validate-rfc2119.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'scripts/check-generated-docs-policy.test.cjs',
    'unit',
    'boundary',
    'node --test scripts/check-generated-docs-policy.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
    'CI governance runtime proof scripts',
    'RuntimeProofHarness',
    'RunCanvasFirstAuthoringLiveProof;RunFullCiCodeBaseline;WebVitestSuitePartition',
    'Owns local runtime proof, dev-stack, hooks, workspace task, and protected runtime support scripts plus script metadata.',
    'Run local dev-stack, browser/live proofs, temporal/postgres proofs, workspace task wrappers, hook setup, and runtime support utilities.',
    'Runtime proof, dev-stack orchestration, workspace task routing, hook setup, or script runtime metadata changes.',
    'scripts/run-dev-stack.cjs',
    'Local runtime proof, dev-stack, hook setup, and runtime support script boundary',
    'boundary_drift',
    array['run-dev-stack', 'run-temporal-postgres-proof', 'run-canvas-first-authoring-live-proof']::text[],
    array[
      'scripts/README.md',
      'scripts/build-workspace-runtime-deps.cjs',
      'scripts/enable-workflow.sh',
      'scripts/hygiene.ps1',
      'scripts/jsconfig.json',
      'scripts/outbox-worker-canary-evidence.ps1',
      'scripts/provision-postgres-app-role.cjs',
      'scripts/run-*.cjs',
      'scripts/run-*.test.cjs',
      'scripts/setup-git-hooks.cjs',
      'scripts/skip-prebuild-if-orchestrated.cjs',
      'scripts/skip-pretest-if-ci.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
    'scripts/run-dev-stack.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/run-dev-stack.test.cjs scripts/run-temporal-postgres-proof.test.cjs scripts/run-selected-closure-live-proof.test.cjs'
  );

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
values
  (
    'PLANNING-DB-CI-GOVERNANCE-SCRIPTS-LEAF-MAPPING-20260618',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'CI governance scripts leaf component ownership mapping',
    'Architecture / Planning DB / CI',
    'review',
    'SYS-CI-GOVERNANCE-SCRIPTS is a composite repository automation area that still owns concrete script files directly. This design splits those files into responsibility-owned leaves so component-profile can answer files, tests, commands, queries, adapters, and Fowler ownership without creating a parallel inventory.',
    'responsibility_overload',
    'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    null
  ),
  (
    'PLANNING-DB-CI-GOVERNANCE-SCRIPTS-LEAF-EVIDENCE-20260618',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'CI governance scripts leaf test evidence mapping',
    'Architecture / Planning DB / CI',
    'review',
    'The CI governance scripts leaf components need test evidence scopes distinct from creation scopes so RecordArchitectureTestEvidence can attach executable validation to each concrete responsibility.',
    'hidden_authority',
    'RecordArchitectureTestEvidence;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
    null
  ),
  (
    'PLANNING-DB-CI-GOVERNANCE-SCRIPTS-PARENT-EVIDENCE-CANONICALIZATION-20260618',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'CI governance scripts parent evidence command canonicalization',
    'Architecture / Planning DB / CI',
    'review',
    'The parent SYS-CI-GOVERNANCE-SCRIPTS test evidence used an obsolete component-profile invocation without --component. This design updates that evidence to the current query rail syntax instead of leaving a nonfunctional command active.',
    'hidden_authority',
    'RecordArchitectureTestEvidence;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
    null
  )
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select
  'PLANNING-DB-CI-GOVERNANCE-SCRIPTS-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component' as subject_kind, 'SYS-CI-GOVERNANCE-SCRIPTS' as subject_id, 'may_reference' as scope_kind
  union all
  select 'path', 'scripts/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from ci_governance_script_leaf_map
  union all
  select
    'relation',
    'REL-CI-GOVERNANCE-SCRIPTS-CONTAINS-' || replace(component_id, 'SYS-CI-GOVERNANCE-SCRIPTS-', ''),
    'may_create'
  from ci_governance_script_leaf_map
  union all
  select 'test', test_id, 'may_create' from ci_governance_script_leaf_map
) scope
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select
  'PLANNING-DB-CI-GOVERNANCE-SCRIPTS-LEAF-EVIDENCE-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component' as subject_kind, component_id as subject_id, 'may_reference' as scope_kind
  from ci_governance_script_leaf_map
  union all
  select 'test', test_id, 'may_create'
  from ci_governance_script_leaf_map
) scope
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-CI-GOVERNANCE-SCRIPTS-PARENT-EVIDENCE-CANONICALIZATION-20260618',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-CI-GOVERNANCE-SCRIPTS-PARENT-EVIDENCE-CANONICALIZATION-20260618',
    'test',
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
select
  component_id,
  'planning_query_store.governance_component_local_definitions',
  'bf5a495ed1afea5328a9428d913dfb30c7310fbb009414c50ca94e2f2daff9b1',
  0,
  name,
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from ci_governance_script_leaf_map
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from ci_governance_script_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from ci_governance_script_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from ci_governance_script_leaf_map
  union all
  select
    component_id,
    'invariant',
    'The parent SYS-CI-GOVERNANCE-SCRIPTS stays a composite component and concrete script files are owned by this leaf when they match its responsibility.',
    0
  from ci_governance_script_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows no direct files owned by SYS-CI-GOVERNANCE-SCRIPTS and focused tests pass.',
    0
  from ci_governance_script_leaf_map
  union all
  select
    component_id,
    'consumer',
    'planning_query_store.component_profile and CI governance validation queries',
    0
  from ci_governance_script_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  from ci_governance_script_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from ci_governance_script_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from ci_governance_script_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
select
  component_id,
  name,
  'module',
  'infra',
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  'medium',
  'review',
  'SYS-CI-GOVERNANCE-SCRIPTS'
from ci_governance_script_leaf_map
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'proposed'
from ci_governance_script_leaf_map
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-CI-GOVERNANCE-SCRIPTS-CONTAINS-' || replace(component_id, 'SYS-CI-GOVERNANCE-SCRIPTS-', ''),
  'SYS-CI-GOVERNANCE-SCRIPTS',
  component_id,
  'contains',
  'outbound',
  'sync',
  null,
  'not_applicable',
  'repo-local component ownership',
  '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb,
  'implemented'
from ci_governance_script_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  true,
  validation_command
from ci_governance_script_leaf_map
union all
select
  'TEST-SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'scripts/ai-preflight.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-CI-GOVERNANCE-SCRIPTS --no-refresh && pnpm planning:db:query component-integrity --component SYS-CI-GOVERNANCE-SCRIPTS --no-refresh'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.ci_governance_script_leaf_map;
