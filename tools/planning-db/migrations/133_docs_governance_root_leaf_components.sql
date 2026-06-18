-- Split the oversized documentation governance root into queryable leaf
-- components. Historical, archived, or nonfunctional documentation is kept
-- visible through explicit archive/deprecation ownership rather than being
-- removed from the Planning DB map.

drop table if exists pg_temp.docs_governance_leaf_map;

create temporary table docs_governance_leaf_map (
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
  architecture_fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null
);

insert into docs_governance_leaf_map (
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
  architecture_fowler_signal,
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
    'SYS-DOCS-GOVERNANCE-ENTRYPOINTS',
    'Documentation governance entrypoints',
    'DocumentationGovernanceEntrypointReadModel',
    'ReadGovernanceDocumentInventory;ValidateDocumentationCanonicality',
    'Owns repository-level and docs-root entrypoints that govern how contributors and agents enter the documentation system.',
    'Map top-level contributor, agent, and docs-root navigation files to one explicit governance component.',
    'Repository startup, contributor workflow, changelog, or docs-root navigation rules change.',
    'AGENTS.md',
    'Repository and documentation entrypoint governance boundary',
    'hidden_authority',
    'hidden_authority',
    array['AGENTS.md', 'docs/DOCS_README.md', 'docs/.manifest.json']::text[],
    array[
      'AGENTS.md',
      'CHANGELOG.md',
      'CLAUDE.md',
      'CONTRIBUTING.md',
      'README.md',
      'docs/.manifest.json',
      'docs/CONTRIBUTING.md',
      'docs/DOCS_README.md',
      'docs/SPANISH_TEXTS.md'
    ]::text[],
    'TEST-SYS-DOCS-GOVERNANCE-ENTRYPOINTS',
    'scripts/docs-quality-check.cjs',
    'architecture',
    'boundary',
    'pnpm docs:quality:check && pnpm docs:canonical:check'
  ),
  (
    'SYS-DOCS-GOVERNANCE-ADR',
    'ADR governance catalog',
    'ArchitectureDecisionRecordCatalog',
    'ReadArchitectureDecisionCatalog;ValidateDocumentationCanonicality',
    'Owns accepted, draft, and archived ADR documents as the repository decision register.',
    'Keep ADR decisions, status indexes, draft posture, and archive references queryable as one decision-record component.',
    'ADR numbering, status, promotion, archive, or decision-traceability policy changes.',
    'docs/adr/index.md',
    'Architecture decision record catalog boundary',
    'published_language',
    'published_language',
    array['docs/adr/index.md', 'docs/adr/ADR-Index.md']::text[],
    array['docs/adr/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-ADR',
    'scripts/docs-doctor.cjs',
    'architecture',
    'boundary',
    'pnpm docs:doctor && pnpm docs:canonical:check'
  ),
  (
    'SYS-DOCS-GOVERNANCE-ARCHITECTURE',
    'Architecture documentation catalog',
    'ArchitectureDocumentationCatalog',
    'ReadArchitectureDocumentationCatalog;ValidateRailVocabulary',
    'Owns architecture reference material, component documentation, command/query governance, and Fowler/DDD architecture guidance.',
    'Map architecture docs and component design records to the documentation architecture boundary.',
    'Reference architecture, component architecture, command/query, or Fowler/DDD governance changes.',
    'docs/architecture/index.md',
    'Architecture documentation component boundary',
    'published_language',
    'published_language',
    array['docs/architecture/index.md', 'docs/architecture/command-query-rail-governance.md']::text[],
    array['docs/architecture/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-ARCHITECTURE',
    'scripts/docs-canonical-check.cjs',
    'architecture',
    'boundary',
    'pnpm docs:canonical:check && pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'
  ),
  (
    'SYS-DOCS-GOVERNANCE-PLANNING',
    'Planning documentation catalog',
    'PlanningDocumentationCatalog',
    'ReadPlanningControlTower;ValidateComponentIntegrity',
    'Owns planning control tower, proposals, reviews, roadmap, status, templates, and planning-state documentation.',
    'Keep planning posture and generated planning-navigation docs mapped to one planning documentation boundary.',
    'Planning control tower, proposal, review, roadmap, generated status, or planning-template changes.',
    'docs/planning/state/planning-control-tower.md',
    'Planning documentation and status boundary',
    'hidden_authority',
    'hidden_authority',
    array['docs/planning/state/planning-control-tower.md', 'docs/planning/status/governance-document-rule-inventory.md']::text[],
    array['docs/planning/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-PLANNING',
    'scripts/planning-db-query.test.cjs',
    'architecture',
    'boundary',
    'pnpm planning:db:query component-profile --component SYS-DOCS-GOVERNANCE-PLANNING --no-refresh --limit 80 && pnpm docs:workboard:check'
  ),
  (
    'SYS-DOCS-GOVERNANCE-ARCHIVE',
    'Documentation archive catalog',
    'DocumentationArchiveCatalog',
    'ReadDocumentationLifecycle;DetectGovernedSourceDrift',
    'Owns historical documentation that remains tracked for reference but is not active governance unless cited by an active source.',
    'Keep archived docs explicit so old or nonfunctional files can be deprecated instead of hidden or remapped to active components.',
    'Historical reference, archive migration, retirement, or documentation lifecycle policy changes.',
    'docs/archive/index.md',
    'Historical documentation archive boundary',
    'documentation_lifecycle_archive',
    'boundary_drift',
    array['docs/archive/index.md']::text[],
    array['docs/archive/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-ARCHIVE',
    'scripts/docs-doctor.cjs',
    'architecture',
    'boundary',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80'
  ),
  (
    'SYS-DOCS-GOVERNANCE-EVIDENCE',
    'Evidence documentation catalog',
    'EvidenceDocumentationCatalog',
    'ReadEvidenceCatalog;ValidateArcEvidence',
    'Owns evidence documents used to prove governed code, contract, adapter, and architecture changes.',
    'Map validation evidence files and their indexes to one evidence component.',
    'Evidence frontmatter, ARC proof, validation proof, or evidence index changes.',
    'docs/evidence/index.md',
    'Evidence documentation boundary',
    'published_language',
    'published_language',
    array['docs/evidence/index.md']::text[],
    array['docs/evidence/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-EVIDENCE',
    'scripts/validate-arc-evidence-frontmatter.cjs',
    'architecture',
    'boundary',
    'pnpm docs:sync:check && pnpm ci:docs'
  ),
  (
    'SYS-DOCS-GOVERNANCE-RISK-REGISTER',
    'Risk register documentation catalog',
    'RiskRegisterDocumentationCatalog',
    'ReadRiskRegister;ValidateArcEvidence',
    'Owns risk register entries and risk indexes used by governed delivery and ARC evidence.',
    'Map open and historical risk records to one risk-register documentation component.',
    'Risk entry, severity, ownership, mitigation, or risk index changes.',
    'docs/risk-register/index.md',
    'Risk register documentation boundary',
    'published_language',
    'published_language',
    array['docs/risk-register/index.md']::text[],
    array['docs/risk-register/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-RISK-REGISTER',
    'scripts/validate-arc-evidence-frontmatter.cjs',
    'architecture',
    'boundary',
    'pnpm docs:sync:check && pnpm ci:docs'
  ),
  (
    'SYS-DOCS-GOVERNANCE-GUIDES',
    'Contributor and AI guide documentation catalog',
    'ContributorGuideDocumentationCatalog',
    'ReadAiWorkProtocol;ValidateDocumentationCanonicality',
    'Owns contributor, AI work-protocol, testing, and repository guide documents.',
    'Keep procedural guides mapped separately from normative ADRs and architecture specs.',
    'AI work protocol, testing guide, contributor guide, or operational guide changes.',
    'docs/guides/ai-work-protocol.md',
    'Contributor and AI guide documentation boundary',
    'published_language',
    'published_language',
    array['docs/guides/ai-work-protocol.md']::text[],
    array['docs/guides/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-GUIDES',
    'scripts/docs-quality-check.cjs',
    'architecture',
    'boundary',
    'pnpm docs:quality:check && pnpm docs:canonical:check'
  ),
  (
    'SYS-DOCS-GOVERNANCE-CONTRACTS',
    'Contract documentation catalog',
    'ContractDocumentationCatalog',
    'ReadContractDocumentationCatalog;ValidateContracts',
    'Owns cross-cutting contract documentation outside package-local contract implementations.',
    'Map contract docs and indexes to one contract documentation boundary.',
    'Contract documentation, version policy, RFC2119, or contract index changes.',
    'docs/contracts/index.md',
    'Contract documentation boundary',
    'published_language',
    'published_language',
    array['docs/contracts/index.md']::text[],
    array['docs/contracts/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-CONTRACTS',
    'scripts/validate-rfc2119.cjs',
    'architecture',
    'boundary',
    'pnpm validate:contracts && pnpm docs:canonical:check'
  ),
  (
    'SYS-DOCS-GOVERNANCE-CONCEPTS',
    'Concept and language documentation catalog',
    'DomainLanguageDocumentationCatalog',
    'ReadDomainLanguage;ValidateRailVocabulary',
    'Owns shared terminology, glossary, and repository conceptual maps.',
    'Keep canonical language and concept docs mapped separately from implementation architecture docs.',
    'Domain language, glossary, repository map, or shared vocabulary changes.',
    'docs/concepts/domain-language.md',
    'Domain language and concept documentation boundary',
    'published_language',
    'published_language',
    array['docs/concepts/domain-language.md', 'docs/concepts/glossary.md']::text[],
    array['docs/concepts/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-CONCEPTS',
    'scripts/validate-glossary-usage.cjs',
    'architecture',
    'boundary',
    'pnpm docs:quality:check && pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'
  ),
  (
    'SYS-DOCS-GOVERNANCE-RUNBOOKS',
    'Runbook documentation catalog',
    'RunbookDocumentationCatalog',
    'ReadRunbookCatalog;ValidateDocumentationCanonicality',
    'Owns operational runbooks under docs/runbooks and the remaining root runbook compatibility path.',
    'Map operational procedures and legacy root runbook compatibility into one runbook component.',
    'Runbook operation, incident procedure, compatibility runbook, or operational evidence changes.',
    'docs/runbooks/index.md',
    'Operational runbook documentation boundary',
    'boundary_drift',
    'boundary_drift',
    array['docs/runbooks/index.md', 'runbooks/WORKFLOW_ISOLATION_TESTING.md']::text[],
    array['docs/runbooks/**', 'runbooks/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-RUNBOOKS',
    'scripts/docs-canonical-check.cjs',
    'architecture',
    'boundary',
    'pnpm docs:canonical:check && pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80'
  ),
  (
    'SYS-DOCS-GOVERNANCE-JAVASCRIPTS',
    'Documentation rendering support assets',
    'DocumentationRenderingAssetCatalog',
    'ReadDocumentationAssets;ValidateDocumentationCanonicality',
    'Owns documentation-local rendering assets that support generated or rendered documentation pages.',
    'Keep documentation scripts/assets visible as docs infrastructure instead of folding them into active product components.',
    'Documentation rendering asset, Mermaid bootstrap, or docs asset placement changes.',
    'docs/javascripts/mermaid-init.js',
    'Documentation rendering support asset boundary',
    'hidden_authority',
    'hidden_authority',
    array['docs/javascripts/mermaid-init.js']::text[],
    array['docs/javascripts/**']::text[],
    'TEST-SYS-DOCS-GOVERNANCE-JAVASCRIPTS',
    'scripts/docs-canonical-check.cjs',
    'architecture',
    'smoke',
    'pnpm docs:canonical:check'
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
  'PLANNING-DB-DOCS-GOVERNANCE-ROOT-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Documentation governance root leaf component mapping',
  'Architecture / Planning DB / Docs',
  'review',
  'SYS-DOCS-GOVERNANCE-ROOT is a composite component that directly owns thousands of tracked files. This design creates responsibility-owned documentation children so component-profile can answer files, docs, tests, Fowler/DDD ownership, and lifecycle posture without introducing a parallel inventory.',
  'responsibility_overload',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;ValidateComponentIntegrity',
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
  'PLANNING-DB-DOCS-GOVERNANCE-ROOT-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component' as subject_kind, 'SYS-DOCS-GOVERNANCE-ROOT' as subject_id, 'may_update' as scope_kind
  union all
  select 'path', 'docs/**', 'may_update'
  union all
  select 'path', 'runbooks/**', 'may_update'
  union all
  select 'path', 'AGENTS.md', 'may_reference'
  union all
  select 'component', component_id, 'may_create' from docs_governance_leaf_map
  union all
  select
    'relation',
    'REL-DOCS-GOVERNANCE-ROOT-CONTAINS-' ||
      replace(component_id, 'SYS-DOCS-GOVERNANCE-', ''),
    'may_create'
  from docs_governance_leaf_map
  union all
  select 'test', test_id, 'may_create' from docs_governance_leaf_map
) scope
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
  'b6aebf6ce58f0a6ab081eec8d840a70ac7c65b10e0fbe8548d7475de6fa49b3d',
  0,
  name,
  'component',
  'SYS-DOCS-GOVERNANCE-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from docs_governance_leaf_map
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
from docs_governance_leaf_map
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
  from docs_governance_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_governance_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Tracked files claimed by this documentation component must resolve to the leaf in component_engineering_file_ownership_query; old or nonfunctional files are deprecated or retired explicitly, not silently removed.',
    0
  from docs_governance_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows no direct docs files owned by SYS-DOCS-GOVERNANCE-ROOT and docs validation passes.',
    0
  from docs_governance_leaf_map
  union all
  select
    component_id,
    'consumer',
    'planning_query_store.component_profile, component-integrity, documentation-lifecycle, and filesystem-coverage readers',
    0
  from docs_governance_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  from docs_governance_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_governance_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from docs_governance_leaf_map
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
values (
  'SYS-DOCS-GOVERNANCE-ROOT',
  'Documentation governance root component',
  'module',
  'infra',
  'Architecture / Docs',
  'docs',
  'Composite documentation governance boundary for repository entrypoints, docs, runbooks, evidence, risk, ADRs, and architecture records.',
  'none',
  'medium',
  'review',
  null
)
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
  'none',
  'medium',
  'review',
  'SYS-DOCS-GOVERNANCE-ROOT'
from docs_governance_leaf_map
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
  'implemented'
from docs_governance_leaf_map
union all
select
  'RESP-SYS-DOCS-GOVERNANCE-ROOT',
  'SYS-DOCS-GOVERNANCE-ROOT',
  'Own the composite documentation governance boundary and delegate concrete file ownership to documentation child components.',
  'Documentation governance topology, root ownership, or Planning DB component-map changes.',
  'DocumentationGovernanceRoot',
  'implemented'
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
  'REL-DOCS-GOVERNANCE-ROOT-CONTAINS-' ||
    replace(component_id, 'SYS-DOCS-GOVERNANCE-', ''),
  'SYS-DOCS-GOVERNANCE-ROOT',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this documentation child is removed or remapped without a governed Planning DB component update.',
  'repo-local documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_governance_leaf_map
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
from docs_governance_leaf_map
union all
select
  'TEST-SYS-DOCS-GOVERNANCE-ROOT-COMPONENT-PROFILE',
  'SYS-DOCS-GOVERNANCE-ROOT',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-DOCS-GOVERNANCE-ROOT --no-refresh --limit 80 && pnpm planning:db:query component-integrity --component SYS-DOCS-GOVERNANCE-ROOT --no-refresh --limit 80'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.docs_governance_leaf_map;
