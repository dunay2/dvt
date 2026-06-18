-- Split the oversized planning documentation component into semantic leaves.
-- Date-coded closeouts and lifecycle folders stay active tracked evidence; no
-- planning document is deprecated in this slice.

drop table if exists pg_temp.docs_planning_leaf_map;

create temporary table docs_planning_leaf_map (
  component_id text primary key,
  name text not null,
  repo_path text not null,
  ddd_owner text not null,
  rail_name text not null,
  owned_concern text not null,
  reason_to_change text not null,
  public_contract text not null,
  fowler_signal text not null,
  owns text[] not null,
  test_path text not null,
  validation_command text not null,
  maturity_score numeric not null,
  criticality text not null
);

insert into docs_planning_leaf_map (
  component_id,
  name,
  repo_path,
  ddd_owner,
  rail_name,
  owned_concern,
  reason_to_change,
  public_contract,
  fowler_signal,
  owns,
  test_path,
  validation_command,
  maturity_score,
  criticality
)
values
  (
    'SYS-DOCS-PLANNING-ENTRYPOINTS',
    'Planning documentation entrypoints',
    'docs/planning/index.md',
    'PlanningDocumentationEntrypointReadModel',
    'ReadPlanningDocumentationEntrypoints',
    'planning documentation landing pages and navigation entrypoints',
    'Planning navigation, index generation, or planning entrypoint placement changes.',
    'Planning documentation entrypoint boundary.',
    'published_language',
    array['docs/planning/index.md']::text[],
    'scripts/sync-docs.cjs',
    'pnpm docs:sync && pnpm docs:canonical:check',
    70,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202603',
    'Planning closeout records 2026-03',
    'docs/planning/closeouts',
    'PlanningCloseoutRecordReadModel',
    'ReadPlanningCloseoutRecords202603',
    'March 2026 planning closeout evidence records',
    'March 2026 closeout evidence, recovery notes, or closeout navigation changes.',
    'March 2026 planning closeout evidence boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/closeouts/202603*.md']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm lint:md:changed',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202604',
    'Planning closeout records 2026-04',
    'docs/planning/closeouts',
    'PlanningCloseoutRecordReadModel',
    'ReadPlanningCloseoutRecords202604',
    'April 2026 planning closeout evidence records',
    'April 2026 closeout evidence, recovery notes, or closeout navigation changes.',
    'April 2026 planning closeout evidence boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/closeouts/202604*.md']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm lint:md:changed',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202605',
    'Planning closeout records 2026-05',
    'docs/planning/closeouts',
    'PlanningCloseoutRecordReadModel',
    'ReadPlanningCloseoutRecords202605',
    'May 2026 planning closeout evidence records',
    'May 2026 closeout evidence, recovery notes, or closeout navigation changes.',
    'May 2026 planning closeout evidence boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/closeouts/202605*.md']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm lint:md:changed',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202606',
    'Planning closeout records 2026-06',
    'docs/planning/closeouts',
    'PlanningCloseoutRecordReadModel',
    'ReadPlanningCloseoutRecords202606',
    'June 2026 planning closeout evidence records',
    'June 2026 closeout evidence, recovery notes, or closeout navigation changes.',
    'June 2026 planning closeout evidence boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/closeouts/202606*.md']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm lint:md:changed',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY',
    'Planning legacy closeout records',
    'docs/planning/closeouts',
    'PlanningCloseoutRecordReadModel',
    'ReadPlanningLegacyCloseoutRecords',
    'legacy non-date planning closeout evidence records kept explicit for review',
    'Legacy closeout naming, historical evidence retention, or closeout retirement changes.',
    'Legacy planning closeout evidence boundary.',
    'documentation_lifecycle_legacy',
    array[
      'docs/planning/closeouts/engine-deps-refactor-closeout.md',
      'docs/planning/closeouts/F-02-closeout.md',
      'docs/planning/closeouts/F-04-D-E-composition-root-foundation-closeout.md',
      'docs/planning/closeouts/F-04-F-capabilities-port-and-route-query-boundary-closeout.md',
      'docs/planning/closeouts/F-04-RESIDUAL-A-root-provider-guard-closeout.md',
      'docs/planning/closeouts/F-04-RESIDUAL-B-provider-override-test-seams-closeout.md',
      'docs/planning/closeouts/F-04-RISK-A-QA-03-backend-owned-planref-closeout.md',
      'docs/planning/closeouts/F-04-RISK-B-mock-workspace-isolation-closeout.md',
      'docs/planning/closeouts/G7.1-closeout.md',
      'docs/planning/closeouts/index.md'
    ]::text[],
    'scripts/docs-doctor.cjs',
    'pnpm docs:doctor && pnpm planning:db:query source-drift --no-refresh --limit 80',
    62,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-PROPOSALS-ROOT',
    'Planning proposal root records',
    'docs/planning/proposals',
    'PlanningProposalReadModel',
    'ReadPlanningProposalRootRecords',
    'planning proposal indexes, portfolio map, root proposals, tradeoffs, and editor-style proposal records',
    'Proposal navigation, root proposal, portfolio, tradeoff, or editor-style planning changes.',
    'Planning proposal root record boundary.',
    'published_language',
    array[
      'docs/planning/proposals/*.md',
      'docs/planning/proposals/tradeoffs/**',
      'docs/planning/proposals/vscode style/**'
    ]::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    70,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY',
    'Mandatory planning proposals',
    'docs/planning/proposals/mandatory',
    'MandatoryPlanningProposalReadModel',
    'ReadMandatoryPlanningProposals',
    'mandatory governed implementation plans and proposal records',
    'Mandatory proposal, implementation-plan, feature-mechanization, or governance-source changes.',
    'Mandatory planning proposal boundary.',
    'documentation_governance',
    array['docs/planning/proposals/mandatory/**']::text[],
    'scripts/check-feature-mechanization.cjs',
    'pnpm docs:feature-mechanization:implementation && pnpm docs:canonical:check',
    78,
    'high'
  ),
  (
    'SYS-DOCS-PLANNING-PROPOSALS-DISPOSABLE',
    'Disposable planning proposals',
    'docs/planning/proposals/disposable',
    'DisposablePlanningProposalReadModel',
    'ReadDisposablePlanningProposals',
    'short-lived proposal records retained for governed lifecycle visibility',
    'Disposable proposal retention, retirement, or lifecycle classification changes.',
    'Disposable planning proposal boundary.',
    'documentation_lifecycle_legacy',
    array['docs/planning/proposals/disposable/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm docs:doctor',
    62,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-PROPOSALS-SUPERSEDED',
    'Superseded planning proposals',
    'docs/planning/proposals/superseded',
    'SupersededPlanningProposalReadModel',
    'ReadSupersededPlanningProposals',
    'superseded proposal records retained as explicit historical planning evidence',
    'Superseded proposal retirement, replacement, or lifecycle classification changes.',
    'Superseded planning proposal boundary.',
    'documentation_lifecycle_archive',
    array['docs/planning/proposals/superseded/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm docs:doctor',
    62,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-PROPOSALS-NICE-TO-HAVE',
    'Nice-to-have planning proposals',
    'docs/planning/proposals/nice-to-have',
    'NiceToHavePlanningProposalReadModel',
    'ReadNiceToHavePlanningProposals',
    'non-mandatory planning proposal records that are explicitly outside the mandatory queue',
    'Nice-to-have proposal promotion, retirement, or planning priority changes.',
    'Nice-to-have planning proposal boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/proposals/nice-to-have/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm docs:doctor',
    62,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-PROPOSALS-BUNDLES',
    'Planning proposal bundles',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409',
    'PlanningProposalBundleReadModel',
    'ReadPlanningProposalBundles',
    'proposal bundle records that group related product and UX planning material',
    'Proposal bundle, bundled planning evidence, or bundle lifecycle changes.',
    'Planning proposal bundle boundary.',
    'published_language',
    array['docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/**']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    66,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-REVIEWS-ROOT',
    'Planning review root records',
    'docs/planning/reviews',
    'PlanningReviewReadModel',
    'ReadPlanningReviewRootRecords',
    'planning review indexes, status board, naming policy, and root review records',
    'Review navigation, review status, review naming, or root review changes.',
    'Planning review root record boundary.',
    'published_language',
    array['docs/planning/reviews/*.md']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    70,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-REVIEWS-ARCHITECTURE-GOVERNANCE',
    'Architecture and governance planning reviews',
    'docs/planning/reviews/architecture-and-governance',
    'ArchitectureGovernanceReviewReadModel',
    'ReadArchitectureGovernancePlanningReviews',
    'architecture and governance review records',
    'Architecture review, governance review, or hard-QA review changes.',
    'Architecture and governance planning review boundary.',
    'architecture_fitness_function',
    array['docs/planning/reviews/architecture-and-governance/**']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    72,
    'high'
  ),
  (
    'SYS-DOCS-PLANNING-REVIEWS-SPRINTS',
    'Sprint planning reviews',
    'docs/planning/reviews/sprints',
    'SprintReviewReadModel',
    'ReadSprintPlanningReviews',
    'sprint review and iteration planning records',
    'Sprint review, iteration review, or sprint evidence changes.',
    'Sprint planning review boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/reviews/sprints/**']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    66,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-REVIEWS-EXECUTION-RUNTIME',
    'Execution runtime planning reviews',
    'docs/planning/reviews/execution-runtime',
    'ExecutionRuntimeReviewReadModel',
    'ReadExecutionRuntimePlanningReviews',
    'execution runtime and engine review records',
    'Execution runtime review, engine review, or runtime architecture review changes.',
    'Execution runtime planning review boundary.',
    'architecture_fitness_function',
    array['docs/planning/reviews/execution-runtime/**', 'docs/planning/reviews/engine/**']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-REVIEWS-CI-DELIVERY',
    'CI and delivery planning reviews',
    'docs/planning/reviews/ci-and-delivery',
    'CiDeliveryReviewReadModel',
    'ReadCiDeliveryPlanningReviews',
    'CI, delivery, and validation review records',
    'CI review, delivery review, validation posture, or workflow evidence changes.',
    'CI and delivery planning review boundary.',
    'quality_gate_gap',
    array['docs/planning/reviews/ci-and-delivery/**']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-REVIEWS-EVENT-TRACEABILITY',
    'Event and traceability planning reviews',
    'docs/planning/reviews/event-contract-and-traceability',
    'EventTraceabilityReviewReadModel',
    'ReadEventTraceabilityPlanningReviews',
    'event contract, traceability, lifecycle, and retention review records',
    'Event contract review, traceability review, lifecycle, or retention review changes.',
    'Event and traceability planning review boundary.',
    'contract_traceability',
    array[
      'docs/planning/reviews/event-contract-and-traceability/**',
      'docs/planning/reviews/event-lifecycle-and-retention/**'
    ]::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-ARCHIVE',
    'Planning archive documentation',
    'docs/planning/archive',
    'PlanningArchiveReadModel',
    'ReadPlanningArchive',
    'historical planning documents retained for reference and drift analysis',
    'Planning archive migration, retirement, or source-drift remediation changes.',
    'Planning archive documentation boundary.',
    'documentation_lifecycle_archive',
    array['docs/planning/archive/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query source-drift --no-refresh --limit 80 && pnpm docs:doctor',
    62,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-STATUS',
    'Planning status documentation',
    'docs/planning/status',
    'PlanningStatusReadModel',
    'ReadPlanningStatus',
    'current planning status, generated status pointers, governance status, and system component status documents',
    'Planning status, governance status, generated status pointer, or component status changes.',
    'Planning status documentation boundary.',
    'published_language',
    array['docs/planning/status/**']::text[],
    'scripts/generate-governance-coverage-report.cjs',
    'pnpm governance:refresh && pnpm planning:db:integrity:check',
    76,
    'high'
  ),
  (
    'SYS-DOCS-PLANNING-STATE',
    'Planning state documentation',
    'docs/planning/state',
    'PlanningStateReadModel',
    'ReadPlanningState',
    'planning control tower, lane snapshots, workboard views, and active planning state exports',
    'Planning state, lane snapshot, workboard, route, or planning-control changes.',
    'Planning state documentation boundary.',
    'hidden_authority',
    array['docs/planning/state/**']::text[],
    'scripts/generate-workboard.cjs',
    'pnpm docs:workboard:generate && pnpm docs:workboard:check',
    76,
    'high'
  ),
  (
    'SYS-DOCS-PLANNING-ROADMAP',
    'Planning roadmap documentation',
    'docs/planning/roadmap',
    'PlanningRoadmapReadModel',
    'ReadPlanningRoadmap',
    'strategic roadmap, roadmap indexes, and roadmap-of-record planning material',
    'Roadmap, strategic overlay, or roadmap classification changes.',
    'Planning roadmap documentation boundary.',
    'published_language',
    array['docs/planning/roadmap/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    70,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-TEMPLATES',
    'Planning templates',
    'docs/planning/templates',
    'PlanningTemplateReadModel',
    'ReadPlanningTemplates',
    'planning templates used to create governed tasks, reviews, proposals, and closeouts',
    'Planning template, task template, proposal template, or closeout template changes.',
    'Planning template documentation boundary.',
    'published_language',
    array['docs/planning/templates/**']::text[],
    'scripts/qa-artifact-check.cjs',
    'pnpm qa:artifact:check && pnpm docs:quality:check',
    66,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-DOMAINS',
    'Planning domain documentation',
    'docs/planning/domains',
    'PlanningDomainReadModel',
    'ReadPlanningDomains',
    'planning domain records and domain-specific planning slices',
    'Planning domain, ownership, or domain-specific work queue changes.',
    'Planning domain documentation boundary.',
    'published_language',
    array['docs/planning/domains/**']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    66,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-EXECUTION-MODEL',
    'Planning execution-model documentation',
    'docs/planning/execution-model',
    'PlanningExecutionModelReadModel',
    'ReadPlanningExecutionModel',
    'planning execution-model documents that describe DVT delivery and workflow posture',
    'Planning execution-model, delivery model, or workflow posture changes.',
    'Planning execution-model documentation boundary.',
    'published_language',
    array['docs/planning/execution-model/**']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    66,
    'medium'
  ),
  (
    'SYS-DOCS-PLANNING-GAPS',
    'Planning gap documentation',
    'docs/planning/gaps',
    'PlanningGapReadModel',
    'ReadPlanningGaps',
    'planning gap registers and tactical gap navigation',
    'Planning gap register, tactical gap, or gap-navigation changes.',
    'Planning gap documentation boundary.',
    'documentation_lifecycle_status',
    array['docs/planning/gaps/**']::text[],
    'scripts/docs-quality-check.cjs',
    'pnpm docs:quality:check && pnpm docs:canonical:check',
    64,
    'medium'
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
values (
  'PLANNING-DB-DOCS-PLANNING-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning documentation leaf component mapping',
  'Architecture / Planning DB / Docs',
  'review',
  'SYS-DOCS-GOVERNANCE-PLANNING directly owned every tracked file under docs/planning. This split creates responsibility-owned child components by lifecycle directory, proposal class, review class, and date-coded closeout cohort so component-profile can answer files, docs, tests, contracts, ports, relations, and Fowler/DDD basis without a side inventory.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadPlanningDocumentationEntrypoints',
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
  'PLANNING-DB-DOCS-PLANNING-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-GOVERNANCE-PLANNING'::text, 'may_update'::text
  union all
  select 'path', 'docs/planning/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from docs_planning_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from docs_planning_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
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
values (
  'SYS-DOCS-GOVERNANCE-PLANNING',
  'tools/planning-db/migrations/186_docs_planning_leaf_components.sql',
  md5('SYS-DOCS-GOVERNANCE-PLANNING:186') || md5('planning-docs-parent:186'),
  0,
  'Planning documentation catalog',
  'component',
  'SYS-DOCS-GOVERNANCE-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate planning documentation boundary while concrete planning files resolve to lifecycle, proposal, review, closeout, and status leaves.',
  'PlanningDocumentationCatalog',
  'ReadPlanningControlTower;ValidateComponentIntegrity;ReadPlanningDocumentationEntrypoints',
  'codex'
)
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
  'tools/planning-db/migrations/186_docs_planning_leaf_components.sql',
  md5(component_id || ':186') || md5(name || ':planning-docs-leaf:186'),
  0,
  name,
  'component',
  'SYS-DOCS-GOVERNANCE-PLANNING',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from docs_planning_leaf_map
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
from docs_planning_leaf_map
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
  select component_id, 'responsibility' as item_kind, 'Own ' || owned_concern || '.' as item_value, 0 as item_order
  from docs_planning_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_planning_leaf_map
  union all
  select component_id, 'invariant', 'Tracked planning files matching this leaf must resolve here rather than to SYS-DOCS-GOVERNANCE-PLANNING.', 0
  from docs_planning_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-DOCS-GOVERNANCE-PLANNING owns no direct planning files.', 0
  from docs_planning_leaf_map
  union all
  select component_id, 'consumer', 'Planning DB component-profile, documentation-lifecycle, source-drift, and filesystem-coverage readers.', 0
  from docs_planning_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 0
  from docs_planning_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 1
  from docs_planning_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 2
  from docs_planning_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_planning_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from docs_planning_leaf_map
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
  maturity_score,
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
  'none',
  criticality,
  'review',
  maturity_score,
  'SYS-DOCS-GOVERNANCE-PLANNING'
from docs_planning_leaf_map
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
  maturity_score = excluded.maturity_score,
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
  'Own ' || owned_concern || '.',
  reason_to_change,
  ddd_owner,
  'implemented'
from docs_planning_leaf_map
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-DOCS',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from docs_planning_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

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
  'REL-DOCS-PLANNING-CONTAINS-' || replace(component_id, 'SYS-DOCS-PLANNING-', ''),
  'SYS-DOCS-GOVERNANCE-PLANNING',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this planning documentation leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_planning_leaf_map
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(regexp_replace(rail_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  rail_name,
  'query',
  'inbound',
  'CONTRACT-' || component_id || '-DOCS',
  'CONTRACT-' || component_id || '-DOCS',
  array[
    'missing documentation ownership',
    'misclassified planning lifecycle folder',
    'component-profile documentation gap'
  ]::text[],
  'implemented'
from docs_planning_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

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
  'TEST-' || component_id || '-DOCS',
  component_id,
  test_path,
  'architecture',
  'boundary',
  true,
  validation_command
from docs_planning_leaf_map
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-DOCS',
  component_id,
  'Planning documentation component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
from docs_planning_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.docs_planning_leaf_map;
