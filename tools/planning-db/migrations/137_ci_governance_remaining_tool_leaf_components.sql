-- Claim the remaining active CI governance tool files that were still falling
-- through to SYS-CI-GOVERNANCE-ROOT after the root split.

drop table if exists pg_temp.ci_governance_remaining_tool_leaf_map;

create temporary table ci_governance_remaining_tool_leaf_map (
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

insert into ci_governance_remaining_tool_leaf_map (
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
    'SYS-CI-GOVERNANCE-PLANNING-DB-KNOWLEDGE-TOOLS',
    'Planning DB knowledge document tools',
    'PlanningDbKnowledgeTooling',
    'BuildKnowledgeDocumentSnapshot;ExtractKnowledgeDocumentLinks',
    'Owns Planning DB knowledge document helper modules for frontmatter, snapshots, and link extraction.',
    'Map tools/planning-db/knowledge helpers to the Planning DB knowledge tooling boundary.',
    'Knowledge document snapshot, frontmatter parsing, link extraction, or Planning DB knowledge import helper changes.',
    'tools/planning-db/knowledge/documentSnapshot.cjs',
    'Planning DB knowledge document tooling boundary',
    'hidden_authority',
    array['tools/planning-db/knowledge/documentSnapshot.cjs', 'tools/planning-db/knowledge/documentLinks.cjs']::text[],
    array['tools/planning-db/knowledge/**']::text[],
    'TEST-SYS-CI-GOVERNANCE-PLANNING-DB-KNOWLEDGE-TOOLS',
    'tools/planning-db/knowledge/documentSnapshot.test.cjs',
    'unit',
    'behavior',
    'node --test tools/planning-db/knowledge/documentSnapshot.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-OPS-EVIDENCE-COLLECTOR',
    'AR-C2 operational evidence collector',
    'OperationalEvidenceCollector',
    'CollectArC2Evidence;ValidateOperationalEvidence',
    'Owns the AR-C2 evidence collector and its architecture validation test.',
    'Map operational evidence collection tooling to one CI governance component.',
    'AR-C2 evidence collection, dashboard snapshot, SLA evidence, or operational proof changes.',
    'tools/ops/ar-c2-evidence-collector.mjs',
    'Operational evidence collection tooling boundary',
    'published_language',
    array['tools/ops/ar-c2-evidence-collector.mjs']::text[],
    array['tools/ops/ar-c2-evidence-collector.mjs', 'tools/ops/ar-c2-evidence-collector.architecture.test.mjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-OPS-EVIDENCE-COLLECTOR',
    'tools/ops/ar-c2-evidence-collector.architecture.test.mjs',
    'architecture',
    'boundary',
    'node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs'
  );

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
  'ac3baad513e932da98d356e901fd73e11ac9399c90e3de1715f781e77db771c8',
  0,
  name,
  'component',
  'SYS-CI-GOVERNANCE-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from ci_governance_remaining_tool_leaf_map
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
from ci_governance_remaining_tool_leaf_map
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
  from ci_governance_remaining_tool_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from ci_governance_remaining_tool_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Tracked files claimed by this remaining CI tool component must not fall through to SYS-CI-GOVERNANCE-ROOT.',
    0
  from ci_governance_remaining_tool_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows no direct files owned by SYS-CI-GOVERNANCE-ROOT.',
    0
  from ci_governance_remaining_tool_leaf_map
  union all
  select
    component_id,
    'consumer',
    'CI governance validation, Planning DB imports, and operational evidence readers',
    0
  from ci_governance_remaining_tool_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  from ci_governance_remaining_tool_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from ci_governance_remaining_tool_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from ci_governance_remaining_tool_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  'PLANNING-DB-CI-GOVERNANCE-REMAINING-TOOL-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'CI governance remaining tool leaf mapping',
  'Architecture / Planning DB / CI',
  'review',
  'After splitting CI governance root, the remaining direct files are active Planning DB knowledge helpers and AR-C2 evidence tooling. This design maps those responsibilities explicitly instead of deprecating functional files.',
  'hidden_authority',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;ValidateComponentIntegrity',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
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
  'node',
  'medium',
  'review',
  'SYS-CI-GOVERNANCE-ROOT'
from ci_governance_remaining_tool_leaf_map
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
from ci_governance_remaining_tool_leaf_map
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
  'REL-CI-GOVERNANCE-ROOT-CONTAINS-' ||
    replace(component_id, 'SYS-CI-GOVERNANCE-', ''),
  'SYS-CI-GOVERNANCE-ROOT',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this CI tool component is remapped without a governed Planning DB component update.',
  'repo-local CI governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from ci_governance_remaining_tool_leaf_map
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
from ci_governance_remaining_tool_leaf_map
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.ci_governance_remaining_tool_leaf_map;
